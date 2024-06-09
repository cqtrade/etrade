const { USDMClient } = require('binance');
const positionCheck = require('./position-check.js');

const errorFilter = (error) => {
	return error.message || error.body.msg
		? error.message ?? error.body.msg
		: error;
};

const client = new USDMClient({
	api_key: process.env.BN_API_KEY,
	api_secret: process.env.BN_API_SECRET,
	strict_param_validation: true,
});

const getSymbolTicker = async (symbol) => {
	try {
		const result = await client.get24hrChangeStatistics({ symbol });

		return result;
	} catch (error) {
		console.error('getSymbolTicker failed: ', errorFilter(error));
		throw error;
	}
};

module.exports.getSymbolTicker = getSymbolTicker;

const getInstrumentInfo = async (symbol) => {
	try {
		const result = await positionCheck.getExchangeInfoForSymbol(symbol);

		return result;
	} catch (error) {
		console.error(
			'getApiQuantitativeRulesIndicators failed: ',
			errorFilter(error),
		);
		throw error;
	}
};

module.exports.getInstrumentInfo = getInstrumentInfo;

const getLeverageInfo = async (symbol) => {
	try {
		const result = await client.getNotionalAndLeverageBrackets({ symbol });

		return result;
	} catch (error) {
		console.error(
			'getNotionalAndLeverageBrackets failed: ',
			errorFilter(error),
		);
		throw error;
	}
};

module.exports.getLeverageInfo = getLeverageInfo;

const setPricePrecisionByTickSize = (price, tickSize) => {
	const precision = tickSize.toString().split('.')[1].length - 1;
	return Number(price).toFixed(precision);
};

module.exports.setPricePrecisionByTickSize = setPricePrecisionByTickSize;

const submitOrder = async ({
	side,
	symbol,
	quantity,
	type,
	timeInForce,
	stopPrice,
	workingType = 'MARK_PRICE',
	price,
	reduceOnly,
	positionSide,
	closePosition,
	cancelOrders,
}) => {
	if (cancelOrders) {
		try {
			const result = await client.cancelAllOpenOrders({ symbol });
			console.debug(result.msg);
		} catch (error) {
			console.error('cancelOpenOrders failed: ', errorFilter(error));
			throw error;
		}
	}

	try {
		let orderParams = { symbol, side, type };

		if (quantity) {
			orderParams = { ...orderParams, quantity };
		}
		if (timeInForce) {
			orderParams = { ...orderParams, timeInForce };
		}
		if (stopPrice) {
			orderParams = { ...orderParams, stopPrice };
		}
		if (workingType) {
			orderParams = { ...orderParams, workingType };
		}
		if (price) {
			orderParams = { ...orderParams, price };
		}
		if (reduceOnly) {
			orderParams = { ...orderParams, reduceOnly };
		}
		if (positionSide) {
			orderParams = { ...orderParams, positionSide };
		}
		if (closePosition) {
			orderParams = { ...orderParams, closePosition };
		}

		const result = await client.submitNewOrder(orderParams);

		return result;
	} catch (error) {
		console.error('submitOrder failed: ', errorFilter(error));
		throw error;
	}
};

module.exports.submitOrder = submitOrder;

// TODO implement this to tradeBN
const setLeverage = async ({ symbol, leverage }) => {
	try {
		const result = await client.setLeverage({
			symbol,
			leverage,
		});

		return result;
	} catch (error) {
		// TODO should be logged
		console.log('setLeverage failed: ', errorFilter(error));
	}
};

module.exports.setLeverage = setLeverage;
