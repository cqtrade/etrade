const { USDMClient } = require('binance');
const { sleep } = require('../utils.js');
const logger = require('../logger.js');

const client = new USDMClient(
	{
		api_key: '',
		api_secret: '',
	},
	{},
	true,
);

const calculatePnlPercentage = (side, entryPrice, lastPrice) => {
	const priceDifference =
		side === 'BUY' ? lastPrice - entryPrice : entryPrice - lastPrice;
	const percentageChange = (priceDifference / entryPrice) * 100;

	return Math.floor(percentageChange * 100) / 100;
};

const getSymbolTicker = async (symbol) => {
	try {
		return await client.getSymbolPriceTicker({ symbol });
	} catch (error) {
		console.error(
			`Failed to retrieve price ticker for symbol ${symbol}:`,
			error,
		);
		throw error;
	}
};

const getExchangeInfoForSymbol = async (symbol) => {
	try {
		const exchangeInfo = await client.getExchangeInfo();
		const symbolInfo = exchangeInfo.symbols.find(
			(info) => info.symbol === symbol,
		);

		if (!symbolInfo) {
			throw new Error(`Symbol ${symbol} not found in exchange info`);
		}

		return symbolInfo;
	} catch (error) {
		console.error(
			`Failed to get exchange info for symbol ${symbol}:`,
			error,
		);
		throw error;
	}
};

const getOpenOrders = async (symbol) => {
	try {
		return await client.getAllOpenOrders({ symbol });
	} catch (error) {
		console.error(
			`Failed to retrieve open orders for symbol ${symbol}:`,
			error,
		);
	}
};

const getOpenOrdersByType = async ({ symbol, side, orderType }) => {
	const openOrders = await getOpenOrders(symbol);

	return openOrders.filter(
		(order) => order.type === orderType && order.side !== side,
	);
};

const getOpenTpOrders = async ({ symbol, side }) =>
	getOpenOrdersByType({ symbol, side, orderType: 'TAKE_PROFIT_MARKET' });

const getOpenSlOrders = async ({ symbol, side }) =>
	getOpenOrdersByType({ symbol, side, orderType: 'STOP_MARKET' });

const findLatestOrderByKey = (key, data) =>
	data.reduce(
		(currentLatestOrder, currentOrder) =>
			currentOrder[key] > currentLatestOrder[key]
				? currentOrder
				: currentLatestOrder,
		data[0],
	);

const setPricePrecisionByTickSize = (price, tickSize) => {
	const precision = tickSize.toString().split('.')[1].length - 1;

	return Number(price).toFixed(precision);
};

const placeStopLossOrder = async ({ symbol, side, stopPrice, quantity }) => {
	try {
		await client.submitNewOrder({
			symbol,
			side: side === 'BUY' ? 'SELL' : 'BUY',
			positionSide: 'BOTH',
			type: 'STOP_MARKET',
			workingType: 'MARK_PRICE',
			stopPrice,
			quantity,
			timeInForce: 'GTE_GTC',
			priceProtect: true,
			reduceOnly: true,
		});
	} catch (error) {
		console.error(
			`Failed to place stop loss order for symbol ${symbol}:`,
			error,
		);
	}
};

// const placeTakeProfitOrder = async ({ symbol, side, stopPrice, quantity }) => {
//   try {
//     await client.submitNewOrder({
//       symbol,
//       side: side === "BUY" ? "SELL" : "BUY",
//       positionSide: "BOTH",
//       type: "TAKE_PROFIT_MARKET",
//       workingType: "MARK_PRICE",
//       stopPrice,
//       quantity,
//       timeInForce: "GTE_GTC",
//       priceProtect: true,
//       reduceOnly: true,
//     });
//   } catch (error) {
//     console.error("Failed to place take profit order:", error);
//   }
// };

const cancelOrders = async ({ symbol, orderIdList }) => {
	try {
		await client.cancelMultipleOrders({ symbol, orderIdList });
	} catch (error) {
		console.error(`Failed to cancel orders for symbol ${symbol}:`, error);
	}
};

const closePosition = async ({ symbol, side, positionAmt }) => {
	try {
		await client.submitNewOrder({
			symbol,
			side: side === 'BUY' ? 'SELL' : 'BUY',
			quantity: positionAmt,
			type: 'MARKET',
			reduceOnly: true,
		});
	} catch (error) {
		console.error(`Failed to close position for symbol ${symbol}:`, error);
	}
};

