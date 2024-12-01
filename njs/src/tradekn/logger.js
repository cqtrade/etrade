const createLogger = require('../createLogger.js');

const logger = createLogger({
	webhooks: [
		{
			url: process.env.KN_DISCORD_WEBHOOK_UPDATES_URL,
			logLevels: ['info', 'warn'],
		},
		{
			url: process.env.KN_DISCORD_WEBHOOK_ALERTS_URL,
			logLevels: ['error'],
		},
	],
	messageDelay: 1000,
});

module.exports = logger;
