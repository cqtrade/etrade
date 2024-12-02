const stringify = require('json-stable-stringify');
const { sleep } = require('./utils.js');

const logQueue = [];
let isLogging = false;

const enqueueLog = (log) => logQueue.push(log);
const dequeueLog = () => logQueue.shift();

const formatMessage = (message) => {
	if (typeof message === 'object') {
		try {
			return stringify(message, { cycles: true });
		} catch (error) {
			console.error(`Failed to stringify object: ${error}`);
		}
	}

	return message || '';
};

const formatData = (data) =>
	data?.length
		? data.map((item) => '```\n' + formatMessage(item) + '\n```').join('\n')
		: '';

const sendToDiscord = async (url, logData, retryCount = 3) => {
	const retryDelay = 5000;

	for (let retry = 0; retry < retryCount; retry++) {
		try {
			const response = await fetch(url, {
				method: 'POST',
				body: stringify(logData),
				headers: { 'Content-Type': 'application/json' },
			});

			if (!response.ok) {
				throw new Error(
					`Failed to send message to Discord: ${response.status} ${response.statusText}`,
				);
			}

			return;
		} catch (error) {
			console.error(
				`Error sending to Discord (retry ${retry + 1}):`,
				error,
			);
			if (retry < retryCount - 1) {
				await sleep(retryDelay);
			} else {
				console.error(
					`Failed to send message after ${retryCount} retries`,
				);
			}
		}
	}
};

const logToDiscord = async ({
	webhooks,
	level,
	message,
	data,
	retryCount = 3,
}) => {
	const logColors = {
		debug: 2201331,
		info: 5025616,
		warn: 16761095,
		error: 16007990,
	};

	const formattedMessage = formatMessage(message);
	const formattedData = formatData(data);

	const logData = {
		embeds: [
			{
				title: formattedMessage,
				description: formattedData,
				color: logColors[level],
			},
		],
	};

	for (const { url, logLevels } of webhooks) {
		if (logLevels.includes(level)) {
			await sendToDiscord(url, logData, retryCount);
		}
	}
};

const processLog = async ({ level, message, data, webhooks, messageDelay }) => {
	const timestamp = new Date().toISOString();
	const formattedMessage = formatMessage(message);
	const formattedData = data?.length
		? data.map((item) => formatMessage(item)).join(' ')
		: '';

	console[level](
		`[${timestamp}] [${level.toUpperCase()}] ${formattedMessage} ${formattedData}`,
	);

	if (webhooks.some(({ logLevels }) => logLevels.includes(level))) {
		enqueueLog({ level, message, data });

		if (!isLogging) {
			isLogging = true;
			try {
				while (logQueue.length) {
					const log = dequeueLog();
					await logToDiscord({ webhooks, ...log });
					await sleep(messageDelay);
				}
			} catch (error) {
				console.error('Error processing log queue:', error);
			} finally {
				isLogging = false;
			}
		}
	}
};

const createLogger = ({ webhooks = [], messageDelay = 0 } = {}) => {
	if (
		!Array.isArray(webhooks) ||
		!webhooks.every(({ url, logLevels }) => url && Array.isArray(logLevels))
	) {
		throw new Error(
			'Each webhook must have a "url" and a "logLevels" array.',
		);
	}

	const validLogLevels = ['debug', 'info', 'warn', 'error'];
	const allLogLevels = webhooks.flatMap(({ logLevels }) => logLevels);

	if (allLogLevels.some((level) => !validLogLevels.includes(level))) {
		throw new Error('Invalid log level provided.');
	}

	if (new Set(allLogLevels).size !== allLogLevels.length) {
		throw new Error('Duplicate log levels found across webhooks.');
	}

	if (typeof messageDelay !== 'number' || messageDelay < 0) {
		throw new Error('Invalid message delay.');
	}

	const log = (level, message, ...data) => {
		processLog({ level, message, data, webhooks, messageDelay });
	};

	return {
		debug(message, ...data) {
			log('debug', message, ...data);
		},
		info(message, ...data) {
			log('info', message, ...data);
		},
		warn(message, ...data) {
			log('warn', message, ...data);
		},
		error(message, ...data) {
			log('error', message, ...data);
		},
	};
};

module.exports = createLogger;
