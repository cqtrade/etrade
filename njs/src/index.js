// const positions = require('./tradebb/trailingpositionssl.js')
const positionCheck = require('./tradebb/position-check.js')
const server = require('./server.js')
// const trade = require('./tradebb/index')
// const log = require('./log.js')


// positions.engine();

positionCheck.engine();

server.bootServer();

// const atr = 200;

// trade.signalHandler({
//     "sig": 2,
//     "ticker": "BTCUSDT",
//     "atrtp": 100,
//     "atrsl": 300,
//     "risk": 1,
//     "exchange": "BB"
// })
//     .catch((e) => {
//         console.log('e', e);
//     });

// log.discord('Silly', 'Hello world');
