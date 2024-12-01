const createLogger = require('./createLogger');

jest.mock('./utils.js', () => ({
	sleep: jest.fn(() => Promise.resolve()),
}));

const flushPromises = () => new Promise(setImmediate);

describe('Logger', () => {
	let mockFetch;
	let logger;

	const webhooks = [
		{
			url: 'https://discord.com/api/webhooks/1',
			logLevels: ['info', 'error'],
		},
	];

	beforeEach(() => {
		mockFetch = jest.fn();
		global.fetch = mockFetch;
		jest.clearAllMocks();
		logger = createLogger({ webhooks, messageDelay: 100 });
	});

	it('should throw error for invalid webhook format', () => {
		expect(() =>
			createLogger({ webhooks: [{ url: '', logLevels: [] }] }),
		).toThrow('Each webhook must have a "url" and a "logLevels" array.');
	});

	it('should throw error for invalid log level', () => {
		const invalidWebhooks = [
			{
				url: 'https://discord.com/api/webhooks/1',
				logLevels: ['invalid'],
			},
		];
		expect(() => createLogger({ webhooks: invalidWebhooks })).toThrow(
			'Invalid log level provided.',
		);
	});

	it('should throw error for duplicate log levels', () => {
		const duplicateWebhooks = [
			{
				url: 'https://discord.com/api/webhooks/1',
				logLevels: ['info'],
			},
			{
				url: 'https://discord.com/api/webhooks/2',
				logLevels: ['info'],
			},
		];
		expect(() => createLogger({ webhooks: duplicateWebhooks })).toThrow(
			'Duplicate log levels found across webhooks.',
		);
	});

	it('should throw error for invalid messageDelay', () => {
		expect(() => createLogger({ webhooks, messageDelay: -1 })).toThrow(
			'Invalid message delay.',
		);
	});

	it('should create a logger with valid config', () => {
		const validLogger = createLogger({ webhooks, messageDelay: 100 });
		expect(validLogger).toHaveProperty('debug');
		expect(validLogger).toHaveProperty('info');
		expect(validLogger).toHaveProperty('warn');
		expect(validLogger).toHaveProperty('error');
	});

	it('should process log and send to Discord', () => {
		mockFetch.mockResolvedValueOnce({ ok: true });

		logger.info('Test info log', { key: 'value' });

		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith(
			'https://discord.com/api/webhooks/1',
			expect.objectContaining({
				method: 'POST',
				body: expect.any(String),
				headers: { 'Content-Type': 'application/json' },
			}),
		);
	});

	it('should not send log if the level does not match any webhook level', async () => {
		const webhooksWithDifferentLevel = [
			{
				url: 'https://discord.com/api/webhooks/1',
				logLevels: ['debug'],
			},
		];
		const newLogger = createLogger({
			webhooks: webhooksWithDifferentLevel,
		});

		newLogger.info('This log should not be sent');

		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('should retry sending log when fetch fails', async () => {
		mockFetch
			.mockRejectedValueOnce(new Error('Network error'))
			.mockResolvedValueOnce({ ok: true });

		await logger.info('Test info log with retry', { key: 'value' });

		await flushPromises();

		expect(mockFetch).toHaveBeenCalledTimes(2);
		expect(mockFetch).toHaveBeenCalledWith(
			'https://discord.com/api/webhooks/1',
			expect.objectContaining({
				method: 'POST',
				body: expect.any(String),
				headers: { 'Content-Type': 'application/json' },
			}),
		);
	});

	it('should send logs to multiple webhooks for matching levels', async () => {
		const multiWebhookLogger = createLogger({
			webhooks: [
				{
					url: 'https://discord.com/api/webhooks/1',
					logLevels: ['info'],
				},
				{
					url: 'https://discord.com/api/webhooks/2',
					logLevels: ['warn'],
				},
			],
		});

		mockFetch.mockResolvedValueOnce({ ok: true });
		mockFetch.mockResolvedValueOnce({ ok: true });

		multiWebhookLogger.info('Info log');
		multiWebhookLogger.warn('Warn log');

		await flushPromises();

		expect(mockFetch).toHaveBeenCalledTimes(2);

		expect(mockFetch).toHaveBeenCalledWith(
			'https://discord.com/api/webhooks/1',
			expect.objectContaining({ method: 'POST' }),
		);
		expect(mockFetch).toHaveBeenCalledWith(
			'https://discord.com/api/webhooks/2',
			expect.objectContaining({ method: 'POST' }),
		);
	});

	it('should correctly format message and data for objects and arrays', () => {
		const logData = { key: 'value' };
		logger.info('Test log', logData);

		expect(mockFetch).toHaveBeenCalledWith(
			'https://discord.com/api/webhooks/1',
			expect.objectContaining({
				body: expect.stringContaining(
					'{"embeds":[{"color":5025616,"description":"```\\n{\\"key\\":\\"value\\"}\\n```","title":"Test log"}]}',
				),
			}),
		);
	});

	it('should handle empty or null data gracefully', () => {
		mockFetch.mockResolvedValueOnce({ ok: true });

		logger.info('Info log without data');

		expect(mockFetch).toHaveBeenCalledWith(
			'https://discord.com/api/webhooks/1',
			expect.objectContaining({
				body: expect.stringContaining(''),
			}),
		);
	});
});
