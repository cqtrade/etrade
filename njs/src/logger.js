const createLogger = require('./createLogger.js')

const logger = createLogger({
    messageDelay: 5000,
    discordLogLevels: ['info', 'warn', 'error'],
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
})

module.exports = logger
