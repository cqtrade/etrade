const trailing = require('./tradebb/trailing.js')
const positionCheck = require('./tradebb/position-check.js')
const server = require('./server.js')

if (process.env.TRAIL) {
    // USDC positions trailing stop
    trailing.engine();
}

// USDT positions check
positionCheck.engine()

// start server - incoming signals
server.bootServer()
