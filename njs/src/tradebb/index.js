const reqs = require('./reqs.js')
const logger = require('../logger.js')
const { countDecimals, fixedDecimals } = require('../utils.js')

function calculatePositionSize(risk, atrSl, lastPrice, equityUSD) {
    const slRisk = (atrSl * 100) / lastPrice
    const equityLeverage = risk / slRisk
    const posSizeUSD = equityUSD * equityLeverage
    const positionSize = posSizeUSD / lastPrice

    return {
        positionSize,
        equityLeverage,
        posSizeUSD,
    }
}

function calculateQtyPrecision(qty, stepSize) {
    const rawRes = Math.floor(Number(qty) / Number(stepSize)) * Number(stepSize)
    const decimals = countDecimals(stepSize)

    return fixedDecimals(rawRes, decimals)
}

async function exitPosition(sig, position) {
    if (position.side === 'Buy') {
        const result = await reqs.submitOrder({
            side: 'Sell',
            symbol: sig.ticker,
            qty: position.size,
            orderType: 'Market',
            timeInForce: 'PostOnly',
            closeOnTrigger: true,
        })

        return result
    }

    if (position.side === 'Sell') {
        const result = await reqs.submitOrder({
            side: 'Buy',
            symbol: sig.ticker,
            qty: position.size,
            orderType: 'Market',
            timeInForce: 'PostOnly',
            closeOnTrigger: true,
        })

        return result
    }
}

function atrTp1Calc(close, atrTp1) {
    const diff = parseFloat(100 * (1 - (close - atrTp1) / close))
    const minDiffAllowedPerc = 0.3

    if (diff < minDiffAllowedPerc) {
        return (close * minDiffAllowedPerc) / 100
    }

    return atrTp1
}

async function sell(sig) {
    const [ticker, instrument] = await Promise.allSettled([
        reqs.getSymbolTicker(sig.ticker),
        reqs.getInstrumentInfo({ category: 'linear', symbol: sig.ticker }),
    ])

    const lastPrice = Number(ticker.value.lastPrice)
    const tickSize = instrument.value.priceFilter.tickSize

    const tp = lastPrice - atrTp1Calc(lastPrice, sig.atrtp)
    const sl = lastPrice + sig.atrsl

    const slPrice = reqs.setPricePrecisionByTickSize(sl, tickSize)
    const tpPrice = reqs.setPricePrecisionByTickSize(tp, tickSize)

    const equityUSD = Number(process.env.EQUITY)
    const risk = sig.risk
    const atrSl = sig.atrsl

    const { positionSize, equityLeverage, posSizeUSD } = calculatePositionSize(
        risk,
        atrSl,
        lastPrice,
        equityUSD
    )

    let posSize = positionSize

    const qtyStep = instrument.value.lotSizeFilter.qtyStep
    const qtyMin = instrument.value.lotSizeFilter.minTradingQty

    const posSizeBeforeStep = posSize

    posSize = calculateQtyPrecision(posSize, qtyStep)

    const posSizeBeforeMinCmp = posSize
    if (posSize < 3 * qtyMin) {
        posSize = 3 * qtyMin
    }

    let tpSize = calculateQtyPrecision(posSize / 3, qtyStep)
    if (tpSize < qtyMin) {
        tpSize = qtyMin
    }

    try {
        const marketOrderRes = await reqs.submitOrder({
            side: 'Sell',
            symbol: sig.ticker,
            qty: String(posSize),
            orderType: 'Market',
            timeInForce: 'ImmediateOrCancel',
            stopLoss: String(slPrice),
            slTriggerBy: 'LastPrice',
        })

        logger.debug(`Sell ${sig.ticker} market order res`, marketOrderRes)

        try {
            const tpOrderRes = await reqs.submitOrder({
                side: 'Buy',
                symbol: sig.ticker,
                qty: String(tpSize),
                orderType: 'Limit',
                timeInForce: 'PostOnly',
                price: String(tpPrice),
                reduceOnly: true,
            })

            logger.debug(`Buy ${sig.ticker} tpOrderRes res`, tpOrderRes)

            const tpSizeUSD = tpSize * lastPrice

            logger.info(`Sell ${sig.ticker}`, {
                side: 'Sell',
                symbol: sig.ticker,
                risk,
                atrSl,
                lastPrice,
                equityUSD,
                posSizeBeforeStep,
                posSizeBeforeMinCmp,
                posSize,
                tpSize,
                equityLeverage,
                posSizeUSD,
                tpSizeUSD,
                tp,
                sl,
            })
        } catch (error) {
            logger.error(`ERROR Sell tp ${sig.ticker}`, error)
        }
    } catch (error) {
        logger.error(`ERROR Sell market ${sig.ticker}`, error)
    }
}

