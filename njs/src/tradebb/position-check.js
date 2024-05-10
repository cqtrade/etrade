const { ContractClient, RestClientV5 } = require('bybit-api');
const { sleep } = require('../utils.js');
const logger = require('../logger.js');

const key = process.env.API_KEY;
const secret = process.env.API_SECRET;

const client = new ContractClient({
	key,
	secret,
	strict_param_validation: true,
});

const clientV5 = new RestClientV5({
	key,
	secret,
	strict_param_validation: true,
});

const pnl = (side, avgEntry, lastPrice) => {
	if (side === 'Buy') {
		return (
			Math.floor(100 * ((100 * (lastPrice - avgEntry)) / avgEntry)) / 100
		);
	} else {
		return (
			Math.floor(100 * ((100 * (avgEntry - lastPrice)) / avgEntry)) / 100
		);
	}
};

const getActiveOrders = async (symbol) => {
	try {
		const { retMsg, result } = await clientV5.getActiveOrders({
			symbol,
			category: 'linear',
		});
		if (retMsg !== 'OK') {
			throw new Error('getActiveOrders failed ' + retMsg);
		}

		return result.list;
	} catch (error) {
		console.error('getActiveOrders failed: ', error);
		throw error;
	}
};

const hasActiveLimitTpOrders = async (position) => {
	const activeOrders = await getActiveOrders(position.symbol);

	const activeLimitTPOrders = activeOrders.filter((order) => {
		return order.orderType === 'Limit' && order.side !== position.side;
	});
	return activeLimitTPOrders;
};

const getSymbolTicker = async (symbol) => {
	try {
		const { retMsg, result } = await client.getSymbolTicker('', symbol);
		if (retMsg !== 'OK') {
			throw new Error('getKline failed ' + retMsg);
		}

		const [tickerInfo] = result.list;
		return tickerInfo;
	} catch (error) {
		console.error('getSymbolTicker failed: ', error);
		throw error;
	}
};

module.exports.getSymbolTicker = getSymbolTicker;

const getInstrumentInfo = async ({ category, symbol }) => {
	try {
		const { retMsg, result } = await client.getInstrumentInfo({
			category,
			symbol,
		});
		if (retMsg !== 'OK') {
			throw new Error('getInstrumentInfo failed ' + retMsg);
		}
		const [instrumentInfo] = result.list;
		return instrumentInfo;
	} catch (error) {
		console.error('getInstrumentInfo failed: ', error);
		throw error;
	}
};

module.exports.getInstrumentInfo = getInstrumentInfo;

const setTPSL = async ({ positionIdx, stopLoss, symbol, takeProfit }) => {
	// positionIdx: "0",
	// symbol: "SOLUSDT",
	// slTriggerBy: "LastPrice",
	// stopLoss: "21.97",
	// takeProfit: "22.56",
	// tpTriggerBy: "LastPrice",

	/** 0-one-way, 1-buy side, 2-sell side */
	try {
		const slTriggerBy = 'LastPrice';
		const tpTriggerBy = 'LastPrice';

		const r = await clientV5.setTradingStop(
			takeProfit
				? {
						category: 'linear',
						positionIdx,
						slTriggerBy,
						stopLoss,
						symbol,
						takeProfit,
						tpTriggerBy,
				  }
				: {
						category: 'linear',
						positionIdx,
						slTriggerBy,
						stopLoss,
						symbol,
				  },
		);

		if (r.retCode !== 0) {
			throw new Error(JSON.stringify(r));
		}
		return r;
	} catch (error) {
		console.error('trading setTPSL failed: ', error);
		throw error;
	}
};

const setPricePrecisionByTickSize = (price, tickSize) => {
	const precision = tickSize.toString().split('.')[1].length - 1;
	return Number(price).toFixed(precision);
};

const handlePosition = async (pos) => {
	try {
		if (pos.size > 0) {
			const [ticker, instrument] = await Promise.allSettled([
				getSymbolTicker(pos.symbol),
				getInstrumentInfo({ category: 'linear', symbol: pos.symbol }),
			]);
			const tickerInfo = ticker.value;
			const instrumentInfo = instrument.value;
			// console.log(tickerInfo)
			// console.log(instrumentInfo)
			// console.log(pos)

			const entryPrice = Number(pos.avgPrice) || Number(pos.entryPrice);
			const currPNL = pnl(pos.side, entryPrice, tickerInfo.lastPrice);

			const activeTpOrders = await hasActiveLimitTpOrders(pos);
			// console.log('activeTpOrders', activeTpOrders)
			let newSl;

			if (pos.side === 'Buy') {
				newSl = setPricePrecisionByTickSize(
					entryPrice + entryPrice * 0.002,
					instrumentInfo.priceFilter.tickSize,
				);
			} else if (pos.side === 'Sell') {
				newSl = setPricePrecisionByTickSize(
					entryPrice - entryPrice * 0.002,
					instrumentInfo.priceFilter.tickSize,
				);
			}

			if (
				!activeTpOrders.length &&
				currPNL > 0.25 &&
				pos.side === 'Buy' &&
				Number(pos.stopLoss) < Number(newSl)
			) {
				await setTPSL({
					positionIdx: pos.positionIdx,
					symbol: pos.symbol,
					stopLoss: newSl,
				});

				logger.info('Strategy sl changed ' + pos.symbol + ' ' + newSl);
			}

			if (
				!activeTpOrders.length &&
				currPNL > 0.25 &&
				pos.side === 'Sell' &&
				Number(pos.stopLoss) > Number(newSl)
			) {
				await setTPSL({
					positionIdx: pos.positionIdx,
					symbol: pos.symbol,
					stopLoss: newSl,
				});

				logger.info('Strategy sl changed ' + pos.symbol + ' ' + newSl);
			}
		}
	} catch (error) {
		logger.error(
			'trading handlePosition failed: ' + pos.symbol + error.message,
		);
	}
};

const flow = async () => {
	try {
		const settleCoin = 'USDT';
		const { retMsg, result } = await clientV5.getPositionInfo({
			category: 'linear',
			settleCoin,
		});

		if (retMsg !== 'OK') {
			throw new Error('getPositions failed ' + retMsg);
		}

		const res = result.list;
		for (const pos of res) {
			await handlePosition(pos);
			await sleep(333);
		}
	} catch (e) {
		console.log('ERROR trading flow request failed: ' + e.message);
		logger.error('trading getPositions request failed: ' + e.message);
	}
};

function engine() {
	const interval = 2000;
	setTimeout(() => {
		flow()
			.then(() => {
				engine();
			})
			.catch((e) => {
				console.log('positions engine flow failed: ' + e.message);
				logger.error('positions engine flow failed: ' + e.message);
				engine();
			});
	}, interval);
}

module.exports.engine = engine;

// flow().catch(e => {
//   console.log('positions flow failed: ' + e.message);
// });
