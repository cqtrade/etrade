const utils = require('./utils.js')

const logQueue = []
let isLogging = false

const createLogger = ({
    discordLogLevels = [],
    messageDelay = 0,
    discordWebhookUrl,
}) => {
    const logColors = {
        debug: 2201331,
        info: 5025616,
        warn: 16761095,
        error: 16007990,
    }

    const logToDiscord = async (level, message, data) => {
        const formattedData = data.length
            ? data
                  .map(
                      (item) =>
                          '```\n' +
                          (typeof item === 'object'
                              ? JSON.stringify(item)
                              : item) +
                          '\n```'
                  )
                  .join('\n')
            : ''

        const logData = {
            embeds: [
                {
                    title: message,
                    description: formattedData,
                    color: logColors[level],
                },
            ],
        }

        try {
            await fetch(discordWebhookUrl, {
                method: 'POST',
                body: JSON.stringify(logData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })
        } catch (error) {
            console.error(
                'An error occurred while sending the message to Discord',
                error
            )
        }
    }

    const processLogQueue = async () => {
        while (logQueue.length > 0) {
            const { level, message, data } = logQueue.shift()

            const timestamp = new Date().toISOString()

            console[level](
                `[${timestamp}] [${level.toUpperCase()}] ${message} ${data
                    .map((dataItem) => JSON.stringify(dataItem))
                    .join(' ')}`
            )

            const shouldLogToDiscord =
                discordWebhookUrl && discordLogLevels.includes(level)

            if (shouldLogToDiscord) {
                await logToDiscord(level, message, data)
            }

            await utils.sleep(messageDelay)
        }

        isLogging = false
    }

    const addToLogQueue = (level, message, data) => {
        logQueue.push({ level, message, data })

        if (!isLogging) {
            isLogging = true
            processLogQueue()
        }
    }

    const debug = (message, ...data) => addToLogQueue('debug', message, data)
    const info = (message, ...data) => addToLogQueue('info', message, data)
    const warn = (message, ...data) => addToLogQueue('warn', message, data)
    const error = (message, ...data) => addToLogQueue('error', message, data)

    return {
        debug,
        info,
        warn,
        error,
    }
}

module.exports = createLogger
