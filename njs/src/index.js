const positionCheck = require('./tradebb/position-check.js')
const server = require('./server.js')

// USDT positions check
positionCheck.engine()

// start server - incoming signals
server.bootServer()
