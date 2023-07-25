const createLogger = require('./createLogger.js')

const logger = createLogger({
    messageDelay: 1000,
    discordLogLevels: ['info', 'warn'],
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
    additionalDiscordLogLevels: ['error'],
    additionalDiscordWebhookUrl: process.env.DISCORD_ADDITIONAL_WEBHOOK_URL,
})

module.exports = logger
