const { USDMClient } = require('binance');
const logger = require('../logger.js');

// eslint-disable-next-line no-unused-vars
const client = new USDMClient(
	{
		api_key: process.env.BN_API_KEY,
		api_secret: process.env.BN_API_SECRET,
	},
	{},
	true,
);

// eslint-disable-next-line no-unused-vars
const exitPosition = async () => {
	// TODO: implement; see if closePosition from position-check can be extracted to shared reqs file and reused here
};

// eslint-disable-next-line no-unused-vars
const sell = async (signal) => {
	// TODO: implement
};

// eslint-disable-next-line no-unused-vars
const buy = async (signal) => {
	// TODO: implement
};

const signalHandler = async (signal) => {
	try {
		// TODO: implement
	} catch (error) {
		logger.error(`Signal handler execution failed: ${error.message}`);
	}
};

module.exports.signalHandler = signalHandler;
