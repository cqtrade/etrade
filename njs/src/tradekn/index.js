const { countDecimals, fixedDecimals, sleep } = require('../utils.js');
const logger = require('./logger.js');
const posCheck = require('./position-check');
const tickers = require('../../tickers.json');
const { client } = require('./client.js');

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

const quantityPrecisionCalculator = (qty, precision, positionUnderNotional) => {
	let multiplier = 1;
	for (let index = 0; index < Math.abs(precision); index++) {
		multiplier = multiplier * 10;
	}

	if (precision < 0) {
		return positionUnderNotional
			? Math.ceil(fixedDecimals(qty / multiplier, 0) * multiplier)
			: Math.floor(fixedDecimals(qty / multiplier, 0) * multiplier);
	} else {
		return positionUnderNotional
			? Math.ceil(fixedDecimals(qty / multiplier, 0) * multiplier)
			: Math.floor(fixedDecimals(qty / multiplier, 0) * multiplier);
	}
};

const atrTp1Calc = (close, atrTp1) => {
	const diff = parseFloat(100 * (1 - (close - atrTp1) / close));
	const minDiffAllowedPerc = 0.3;

	if (diff < minDiffAllowedPerc) {
		return (close * minDiffAllowedPerc) / 100;
	}
	return atrTp1;
};

const setPricePrecisionByTickSize = (price, tickSize) => {
	const convertedTickSize = tickSize >= 1 ? tickSize : tickSize.toFixed(20);
	const precision = convertedTickSize.toString().includes('.')
		? convertedTickSize.toString().split('.')[1].length - 1
		: convertedTickSize - 1;

	return Number(price).toFixed(precision);
};

const minSize = (tickSize, precision) => {
	let multiplier = 1;

	for (let index = 0; index < precision; index++) {
		multiplier = multiplier * 10;
	}

	return tickSize / multiplier;
};

const exitPosition = async (signal, position) => {
	const krakenTicker = tickers[signal.ticker].kraken;

	if (position.side === 'long') {
		const res = await client.sendOrder({
			order_tag: 'exit_long',
			orderType: 'mkt',
			symbol: krakenTicker,
			side: 'sell',
			size: position.size,
		});

		return res;
	}

	if (position.side === 'short') {
		const res = await client.sendOrder({
			order_tag: 'exit_short',
			orderType: 'mkt',
			symbol: krakenTicker,
			side: 'buy',
			size: position.size,
		});

		return res;
	}
};

