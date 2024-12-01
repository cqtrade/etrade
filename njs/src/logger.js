const createLogger = require('./createLogger.js');

const logger = createLogger({
	webhooks: [
		{
			url: process.env.DISCORD_WEBHOOK_URL,
			logLevels: ['info', 'warn'],
		},
		{
			url: process.env.DISCORD_ADDITIONAL_WEBHOOK_URL,
			logLevels: ['error'],
		},
	],
	messageDelay: 1000,
});

module.exports = logger;
