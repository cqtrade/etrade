const { sleep } = require('./utils.js')

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
        const formattedData = data && data.length
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

            try {
                const shouldLogToDiscord =
                    discordWebhookUrl && discordLogLevels.includes(level)

                if (shouldLogToDiscord) {
                    await logToDiscord(level, message, data)
                }

                await sleep(messageDelay)
            } catch (error) {
                await sleep(messageDelay)
            }
        }

        isLogging = false
    }

    const addToLogQueue = (level, message, data) => {
        const timestamp = new Date().toISOString()
        console[level](
            `[${timestamp}] [${level.toUpperCase()}] ${message} ${data
                .map((dataItem) => JSON.stringify(dataItem))
                .join(' ')}`
        )

        logQueue.push({ level, message, data })

        if (!isLogging) {
            isLogging = true
            processLogQueue()
                .catch((error) => {
                    console.error(
                        'An error occurred while processing the log queue',
                        error
                    )
                    isLogging = false
                })
        }
    }

    const debug = (message, ...data) => setTimeout(() => {
        addToLogQueue('debug', message, data)
    }, 0)

    const info = (message, ...data) => setTimeout(() => {
        addToLogQueue('info', message, data)
    }, 0)

    const warn = (message, ...data) => setTimeout(() => {
        addToLogQueue('warn', message, data)
    }, 0)

    const error = (message, ...data) => setTimeout(() => {
        addToLogQueue('error', message, data)
    }, 0)

    return {
        debug,
        info,
        warn,
        error,
    }
}

module.exports = createLogger
