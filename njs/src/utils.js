const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

module.exports.sleep = sleep;

const countDecimals = (num) => {
	const numAsString = num.toString();

	// Check if the number has a decimal point
	if (numAsString.includes('.')) {
		return numAsString.split('.')[1].length;
	}

	return 0;
};

module.exports.countDecimals = countDecimals;

const fixedDecimals = (num, decimalPlaces) =>
	parseFloat(num.toFixed(decimalPlaces));

module.exports.fixedDecimals = fixedDecimals;

const calculatePnlPercentage = (side, entryPrice, lastPrice) => {
	const priceDifference =
		side.toUpperCase() === 'BUY'
			? lastPrice - entryPrice
			: entryPrice - lastPrice;
	const percentageChange = (priceDifference / entryPrice) * 100;

	return Math.floor(percentageChange * 100) / 100;
};

module.exports.calculatePnlPercentage = calculatePnlPercentage;

const setPricePrecisionByTickSize = (price, tickSize) => {
	const precision = tickSize.toString().split('.')[1].length - 1;

	return Number(price).toFixed(precision);
};

module.exports.setPricePrecisionByTickSize = setPricePrecisionByTickSize;

const calculatePositionSize = ({ risk, atrSl, lastPrice, equityUSD }) => {
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

module.exports.calculatePositionSize = calculatePositionSize;

const calculateQuantityPrecision = (qty, stepSize) => {
	const rawRes =
		Math.floor(Number(qty) / Number(stepSize)) * Number(stepSize);
	const decimals = countDecimals(stepSize);

	return fixedDecimals(rawRes, decimals);
};

module.exports.calculateQuantityPrecision = calculateQuantityPrecision;

const atrTp1Calc = (close, atrTp1) => {
	const diff = parseFloat(100 * (1 - (close - atrTp1) / close));
	const minDiffAllowedPerc = 0.3;

	if (diff < minDiffAllowedPerc) {
		return (close * minDiffAllowedPerc) / 100;
	}

	return atrTp1;
};

module.exports.atrTp1Calc = atrTp1Calc;
