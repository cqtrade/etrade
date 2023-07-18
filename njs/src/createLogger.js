const stringify = require('json-stable-stringify')
const { sleep } = require('./utils.js')

const logQueue = []
let isLogging = false

function enqueueLog(level, message, data) {
    logQueue.push({ level, message, data })
}

function dequeueLog() {
    if (logQueue.length) {
        return logQueue.shift()
    }
}

function formatMessage(message) {
    if (typeof message === 'object') {
        try {
            return stringify(message, { cycles: true })
        } catch (error) {
            console.error(`Failed to stringify object: ${error}`)
        }
    }

    return message || ''
}

async function logToDiscord({
    discordWebhookUrl,
    level,
    message,
    data,
    retryCount = 3,
}) {
    const logColors = {
        debug: 2201331,
        info: 5025616,
        warn: 16761095,
        error: 16007990,
    }

    const formattedData = data?.length
        ? data.map((item) => '```\n' + formatMessage(item) + '\n```').join('\n')
        : ''

    const formattedMessage = formatMessage(message)

    const logData = {
        embeds: [
            {
                title: formattedMessage,
                description: formattedData,
                color: logColors[level],
            },
        ],
    }

    let retry = 0
    const retryDelay = 5000

    while (retry <= retryCount) {
        try {
            const response = await fetch(discordWebhookUrl, {
                method: 'POST',
                body: stringify(logData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(
                    `Failed to send message to Discord: ${response.status} ${response.statusText}`
                )
            }

            return
        } catch (error) {
            console.error(
                `An error occurred while sending the message to Discord (retry ${retry}):`,
                error
            )

            retry++

            await sleep(retryDelay)
        }
    }

    console.error(
        `Failed to send the message to Discord after ${retryCount} retries`
    )
}

async function processLog({
    level,
    message,
    data,
    discordWebhookUrl,
    discordLogLevels,
    messageDelay,
}) {
    const timestamp = new Date().toISOString()
    const formattedMessage = formatMessage(message)
    const formattedData = data?.length
        ? data.map((dataItem) => formatMessage(dataItem)).join(' ')
        : ''

    console[level](
        `[${timestamp}] [${level.toUpperCase()}] ${formattedMessage} ${formattedData}`
    )

    const shouldLogToDiscord =
        discordLogLevels.length && discordLogLevels.includes(level)

    if (shouldLogToDiscord) {
        enqueueLog(level, message, data)

        if (!isLogging) {
            isLogging = true

            try {
                while (logQueue.length) {
                    const { level, message, data } = dequeueLog()

                    setImmediate(() =>
                        logToDiscord({
                            discordWebhookUrl,
                            level,
                            message,
                            data,
                        })
                    )

                    await sleep(messageDelay)
                }
            } catch (error) {
                console.error(
                    'An error occurred while processing the log queue',
                    error
                )
            } finally {
                isLogging = false
            }
        }
    }
}

function createLogger({
    discordWebhookUrl,
    discordLogLevels = [],
    messageDelay = 0,
} = {}) {
    if (discordLogLevels.length && !discordWebhookUrl) {
        throw new Error('Discord webhook URL is required')
    }

    const validLogLevels = ['debug', 'info', 'warn', 'error']

    if (discordLogLevels.some((level) => !validLogLevels.includes(level))) {
        throw new Error('Invalid log level provided')
    }

    if (typeof messageDelay !== 'number' || messageDelay < 0) {
        throw new Error('Invalid message delay provided')
    }

    function log(level, message, ...data) {
        setImmediate(() =>
            processLog({
                level,
                message,
                data,
                discordWebhookUrl,
                discordLogLevels,
                messageDelay,
            })
        )
    }

    return {
        debug(message, ...data) {
            log('debug', message, ...data)
        },
        info(message, ...data) {
            log('info', message, ...data)
        },
        warn(message, ...data) {
            log('warn', message, ...data)
        },
        error(message, ...data) {
            log('error', message, ...data)
        },
    }
}

module.exports = createLogger
