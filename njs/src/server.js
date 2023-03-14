const fastify = require('fastify');
const trade = require('./tradebb/index')

const server = fastify();

server.get('/health', async (request, reply) => 'OK');
server.get('/', async (request, reply) => '');

server.post(
    '/signal',
    {},
    async (request, reply) => {
        reply.code(201).send({ status: 'OK' });
        setTimeout(() => {
            trade
                .signalHandler(request.body)
                .catch((e) => {
                    console.log('e', e);
                });
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
