const { USDMClient } = require('binance');
const reqs = require('./reqs.js');
const logger = require('../logger.js');
const { countDecimals, fixedDecimals } = require('../utils.js');

const client = new USDMClient({
	api_key: process.env.BN_API_KEY,
	api_secret: process.env.BN_API_SECRET,
	strict_param_validation: true,
});

const calculatePositionSize = (risk, atrSl, lastPrice, equityUSD) => {
	const slRisk = (atrSl * 100) / lastPrice;
	const equityLeverage = risk / slRisk;
	const posSizeUSD = equityUSD * equityLeverage;
	const positionSize = posSizeUSD / lastPrice;

	return {
		positionSize,
		equityLeverage,
		posSizeUSD,
	};
};

const calculateQuantityPrecision = (qty, stepSize) => {
	const rawRes =
		Math.floor(Number(qty) / Number(stepSize)) * Number(stepSize);
	const decimals = countDecimals(stepSize);

	return fixedDecimals(rawRes, decimals);
};

const atrTp1Calc = (close, atrTp1) => {
	const diff = parseFloat(100 * (1 - (close - atrTp1) / close));
	const minDiffAllowedPerc = 0.3;

	if (diff < minDiffAllowedPerc) {
		return (close * minDiffAllowedPerc) / 100;
	}
	return atrTp1;
};

const exitPosition = async (sig, position) => {
	const openPositionSide = position
		? Number(position?.positionAmt) < 0
			? 'SHORT'
			: 'LONG'
		: undefined;

	if (openPositionSide === 'LONG') {
		const res = await reqs.submitOrder({
			side: 'SELL',
			symbol: sig.ticker,
			quantity: Number(position.positionAmt),
			type: 'MARKET',
			cancelOrders: true,
		});

		return res;
	}

	if (openPositionSide === 'SHORT') {
		const res = await reqs.submitOrder({
			side: 'BUY',
			symbol: sig.ticker,
			quantity: Math.abs(Number(position.positionAmt)),
			type: 'MARKET',
			cancelOrders: true,
		});

		return res;
	}
};

const buy = async (signal) => {
	const [ticker, instrument] = await Promise.allSettled([
		reqs.getSymbolTicker(signal.ticker),
		reqs.getInstrumentInfo(signal.ticker),
	]);

	const lastPrice = Number(ticker.value.lastPrice);
	const tickSize = instrument.value.filters.find(
		(filter) => filter.filterType === 'PRICE_FILTER',
	).tickSize;

	const tp = lastPrice + atrTp1Calc(lastPrice, signal.atrtp);
	const sl = lastPrice - signal.atrsl;

	const tpPrice = reqs.setPricePrecisionByTickSize(tp, tickSize);
	const slPrice = reqs.setPricePrecisionByTickSize(sl, tickSize);

	const equityUSD = Number(process.env.EQUITY);
	const risk = signal.risk;
	const atrSl = signal.atrsl;

	const { positionSize, equityLeverage, posSizeUSD } = calculatePositionSize(
		risk,
		atrSl,
		lastPrice,
		equityUSD,
	);

	let posSize = positionSize;

	const qtyStep = instrument.value.filters.find(
		(filter) => filter.filterType === 'MARKET_LOT_SIZE',
	).stepSize;
	const qtyMin = instrument.value.filters.find(
		(filter) => filter.filterType === 'MARKET_LOT_SIZE',
	).minQty;

	const posSizeB4Step = posSize;

	posSize = calculateQuantityPrecision(posSize, qtyStep);

	const posSizeB4MinCmp = posSize;
	if (posSize < 3 * qtyMin) {
		posSize = 3 * qtyMin;
		posSize = calculateQuantityPrecision(posSize, qtyStep);
	}

	let tpSize = calculateQuantityPrecision(posSize / 3, qtyStep);
	if (tpSize < qtyMin) {
		tpSize = qtyMin;
	}

	try {
		const marketOrderRes = await reqs.submitOrder({
			side: 'BUY',
			symbol: signal.ticker,
			quantity: posSize,
			type: 'MARKET',
			workingType: 'MARK_PRICE',
		});

		logger.debug(`Buy ${signal.ticker} market order res`, marketOrderRes);

		try {
			const tpOrderRes = await reqs.submitOrder({
				side: 'SELL',
				symbol: signal.ticker,
				quantity: tpSize,
				type: 'TAKE_PROFIT',
				timeInForce: 'GTC',
				workingType: 'MARK_PRICE',
				price: tpPrice,
				stopPrice: tpPrice,
				reduceOnly: true,
			});

			logger.debug(`Buy ${signal.ticker} tpOrderRes res`, tpOrderRes);

			const slOrderRes = await reqs.submitOrder({
				side: 'SELL',
				symbol: signal.ticker,
				type: 'STOP_MARKET',
				workingType: 'MARK_PRICE',
				stopPrice: slPrice,
				quantity: posSize,
				closePosition: true,
			});

			logger.debug(`Buy ${signal.ticker} slOrderRes res`, slOrderRes);

			const tpSizeUSD = tpSize * lastPrice;

			logger.info(`Buy ${signal.ticker}`, {
				side: 'Buy',
				symbol: signal.ticker,
				risk,
				atrSl,
				lastPrice,
				equityUSD,
				posSizeB4Step,
				posSizeB4MinCmp,
				posSize,
				tpSize,
				equityLeverage,
				posSizeUSD,
				tpSizeUSD,
				tp,
				sl,
			});
		} catch (error) {
			logger.error(`ERROR Buy tp ${signal.ticker}`, error);
		}
	} catch (error) {
		logger.error(`ERROR Buy market ${signal.ticker}`, error);
	}
};

