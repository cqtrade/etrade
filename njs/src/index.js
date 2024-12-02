const positionCheck = require('./tradebb/position-check.js');
const positionCheckBN = require('./tradebn/position-check.js');
const positionCheckKN = require('./tradekn/position-check.js');

const server = require('./server.js');

// USDT positions check
if (process.env.API_ENABLED) {
	positionCheck.engine();
}

if (process.env.BN_API_ENABLED) {
	positionCheckBN.engine();
}

if (process.env.KN_API_ENABLED) {
	positionCheckKN.engine();
}

// start server - incoming signals
server.bootServer();
