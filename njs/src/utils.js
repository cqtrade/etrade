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


const isTickerAvailableInKraken = async (ticker, resolution) => {
	try {
		// if ticker starts with 1000, remove it
		let tickerName = ticker
		if (ticker.startsWith('1000')) {
			tickerName = ticker.replace('1000', '');
		}

		if (tickerName[tickerName.length - 1] === 'T') { // USDT- > USD
			tickerName = tickerName.substring(0, tickerName.length - 1);
		}

		tickerName = `PF_${tickerName}`;


		const url = `https://futures.kraken.com/api/charts/v1/trade/${tickerName}/${resolution}?limit=1`;
		const response = await fetch(url);
		const data = await response.json();
		if (data.error) {
			console.log('ticker not available in Kraken', tickerName);
			return false;
		}
		if (data.candles.length === 0) {
			console.log('ticker not available in Kraken', tickerName);
			return false;
		}
		console.log('data', data);
		return tickerName;
	} catch (error) {
		console.log('error', error);
	}

	return false;
}

module.exports.isTickerAvailableInKraken = isTickerAvailableInKraken;

// isTickerAvailableInKraken('1000PEPEUSDT', '1d').catch(console.error);

const isTickerAvailableInByBit = async (ticker) => {
	try {
		// const url = `https://api.bybit.com/v2/public/tickers?symbol=${ticker}`;
		const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${ticker}&interval=D&limit=1`;
		const response = await fetch(url);
		const data = await response.json();
		console.log('data', data);
		if (data.ret_code === 0) {
			return true;
		}
	} catch (error) {
		console.log('error', error);
	}

	return false;
}

module.exports.isTickerAvailableInByBit = isTickerAvailableInByBit;

// isTickerAvailableInByBit('BTCUSDT1').catch(console.error);
