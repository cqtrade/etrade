const {
	// ContractClient,
	RestClientV5 } = require('bybit-api');
const logger = require('../logger.js');

const key = process.env.API_KEY;
const secret = process.env.API_SECRET;

// const client = new ContractClient({
// 	key,
// 	secret,
// 	strict_param_validation: true,
// });

const clientV5 = new RestClientV5({
	key,
	secret,
	strict_param_validation: true,
});

const getSymbolTickerV5 = async (symbol) => {
	try {
		const { retMsg, result } = await clientV5.getTickers({
			category: 'linear',
			symbol
		});
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
module.exports.getSymbolTickerV5 = getSymbolTickerV5;

const getSymbolTicker = async (symbol) => {
	try {
		const { retMsg, result } = await clientV5.getTickers({
			category: 'linear',
			symbol
		});
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
		const { retMsg, result } = await clientV5.getInstrumentsInfo({
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

const setPricePrecisionByTickSize = (price, tickSize) => {
	const precision = tickSize.toString().split('.')[1].length - 1;
	return Number(price).toFixed(precision);
};

module.exports.setPricePrecisionByTickSize = setPricePrecisionByTickSize;

const submitOrder = async ({
	side,
	symbol,
	qty,
	orderType,
	timeInForce,
	stopLoss,
	slTriggerBy,
	price,
	reduceOnly,
}) => {
	try {
		const { retMsg, result } = await clientV5.submitOrder({
			category: 'linear',
			side,
			symbol,
			qty,
			orderType,
			timeInForce,
			stopLoss,
			slTriggerBy,
			price,
			reduceOnly,
		});
		if (retMsg !== 'OK') {
			const msg = `ERROR submitOrder ${side} ${symbol} qty ${qty} : ${retMsg}`;
			logger.info(msg);
			throw new Error(msg);
		}
		return result;
	} catch (error) {
		console.error('submitOrder failed: ', error);
		throw error;
	}
};

module.exports.submitOrder = submitOrder;

const setLeverage = async ({ symbol, buyLeverage, sellLeverage }) => {
	try {
		const { retMsg, result } = await clientV5.setLeverage({
			category: 'linear',
			symbol,
			buyLeverage,
			sellLeverage,
		});
		if (retMsg !== 'OK') {
			// TODO it shouldn't matter at this point if fails
			// throw new Error('setLeverage failed ' + retMsg);
			console.log('setLeverage failed: ', retMsg);
		}

		return result;
	} catch (error) {
		// TODO should be logged
		console.log('setLeverage failed: ', error);
	}
};

module.exports.setLeverage = setLeverage;