const handleActivePosition = async (position) => {
	const { positionAmt, symbol, side, entryPrice } = position;
	try {
		if (positionAmt > 0) {
			const [ticker, exchangeInfo] = await Promise.allSettled([
				getSymbolTicker(symbol),
				getExchangeInfoForSymbol(symbol),
			]);

			const lastPrice = ticker.value.price;
			const tickSize = exchangeInfo.value.filters.find(
				(filter) => filter.filterType === 'PRICE_FILTER',
			).tickSize;

			const currentPNL = calculatePnlPercentage(
				side,
				entryPrice,
				lastPrice,
			);

			const openTpOrders = await getOpenTpOrders({ symbol, side });
			let openSlOrders = await getOpenSlOrders({ symbol, side });

			if (!openSlOrders.length) {
				await sleep(5000);
				openSlOrders = await getOpenSlOrders({ symbol, side });

				if (!openSlOrders.length) {
					logger.info(`No stop loss found, closing position`);
					await closePosition({ symbol, side, positionAmt });
				}
			}

			let newStopLoss;

			if (side === 'BUY') {
				newStopLoss = setPricePrecisionByTickSize(
					entryPrice + entryPrice * 0.002,
					tickSize,
				);
			} else if (side === 'SELL') {
				newStopLoss = setPricePrecisionByTickSize(
					entryPrice - entryPrice * 0.002,
					tickSize,
				);
			}

			const latestSlOrder = findLatestOrderByKey('time', openSlOrders);

			if (!openTpOrders.length && currentPNL > 0.25) {
				if (
					side === 'BUY' &&
					Number(latestSlOrder.stopPrice) < newStopLoss
				) {
					const orderIdList = openSlOrders.map(
						(openSlOrder) => openSlOrder.orderId,
					);

					await cancelOrders({
						symbol,
						orderIdList,
					});

					await placeStopLossOrder({
						symbol,
						side,
						stopPrice: newStopLoss,
						quantity: positionAmt,
					});

					logger.info(
						`Stop loss updated for symbol ${symbol} to ${newStopLoss}`,
					);
				}

				if (
					side === 'SELL' &&
					Number(latestSlOrder.stopPrice) > newStopLoss
				) {
					const orderIdList = openSlOrders.map(
						(openSlOrder) => openSlOrder.orderId,
					);

					await cancelOrders({
						symbol,
						orderIdList,
					});

					await placeStopLossOrder({
						symbol,
						side,
						stopPrice: newStopLoss,
						quantity: positionAmt,
					});

					logger.info(
						`Stop loss updated for symbol ${symbol} to ${newStopLoss}`,
					);
				}
			}
		}
	} catch (error) {
		logger.error(
			`Failed to handle active position for symbol ${symbol}: ${error.message}`,
		);
	}
};

const processActivePositions = async (activePositions) => {
	for (const position of activePositions) {
		await handleActivePosition(position);
		await sleep(500);
	}
};

const getAndProcessActivePositions = async () => {
	try {
		const positions = await client.getPositions();
		const activePositions = positions
			.filter(({ positionAmt }) => Number(positionAmt) !== 0)
			.map((position) => ({
				...position,
				positionAmt: Math.abs(Number(position.positionAmt)),
				entryPrice: Number(position.entryPrice),
				breakEvenPrice: Number(position.breakEvenPrice),
				markPrice: Number(position.markPrice),
				unRealizedProfit: Number(position.unRealizedProfit),
				liquidationPrice: Number(position.liquidationPrice),
				leverage: Number(position.leverage),
				notional: Number(position.notional),
				side: Number(position.positionAmt) > 0 ? 'BUY' : 'SELL',
			}));

		await processActivePositions(activePositions);
	} catch (error) {
		logger.error(
			`Failed to retrieve and process active positions: ${error.message}`,
		);
		throw error;
	}
};

const flow = async () => {
	try {
		await getAndProcessActivePositions();
	} catch (error) {
		logger.error(`Flow execution failed: ${error.message}`);
		throw error;
	}
};

const engine = () => {
	const interval = 5000;

	flow()
		.then(() => {
			setTimeout(engine, interval);
		})
		.catch((error) => {
			logger.error(`Engine execution failed: ${error.message}`);
			setTimeout(engine, interval);
		});
};

module.exports.engine = engine;