const buy = async (signal) => {
	const krakenTicker = tickers[signal.ticker].kraken;

	const [ticker, instrument] = await Promise.allSettled([
		posCheck.getSymbolTicker(krakenTicker),
		posCheck.getInstrumentBySymbol(krakenTicker),
	]);

	const lastPrice = Number(ticker.value.last);
	const tickSize = instrument.value.tickSize;

	const tp = lastPrice + atrTp1Calc(lastPrice, signal.atrtp);
	const sl = lastPrice - signal.atrsl;

	const tpPrice = setPricePrecisionByTickSize(tp, tickSize);
	const slPrice = setPricePrecisionByTickSize(sl, tickSize);

	const equityUSD = Number(process.env.EQUITY_KN);
	const risk = signal.risk;
	const atrSl = signal.atrsl;

	const { positionSize, equityLeverage, posSizeUSD } = calculatePositionSize(
		risk,
		atrSl,
		lastPrice,
		equityUSD,
	);

	const qtyStep = minSize(
		tickSize,
		instrument.value.contractValueTradePrecision,
	);
	const qtyMin = qtyStep;
	const minNotional = 1;

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

	let tpSize = quantityPrecisionCalculator(
		posSize / 3,
		instrument.value.contractValueTradePrecision,
		positionUnderNotional,
	);

	if (tpSize < qtyMin) {
		tpSize = qtyMin;
	}

	try {
		const buy = await client.sendOrder({
			order_tag: 'buy',
			orderType: 'mkt',
			symbol: krakenTicker,
			side: 'buy',
			size: posSize,
		});

		if (buy.result === 'success' && buy.sendStatus?.status === 'placed') {
			const bulkOrdersRes = await client.batchOrder([
				{
					order: 'send',
					order_tag: 'buy_SL',
					orderType: 'stp',
					symbol: krakenTicker,
					side: 'sell',
					size: posSize,
					stopPrice: Number(slPrice),
					closePosition: 'true',
					reduceOnly: true,
				},
				{
					order: 'send',
					order_tag: 'buy_TP',
					orderType: 'take_profit',
					symbol: krakenTicker,
					side: 'sell',
					size: tpSize,
					stopPrice: Number(tpPrice),
					reduceOnly: true,
				},
			]);

			logger.info(`Buy ${krakenTicker} bulkOrdersRes res`, bulkOrdersRes);
			console.log(`Buy ${krakenTicker} bulkOrdersRes res`, bulkOrdersRes);

			const tpSizeUSD = tpSize * lastPrice;

			logger.info(`Buy ${krakenTicker}`, {
				side: 'Buy',
				symbol: krakenTicker,
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
		} else {
			logger.error(`ERROR Buy ${krakenTicker}`, buy);
		}
	} catch (error) {
		logger.error(`ERROR Buy ${krakenTicker}`, error);
	}
};

const sell = async (signal) => {
	const krakenTicker = tickers[signal.ticker].kraken;

	const [ticker, instrument] = await Promise.allSettled([
		posCheck.getSymbolTicker(krakenTicker),
		posCheck.getInstrumentBySymbol(krakenTicker),
	]);

	const lastPrice = Number(ticker.value.last);
	const tickSize = instrument.value.tickSize;

	const tp = lastPrice - atrTp1Calc(lastPrice, signal.atrtp);
	const sl = lastPrice + signal.atrsl;

	const tpPrice = setPricePrecisionByTickSize(tp, tickSize);
	const slPrice = setPricePrecisionByTickSize(sl, tickSize);

	const equityUSD = Number(process.env.EQUITY_KN);
	const risk = signal.risk;
	const atrSl = signal.atrsl;

	const { positionSize, equityLeverage, posSizeUSD } = calculatePositionSize(
		risk,
		atrSl,
		lastPrice,
		equityUSD,
	);

	const qtyStep = minSize(
		tickSize,
		instrument.value.contractValueTradePrecision,
	);
	const qtyMin = qtyStep;
	const minNotional = 1;

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
		const sell = await client.sendOrder({
			order_tag: 'sell',
			orderType: 'mkt',
			symbol: krakenTicker,
			side: 'sell',
			size: posSize,
		});

		if (sell.result === 'success' && sell.sendStatus?.status === 'placed') {
			const bulkOrdersRes = await client.batchOrder([
				{
					order: 'send',
					order_tag: 'sell_SL',
					orderType: 'stp',
					symbol: krakenTicker,
					side: 'buy',
					size: posSize,
					stopPrice: Number(slPrice),
					closePosition: 'true',
					reduceOnly: true,
				},
				{
					order: 'send',
					order_tag: 'sell_TP',
					orderType: 'take_profit',
					symbol: krakenTicker,
					side: 'buy',
					size: tpSize,
					stopPrice: Number(tpPrice),
					reduceOnly: true,
				},
			]);

			logger.info(
				`Sell ${krakenTicker} bulkOrdersRes res`,
				bulkOrdersRes,
			);
			console.log(
				`Sell ${krakenTicker} bulkOrdersRes res`,
				bulkOrdersRes,
			);

			const tpSizeUSD = tpSize * lastPrice;

			logger.info(`Sell ${krakenTicker}`, {
				side: 'Sell',
				symbol: krakenTicker,
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
		} else {
			logger.error(`ERROR Sell ${krakenTicker}`, sell);
		}
	} catch (error) {
		logger.error(`ERROR Sell ${krakenTicker}`, error);
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

			const position = await client.getOpenPositions();

			if (!position) {
				throw new Error('ERROR no getPositionInfo for ' + sig.ticker);
			}

			const openPosition = position.openPositions.find(
				(position) =>
					parseFloat(position.size) !== 0 &&
					position.symbol === tickers[sig.ticker].kraken,
			);

			const openPositionSide = openPosition?.side;

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

			if (sig.sig === -2 && openPositionSide === 'long') {
				console.log('buy exit', sig.ticker);
				return await exitPosition(sig, openPosition);
			}

			if (sig.sig === 2 && openPositionSide === 'short') {
				console.log('sell exit', sig.ticker);
				return await exitPosition(sig, openPosition);
			}

			if (sig.sig === 1 && openPositionSide === 'short') {
				setTimeout(() => {
					logger.info('exit short and long' + sig.ticker);
					logger.debug(JSON.stringify(sig));
				}, 0);

				exitPosition(sig, openPosition).then(async (res) => {
					await sleep(5000);
					await buy(sig);
				});
				return;
			}

			if (sig.sig === -1 && openPositionSide === 'long') {
				setTimeout(() => {
					logger.info('exit long and short' + sig.ticker);
					logger.debug(JSON.stringify(sig));
				}, 0);

				exitPosition(sig, openPosition).then(async (res) => {
					await sleep(5000);
					await sell(sig);
				});
				return;
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
// 	time: 1724371200000,
// 	ticker: 'BTCUSDT',
// 	risk: 2,
// 	close: 95000,
// 	atrtp: 2591.587392687916,
// 	atrsl: 5183.174785375832,
// 	sig: 2,
// 	atr: 2591.587392687916,
// 	tdfi: 0.458233,
// }).catch((e) => console.error(e));
