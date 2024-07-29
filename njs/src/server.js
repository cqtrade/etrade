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
						const { exchange } = sig;

						if (exchange === 'BB' && process.env.API_ENABLED) {
							await trade.signalHandler(sig);
							await sleep(1000);
						} else if (exchange === 'B' && process.env.BN_API_ENABLED) {
							await tradeBn.signalHandler(sig);
							await sleep(1000);
						} else {
							try {
								console.log(
									`Sig not handled: ${sig.exchange} ${sig.ticker} ${sig.sig}`,
								);
							} catch (error) {
								logger.error(
									'signal handler error ' + error.message,
								);
							}
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