async function buy(sig) {
    const [ticker, instrument] = await Promise.allSettled([
        reqs.getSymbolTicker(sig.ticker),
        reqs.getInstrumentInfo({ category: 'linear', symbol: sig.ticker }),
    ])

    const lastPrice = Number(ticker.value.lastPrice)
    const tickSize = instrument.value.priceFilter.tickSize

    const tp = lastPrice + atrTp1Calc(lastPrice, sig.atrtp)
    const sl = lastPrice - sig.atrsl

    const slPrice = reqs.setPricePrecisionByTickSize(sl, tickSize)
    const tpPrice = reqs.setPricePrecisionByTickSize(tp, tickSize)

    const equityUSD = Number(process.env.EQUITY)
    const risk = sig.risk
    const atrSl = sig.atrsl

    const { positionSize, equityLeverage, posSizeUSD } = calculatePositionSize(
        risk,
        atrSl,
        lastPrice,
        equityUSD
    )

    let posSize = positionSize

    const qtyStep = instrument.value.lotSizeFilter.qtyStep
    const qtyMin = instrument.value.lotSizeFilter.minTradingQty

    const posSizeBeforeStep = posSize

    posSize = calculateQtyPrecision(posSize, qtyStep)

    const posSizeBeforeMinCmp = posSize

    if (posSize < 3 * qtyMin) {
        posSize = 3 * qtyMin
    }

    let tpSize = calculateQtyPrecision(posSize / 3, qtyStep)
    if (tpSize < qtyMin) {
        tpSize = qtyMin
    }

    try {
        const marketOrderRes = await reqs.submitOrder({
            side: 'Buy',
            symbol: sig.ticker,
            qty: String(posSize),
            orderType: 'Market',
            timeInForce: 'ImmediateOrCancel',
            stopLoss: String(slPrice),
            slTriggerBy: 'LastPrice',
        })

        logger.debug(`Buy ${sig.ticker} market order res`, marketOrderRes)

        try {
            const tpOrderRes = await reqs.submitOrder({
                side: 'Sell',
                symbol: sig.ticker,
                qty: String(tpSize),
                orderType: 'Limit',
                timeInForce: 'PostOnly',
                price: String(tpPrice),
                reduceOnly: true,
            })

            logger.debug(`Buy ${sig.ticker} tpOrderRes res`, tpOrderRes)

            const tpSizeUSD = tpSize * lastPrice

            logger.info(`Buy ${sig.ticker}`, {
                side: 'Buy',
                symbol: sig.ticker,
                risk,
                atrSl,
                lastPrice,
                equityUSD,
                posSizeBeforeStep,
                posSizeBeforeMinCmp,
                posSize,
                tpSize,
                equityLeverage,
                posSizeUSD,
                tpSizeUSD,
                tp,
                sl,
            })
        } catch (error) {
            logger.error(`ERROR Buy tp ${sig.ticker}`, error)
        }
    } catch (error) {
        logger.error(`ERROR Buy market ${sig.ticker}`, error)
    }
}

// in check positions move sl only if no tp order and profit pnl is at least 0.25%
async function signalHandler(sig) {
    try {
        if (!(sig && sig === Object(sig) && sig.ticker)) {
            return
        }

        if (Number(sig.sig)) {
            logger.info(`Signal ${sig.ticker} ${sig.sig}`)
        } else {
            logger.debug(`Signal ${sig.ticker} ${sig.sig}`)
        }

        const position = await reqs.getPosition(sig.ticker, 'USDT')
        const side = position.side

        const actions = {
            1: {
                None: async () => {
                    setImmediate(() => {
                        logger.debug('buy', sig.ticker)
                        logger.info(JSON.stringify(sig))
                    })

                    return await buy(sig)
                },
                Sell: async () => {
                    setImmediate(() => {
                        logger.info('exit short and long' + sig.ticker)
                        logger.debug(JSON.stringify(sig))
                    })
                    await exitPosition(sig, position)

                    return await buy(sig)
                },
            },
            '-1': {
                None: async () => {
                    setImmediate(() => {
                        logger.debug('sell', sig.ticker)
                        logger.debug(JSON.stringify(sig))
                    })

                    return await sell(sig)
                },
                Buy: async () => {
                    setImmediate(() => {
                        logger.info('exit long and short' + sig.ticker)
                        logger.debug(JSON.stringify(sig))
                    })
                    await exitPosition(sig, position)

                    return await sell(sig)
                },
            },
            2: {
                Sell: async () => {
                    logger.debug('sell exit', sig.ticker)

                    return await exitPosition(sig, position)
                },
            },
            '-2': {
                Buy: async () => {
                    logger.debug('buy exit', sig.ticker)

                    return await exitPosition(sig, position)
                },
            },
        }

        if (actions?.[sig.sig]?.[side]) {
            return await actions[sig.sig][side]()
        }
    } catch (error) {
        logger.error(`ERROR signalHandler ${error.message}`)
    }
}

module.exports.signalHandler = signalHandler
