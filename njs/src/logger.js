const createLogger = require('./createLogger.js')

const logger = createLogger({
    messageDelay: 1000,
    discordLogLevels: ['info', 'warn', 'error'],
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
})

module.exports = logger
