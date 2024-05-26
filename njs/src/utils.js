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
