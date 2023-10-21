const fastify = require('fastify');
const trade = require('./tradebb/index')
const tradeBinance = require('./tradebinance/index')
const logger = require('./logger.js')
const { sleep } = require('./utils.js')

const server = fastify();

server.get('/health', async (request, reply) => 'OK');
server.get('/', async (request, reply) => '');

server.post(
    '/signal',
    {},
    async (request, reply) => {
        reply.code(201).send({ status: 'OK' });
        setTimeout(() => {
            (async () => {
                try {
                    console.log('request.body', request.body);
                    if (request.body instanceof Array) {
                        for (const sig of request.body) {
                            await trade.signalHandler(sig);
                            await sleep(1000);
                        }
                        logger.info(`Signals received: ${request.body.length}`);
                        return;
                    }
                } catch (e) {
                    logger.error('signal handler error ' + e.message);
                }
            })().catch();
        }, 0);
    });

server.post(
    '/signal4',
    {},
    async (request, reply) => {
        reply.code(201).send({ status: 'OK' });
        setTimeout(() => {
            (async () => {
                try {
                    console.log('request.body', request.body);
                    if (request.body instanceof Array) {
                        for (const sig of request.body) {
                            await tradeBinance.signalHandler(sig);
                            await sleep(1000);
                        }
                        logger.info(`4 Signals received: ${request.body.length}`);
                        return;
                    }
                } catch (e) {
                    logger.error('4 signal handler error ' + e.message);
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