// eslint-disable-next-line no-unused-vars
const sell = async (signal) => {
	const [ticker, instrument] = await Promise.allSettled([
		reqs.getSymbolTicker(signal.ticker),
		reqs.getInstrumentInfo(signal.ticker),
	]);

	const lastPrice = Number(ticker.value.lastPrice);
	const tickSize = instrument.value.filters.find(
		(filter) => filter.filterType === 'PRICE_FILTER',
	).tickSize;

	const tp = lastPrice - atrTp1Calc(lastPrice, signal.atrtp);
	const sl = lastPrice + signal.atrsl;

	const tpPrice = reqs.setPricePrecisionByTickSize(tp, tickSize);
	const slPrice = reqs.setPricePrecisionByTickSize(sl, tickSize);

	const equityUSD = Number(10); // Number(process.env.EQUITY);
	const risk = signal.risk;
	const atrSl = signal.atrsl;

	const { positionSize, equityLeverage, posSizeUSD } = calculatePositionSize(
		risk,
		atrSl,
		lastPrice,
		equityUSD,
	);

	let posSize = positionSize;

	const qtyStep = instrument.value.filters.find(
		(filter) => filter.filterType === 'MARKET_LOT_SIZE',
	).stepSize;
	const qtyMin = instrument.value.filters.find(
		(filter) => filter.filterType === 'MARKET_LOT_SIZE',
	).minQty;

	const posSizeB4Step = posSize;

	posSize = calculateQuantityPrecision(posSize, qtyStep);

	const posSizeB4MinCmp = posSize;
	if (posSize < 3 * qtyMin) {
		posSize = 3 * qtyMin;
		posSize = calculateQuantityPrecision(posSize, qtyStep);
	}

	let tpSize = calculateQuantityPrecision(posSize / 3, qtyStep);
	if (tpSize < qtyMin) {
		tpSize = qtyMin;
	}

	try {
		const marketOrderRes = await reqs.submitOrder({
			side: 'SELL',
			workingType: 'MARK_PRICE',
			symbol: signal.ticker,
			quantity: posSize,
			type: 'MARKET',
		});

		logger.debug(`Sell ${signal.ticker} market order res`, marketOrderRes);

		try {
			const tpOrderRes = await reqs.submitOrder({
				side: 'BUY',
				workingType: 'MARK_PRICE',
				symbol: signal.ticker,
				quantity: tpSize,
				type: 'TAKE_PROFIT',
				timeInForce: 'GTC',
				reduceOnly: true,
				price: tpPrice,
				stopPrice: tpPrice,
			});

			logger.debug(`Sell ${signal.ticker} tpOrderRes res`, tpOrderRes);

			const slOrderRes = await reqs.submitOrder({
				side: 'BUY',
				workingType: 'MARK_PRICE',
				symbol: signal.ticker,
				type: 'STOP_MARKET',
				stopPrice: slPrice,
				quantity: posSize,
				closePosition: true,
			});

			logger.debug(`Sell ${signal.ticker} slOrderRes res`, slOrderRes);

			const tpSizeUSD = tpSize * lastPrice;

			logger.info(`Sell ${signal.ticker}`, {
				side: 'Sell',
				symbol: signal.ticker,
				risk,
				atrSl,
				lastPrice,
				equityUSD,
				posSizeB4Step,
				posSizeB4MinCmp,
				posSize,
				tpSize,
				equityLeverage,
				posSizeUSD,
				tpSizeUSD,
				tp,
				sl,
			});
		} catch (error) {
			logger.error(`ERROR Sell tp ${signal.ticker}`, error);
		}
	} catch (error) {
		logger.error(`ERROR Sell market ${signal.ticker}`, error);
	}
};

