// require('dotenv').config();

const reqs = require('./reqs.js');
const logger = require('../logger.js');
const { countDecimals, fixedDecimals } = require('../utils.js');

const client = reqs.client;

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

const calculateQuantityPrecision = (qty, stepSize, positionUnderNotional) => {
	const rawRes = positionUnderNotional
		? Math.ceil(Number(qty) / Number(stepSize)) * Number(stepSize)
		: Math.floor(Number(qty) / Number(stepSize)) * Number(stepSize);
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
	const [ticker, instrument, leverage] = await Promise.allSettled([
		reqs.getSymbolTicker(signal.ticker),
		reqs.getInstrumentInfo(signal.ticker),
		reqs.getLeverageInfo(signal.ticker),
	]);

	if (leverage.status === 'fulfilled') {
		const maxLeverage = leverage.value[0].brackets[0].initialLeverage;
		await reqs.setLeverage({
			symbol: signal.ticker,
			leverage: maxLeverage,
		});
	}

	const lastPrice = Number(ticker.value.lastPrice);
	const tickSize = instrument.value.filters.find(
		(filter) => filter.filterType === 'PRICE_FILTER',
	).tickSize;

	const tp = lastPrice + atrTp1Calc(lastPrice, signal.atrtp);
	const sl = lastPrice - signal.atrsl;

	const tpPrice = reqs.setPricePrecisionByTickSize(tp, tickSize);
	const slPrice = reqs.setPricePrecisionByTickSize(sl, tickSize);

	const equityUSD = Number(process.env.EQUITY_BN);
	const risk = signal.risk;
	const atrSl = signal.atrsl;

	const { positionSize, equityLeverage, posSizeUSD } = calculatePositionSize(
		risk,
		atrSl,
		lastPrice,
		equityUSD,
	);

	const qtyStep = instrument.value.filters.find(
		(filter) => filter.filterType === 'MARKET_LOT_SIZE',
	).stepSize;
	const qtyMin = instrument.value.filters.find(
		(filter) => filter.filterType === 'MARKET_LOT_SIZE',
	).minQty;
	const minNotional = Number(
		instrument.value.filters.find(
			(filter) => filter.filterType === 'MIN_NOTIONAL',
		).notional,
	);

	let posSize = positionSize;
	let positionUnderNotional = false;

	if (posSize * lastPrice < minNotional) {
		positionUnderNotional = true;
		posSize = minNotional / lastPrice;
	}

	const posSizeB4Step = posSize;

	posSize = calculateQuantityPrecision(
		posSize,
		qtyStep,
		positionUnderNotional,
	);

	const posSizeB4MinCmp = posSize;
	if (posSize < 3 * qtyMin) {
		posSize = 3 * qtyMin;
		posSize = calculateQuantityPrecision(
			posSize,
			qtyStep,
			positionUnderNotional,
		);
	}

	let tpSize = calculateQuantityPrecision(
		posSize / 3,
		qtyStep,
		positionUnderNotional,
	);
	if (tpSize < qtyMin) {
		tpSize = qtyMin;
	}

	try {
		const bulkOrdersRes = await client.submitMultipleOrders([
			{
				side: 'BUY',
				symbol: signal.ticker,
				quantity: String(posSize),
				type: 'MARKET',
			}, {
				side: 'SELL',
				symbol: signal.ticker,
				workingType: 'CONTRACT_PRICE',
				type: 'STOP_MARKET',
				stopPrice: String(slPrice),
				quantity: String(posSize),
				closePosition: "true",
			}, {
				side: 'SELL',
				symbol: signal.ticker,
				quantity: String(tpSize),
				stopPrice: String(tpPrice),
				type: 'TAKE_PROFIT_MARKET',
				priceProtect: "true",
				reduceOnly: "true",
				workingType: 'CONTRACT_PRICE',
			}
		]);

		logger.info(`Buy ${signal.ticker} bulkOrdersRes res`, bulkOrdersRes);
		console.log(`Buy ${signal.ticker} bulkOrdersRes res`, bulkOrdersRes);

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
		logger.error(`ERROR Buy ${signal.ticker}`, error);
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

	const equityUSD = Number(process.env.EQUITY_BN);
	const risk = signal.risk;
	const atrSl = signal.atrsl;

	const { positionSize, equityLeverage, posSizeUSD } = calculatePositionSize(
		risk,
		atrSl,
		lastPrice,
		equityUSD,
	);

	const qtyStep = instrument.value.filters.find(
		(filter) => filter.filterType === 'MARKET_LOT_SIZE',
	).stepSize;
	const qtyMin = instrument.value.filters.find(
		(filter) => filter.filterType === 'MARKET_LOT_SIZE',
	).minQty;
	const minNotional = Number(
		instrument.value.filters.find(
			(filter) => filter.filterType === 'MIN_NOTIONAL',
		).notional,
	);

	let posSize = positionSize;
	let positionUnderNotional = false;

	if (posSize * lastPrice < minNotional) {
		positionUnderNotional = true;
		posSize = minNotional / lastPrice;
	}

	const posSizeB4Step = posSize;

	posSize = calculateQuantityPrecision(
		posSize,
		qtyStep,
		positionUnderNotional,
	);

	const posSizeB4MinCmp = posSize;
	if (posSize < 3 * qtyMin) {
		posSize = 3 * qtyMin;
		posSize = calculateQuantityPrecision(
			posSize,
			qtyStep,
			positionUnderNotional,
		);
	}

	let tpSize = calculateQuantityPrecision(
		posSize / 3,
		qtyStep,
		positionUnderNotional,
	);
	if (tpSize < qtyMin) {
		tpSize = qtyMin;
	}

	try {
		const bulkOrdersRes = await client.submitMultipleOrders([
			{
				side: 'SELL',
				workingType: 'MARK_PRICE',
				symbol: signal.ticker,
				quantity: String(posSize),
				type: 'MARKET',
			}, {
				side: 'BUY',
				symbol: signal.ticker,
				workingType: 'CONTRACT_PRICE',
				type: 'STOP_MARKET',
				stopPrice: String(slPrice),
				quantity: String(posSize),
				closePosition: "true",

			}, {
				side: 'BUY',
				symbol: signal.ticker,
				quantity: String(tpSize),
				stopPrice: String(tpPrice),
				type: 'TAKE_PROFIT_MARKET',
				priceProtect: "true",
				reduceOnly: "true",
				workingType: 'CONTRACT_PRICE',
			}
		]);

		logger.info(`Sell ${signal.ticker} bulkOrdersRes res`, bulkOrdersRes);
		console.log(`Sell ${signal.ticker} bulkOrdersRes res`, bulkOrdersRes);

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
				(position) => parseFloat(position.positionAmt) !== 0,
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

// signalHandler({
// 	"time": 1724371200000,
// 	"ticker": "COMPUSDT",
// 	"risk": 2,
// 	"close": 54.23,
// 	"atrtp": 3.3485913069002553,
// 	"atrsl": 6.697182613800511,
// 	"sig": 2,
// 	"atr": 3.3485913069002553,
// 	"tdfi": 0.343254,
// 	"exchange": "BB"
// }
// ).catch(console.error);
