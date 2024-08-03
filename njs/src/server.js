const fastify = require('fastify');
const trade = require('./tradebb/index.js');
const tradeBn = require('./tradebn/index.js');
const logger = require('./logger.js');
const { sleep } = require('./utils.js');

const server = fastify();

server.get('/health', async (request, reply) => 'OK');
server.get('/', async (request, reply) => '');

server.post('/signal', {}, async (request, reply) => {
	reply.code(201).send({ status: 'OK' });

	setTimeout(() => {
		(async () => {
			try {
				console.log('request.body', request.body);
				if (request.body instanceof Array) {
					for (const sig of request.body) {
						if (Number(sig.sig) === 0) {
							continue;
						}

						// Signal service sends exchange agnostic signals

						const { interval, ticker } = sig;
						console.log('interval', interval);
						console.log('ticker', ticker);

						// atm ByBit tickers ticker


						if (process.env.API_ENABLED) {
							// if needed, map ticker to BB format
							// TODO check if ticker exists in Binance
							await trade.signalHandler(sig);
							await sleep(103);
						}

						if (process.env.BN_API_ENABLED) {
							// if needed, map ticker to Binance format
							// TODO check if ticker exists in Binance
							await tradeBn.signalHandler(sig);
							await sleep(103);
						}

						if (process.env.KRAKEN_API_ENABLED) {
							// if needed, map ticker to Kraken format
							// TODO check if ticker exists in Kraken
							await tradeBn.signalHandler(sig);
							await sleep(333);
						}
					}
					logger.info(`Signals received: ${request.body.length}`);
				}
			} catch (error) {
				logger.error('signal handler error ' + error.message);
			}
		})().catch();
	}, 0);
});

function bootServer() {
	server.listen(3000, '0.0.0.0', (err, address) => {
		if (err) {
			console.error(err.message);
			process.exit(1);
		}
		console.log(`Server listening at ${address}`);
	});
}

module.exports.bootServer = bootServer;