const signalHandler = async (sig) => {
	try {
		try {
			if (!(sig && sig === Object(sig) && sig.ticker)) {
				return;
			}

			if (Number(sig.sig)) {
				logger.info(`Signal ${sig.ticker} ${sig.sig}`);
			} else {
				logger.debug(`Signal ${sig.ticker} ${sig.sig}`);
			}

			const position = await client.getPositions({
				symbol: sig.ticker,
			});

			if (!position) {
				throw new Error('ERROR no getPositionInfo for ' + sig.ticker);
			}

			const openPosition = position.find(
				(position) => position.positionAmt !== '0.000',
			);

			const openPositionSide = openPosition
				? Number(openPosition?.positionAmt) < 0
					? 'SHORT'
					: 'LONG'
				: undefined;

			if (sig.sig === 1 && openPositionSide === undefined) {
				setTimeout(() => {
					console.log('buy', sig.ticker);
					logger.info(JSON.stringify(sig));
				}, 0);

				return await buy(sig);
			}

			if (sig.sig === -1 && openPositionSide === undefined) {
				setTimeout(() => {
					console.log('sell', sig.ticker);
					logger.debug(JSON.stringify(sig));
				}, 0);

				return await sell(sig);
			}

			if (sig.sig === -2 && openPositionSide === 'LONG') {
				console.log('buy exit', sig.ticker);
				return await exitPosition(sig, openPosition);
			}

			if (sig.sig === 2 && openPositionSide === 'SHORT') {
				console.log('sell exit', sig.ticker);
				return await exitPosition(sig, openPosition);
			}

			if (sig.sig === 1 && openPositionSide === 'SHORT') {
				setTimeout(() => {
					logger.info('exit short and long' + sig.ticker);
					logger.debug(JSON.stringify(sig));
				}, 0);

				exitPosition(sig, openPosition).then(async () => {
					await buy(sig);
				});
				return;
			}

			if (sig.sig === -1 && openPositionSide === 'LONG') {
				setTimeout(() => {
					logger.info('exit long and short' + sig.ticker);
					logger.debug(JSON.stringify(sig));
				}, 0);

				await exitPosition(sig, openPosition);
				return await sell(sig);
			}

			console.log('no action', sig.ticker);
		} catch (error) {
			logger.error(`Signal handler execution failed: ${error.message}`);
		}
	} catch (error) {
		logger.error(`Signal handler execution failed: ${error.message}`);
	}
};

module.exports.signalHandler = signalHandler;
