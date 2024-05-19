const { USDMClient } = require('binance');

const client = new USDMClient(
	{
		api_key: process.env.BN_API_KEY,
		api_secret: process.env.BN_API_SECRET,
	},
	{},
	true,
);

const getSymbolTicker = async (symbol) => {
	try {
		return await client.getSymbolPriceTicker({ symbol });
	} catch (error) {
		console.error(
			`Failed to retrieve price ticker for symbol ${symbol}:`,
			error,
		);
		throw error;
	}
};

module.exports.getSymbolTicker = getSymbolTicker;
