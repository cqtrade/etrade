const KrakenFuturesApiClientV3 = require('./api.js');

const client =
	process.env.KN_API_ENABLED &&
	KrakenFuturesApiClientV3({
		apiKey: process.env.KN_API_KEY,
		apiSecret: process.env.KN_API_SECRET,
		isTestnet: false,
		timeout: 5000,
	});

module.exports.client = client;
