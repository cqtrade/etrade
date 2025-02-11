const {
	sleep,
	calculatePnlPercentage,
	findLatestOrderByKey,
} = require('../utils.js');
const logger = require('../logger.js');
const { client } = require('./client.js');

const getSymbolTicker = async (symbol) => {
	try {
		const result = await client.getTickerBySymbol(symbol);

		if (!result) {
			throw new Error(`Ticker for symbol ${symbol} not found.`);
		}

		return result?.ticker;
	} catch (error) {
		console.error(
			`Failed to retrieve ticker for symbol '${symbol}': ${error.message}`,
		);
		throw new Error(`Failed to retrieve ticker for symbol '${symbol}'`, {
			cause: error,
		});
	}
};

module.exports.getSymbolTicker = getSymbolTicker;

const getInstrumentBySymbol = async (symbol) => {
	try {
		const result = await client.getInstruments();
		const symbolInfo = result?.instruments?.find(
			(instrument) => instrument.symbol === symbol,
		);

		if (!result || !result.instruments) {
			throw new Error(`Instrument info for symbol ${symbol} not found.`);
		}

		return symbolInfo;
	} catch (error) {
		console.error(
			`Failed to retrieve instrument info for symbol '${symbol}': ${error.message}`,
		);
		throw new Error(
			`Failed to retrieve instrument info for symbol '${symbol}'`,
			{ cause: error },
		);
	}
};

module.exports.getInstrumentBySymbol = getInstrumentBySymbol;

const getOpenOrdersByType = async ({ symbol, side, orderType }) => {
	try {
		const result = await client.getOpenOrders();

		return result?.openOrders?.filter(
			(order) =>
				order.symbol === symbol &&
				order.orderType === orderType &&
				order.side !== side,
		);
	} catch (error) {
		console.error(
			`Failed to retrieve open orders for symbol ${symbol}:`,
			error,
		);
		throw new Error(`Failed to retrieve open orders for symbol ${symbol}`, {
			cause: error,
		});
	}
};

const getOpenTpOrders = async ({ symbol, side }) =>
	getOpenOrdersByType({ symbol, side, orderType: 'take_profit' });

const getOpenSlOrders = async ({ symbol, side }) =>
	getOpenOrdersByType({ symbol, side, orderType: 'stop' });

const closePosition = async ({ symbol, side, size }) => {
	try {
		await client.sendOrder({
			symbol,
			side: side === 'buy' ? 'sell' : 'buy',
			size,
			orderType: 'mkt',
			reduceOnly: true,
		});
	} catch (error) {
		console.error(`Failed to close position for symbol ${symbol}:`, error);
		throw new Error(`Failed to close position for symbol ${symbol}`, {
			cause: error,
		});
	}
};

const adjustPriceToTickSize = (price, tickSize) => {
	const precision = -Math.floor(Math.log10(tickSize));
	const roundedPrice = Math.round(price / tickSize) * tickSize;

	return precision > 0
		? parseFloat(roundedPrice.toFixed(precision))
		: Math.round(roundedPrice);
};

const cancelStopLossOrders = async (orderIdList) => {
	try {
		const orders = orderIdList.map((orderId) => ({
			order: 'cancel',
			order_id: orderId,
		}));

		await client.batchOrder(orders);
	} catch (error) {
		console.error(
			`Failed to cancel stop loss orders for order IDs [${orderIdList.join(
				', ',
			)}]:`,
			error,
		);
		throw new Error(
			`Failed to cancel stop loss orders for order IDs [${orderIdList.join(
				', ',
			)}]`,
			{ cause: error },
		);
	}
};

const placeStopLossOrder = async ({ symbol, side, stopPrice, size }) => {
	try {
		await client.sendOrder({
			side: side === 'buy' ? 'sell' : 'buy',
			symbol,
			orderType: 'stp',
			size,
			stopPrice,
			reduceOnly: true,
			triggerSignal: 'mark',
		});
	} catch (error) {
		console.error(
			`Failed to place stop loss order for symbol ${symbol}:`,
			error,
		);
		throw new Error(
			`Failed to place stop loss order for symbol ${symbol}`,
			{ cause: error },
		);
	}
};

const handleOpenPosition = async (position) => {
	const { positionSide, symbol, price: entryPrice, size } = position;

	try {
		if (size > 0) {
			const [ticker, instrument] = await Promise.allSettled([
				getSymbolTicker(symbol),
				getInstrumentBySymbol(symbol),
			]);

			const lastPrice = ticker.value.last;
			const tickSize = instrument.value.tickSize;

			const currentPNL = calculatePnlPercentage(
				positionSide,
				entryPrice,
				lastPrice,
			);

			const openTpOrders = await getOpenTpOrders({
				symbol,
				side: positionSide,
			});

			let openSlOrders = await getOpenSlOrders({
				symbol,
				side: positionSide,
			});

			if (!openSlOrders.length) {
				const time = new Date().toLocaleString('et-ee', {
					timeZone: 'UTC',
				});

				logger.info(
					`No stop-loss order found for symbol ${symbol} at ${time}. Retrying in 10 seconds...`,
				);
				await sleep(10000);
				openSlOrders = await getOpenSlOrders({
					symbol,
					side: positionSide,
				});

				if (!openSlOrders.length) {
					const time2 = new Date().toLocaleString('et-ee', {
						timeZone: 'UTC',
					});

					logger.info(
						`Still no stop-loss order for symbol ${symbol} at ${time2}. Closing position.`,
					);

					await closePosition({ symbol, side: positionSide, size });
				}
			}

			const priceAdjustment = entryPrice * 0.002;
			const newStopLoss =
				positionSide === 'buy'
					? adjustPriceToTickSize(
							entryPrice + priceAdjustment,
							tickSize,
						)
					: adjustPriceToTickSize(
							entryPrice - priceAdjustment,
							tickSize,
						);

			const latestSlOrder = findLatestOrderByKey(
				'receivedTime', // or lastUpdateTime
				openSlOrders,
			);

			if (!openTpOrders.length && currentPNL > 0.25) {
				const shouldUpdateStopLoss =
					(positionSide === 'buy' &&
						Number(latestSlOrder.stopPrice) < newStopLoss) ||
					(positionSide === 'sell' &&
						Number(latestSlOrder.stopPrice) > newStopLoss);

				if (shouldUpdateStopLoss) {
					const orderIdList = openSlOrders.map(
						(order) => order.order_id,
					);

					await cancelStopLossOrders(orderIdList);
					await placeStopLossOrder({
						symbol,
						side: positionSide,
						stopPrice: newStopLoss,
						size,
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
		throw new Error(
			`Failed to handle active position for symbol ${symbol}`,
			{ cause: error },
		);
	}
};

const processOpenPositions = async (openPositions) => {
	for (const position of openPositions) {
		await handleOpenPosition(position);
		await sleep(500);
	}
};

const getAndProcessActivePositions = async () => {
	try {
		const { openPositions } = await client.getOpenPositions();
		const enrichedOpenPositions = openPositions?.map((position) => {
			const positionSide = position.side === 'long' ? 'buy' : 'sell';

			return {
				...position,
				positionSide,
			};
		});

		await processOpenPositions(enrichedOpenPositions);
	} catch (error) {
		logger.error(
			`Failed to retrieve and process active positions: ${error.message}`,
		);
		throw new Error('Failed to retrieve and process active positions', {
			cause: error,
		});
	}
};

const flow = async () => {
	try {
		await getAndProcessActivePositions();
	} catch (error) {
		logger.error(`Flow execution failed: ${error.message}`);
		throw new Error('Flow execution failed', { cause: error });
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
