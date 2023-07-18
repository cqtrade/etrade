const { ContractClient } = require('bybit-api')
const { sleep } = require('../utils.js')
const logger = require('../logger.js')

const key = process.env.API_KEY
const secret = process.env.API_SECRET

const client = new ContractClient({
    key,
    secret,
    strict_param_validation: true,
})

const pnl = (side, avgEntry, lastPrice) => {
    if (side === 'Buy') {
        return (
            Math.floor(100 * ((100 * (lastPrice - avgEntry)) / avgEntry)) / 100
        )
    } else {
        return (
            Math.floor(100 * ((100 * (avgEntry - lastPrice)) / avgEntry)) / 100
        )
    }
}

const getSymbolTicker = async (symbol) => {
    try {
        const { retMsg, result } = await client.getSymbolTicker('', symbol)
        if (retMsg !== 'OK') {
            throw new Error('getKline failed ' + retMsg)
        }

        const [tickerInfo] = result.list
        return tickerInfo
    } catch (error) {
        logger.error('trailing getSymbolTicker failed: ' + error.message)
        throw error
    }
}

module.exports.getSymbolTicker = getSymbolTicker

const getInstrumentInfo = async ({ category, symbol }) => {
    try {
        const { retMsg, result } = await client.getInstrumentInfo({
            category,
            symbol,
        })
        if (retMsg !== 'OK') {
            throw new Error('getInstrumentInfo failed ' + retMsg)
        }
        const [instrumentInfo] = result.list
        return instrumentInfo
    } catch (error) {
        logger.error('trailing getInstrumentInfo failed: ' + error.message)
        throw error
    }
}

module.exports.getInstrumentInfo = getInstrumentInfo

const setTPSL = async ({ positionIdx, stopLoss, symbol, takeProfit }) => {
    // positionIdx: "0",
    // symbol: "SOLUSDT",
    // slTriggerBy: "LastPrice",
    // stopLoss: "21.97",
    // takeProfit: "22.56",
    // tpTriggerBy: "LastPrice",

    /** 0-one-way, 1-buy side, 2-sell side */
    try {
        const slTriggerBy = 'LastPrice'
        const tpTriggerBy = 'LastPrice'
        const r = await client.setTPSL(
            takeProfit
                ? {
                      positionIdx,
                      slTriggerBy,
                      stopLoss,
                      symbol,
                      takeProfit,
                      tpTriggerBy,
                  }
                : {
                      positionIdx,
                      slTriggerBy,
                      stopLoss,
                      symbol,
                  }
        )
        if (r.retCode !== 0) {
            throw new Error(JSON.stringify(r))
        }
        return r
    } catch (error) {
        logger.error('TRAIL setTPSL failed: ' + error.message)
        throw error
    }
}

const calcSlPercentage = (side, entryPriceString, percentage) => {
    const entryPrice = Number(entryPriceString)
    if (side === 'Buy') {
        return entryPrice - (entryPrice * percentage) / 100
    } else {
        return entryPrice + (entryPrice * percentage) / 100
    }
}

const setPricePrecisionByTickSize = (price, tickSize) => {
    const precision = tickSize.toString().split('.')[1].length - 1
    return Number(price).toFixed(precision)
}

const handlePosSl = async (pos, p, instrumentInfo, currPNL) => {
    const tickSize = instrumentInfo.priceFilter.tickSize
    const currentSl = pos.stopLoss
    const newSlRaw = calcSlPercentage(pos.side, pos.entryPrice, p)
    const newSl = setPricePrecisionByTickSize(newSlRaw, tickSize)

    if (
        (pos.side === 'Buy' && Number(newSl) > Number(currentSl)) ||
        (pos.side === 'Sell' && Number(newSl) < Number(currentSl))
    ) {
        await setTPSL({
            positionIdx: pos.positionIdx,
            symbol: pos.symbol,
            stopLoss: newSl,
        })

        logger.info('Trailing SL changed ' + currPNL + ' ' + pos.symbol)
    }
}

const handlePosition = async (pos) => {
    try {
        if (pos.size > 0) {
            const [ticker, instrument] = await Promise.allSettled([
                getSymbolTicker(pos.symbol),
                getInstrumentInfo({ category: 'linear', symbol: pos.symbol }),
            ])
            const tickerInfo = ticker.value
            const instrumentInfo = instrument.value

            const currPNL = pnl(pos.side, pos.entryPrice, tickerInfo.lastPrice)

            const thresholds = [
                { min: 0.2, max: 0.4, value: -0.1 },
                { min: 0.4, max: 0.5, value: -0.2 },
                { min: 0.5, max: 0.75, value: -0.29 },
                { min: 0.75, max: 1, value: -0.5 },
                { min: 1, max: 1.5, value: -0.75 },
                { min: 1.5, max: 2, value: -1 },
                { min: 2, max: 3, value: -1.5 },
            ]

            const percentage = thresholds.find(
                (threshold) =>
                    currPNL >= threshold.min && currPNL < threshold.max
            )?.value

            if (percentage) {
                await handlePosSl(pos, percentage, instrumentInfo, currPNL)
            }
        }
    } catch (error) {
        logger.error('handlePosition failed: ' + pos.symbol + error.message)
    }
}

const getPositions = async (settleCoin) => {
    try {
        const { retMsg, result } = await client.getPositions({
            settleCoin,
        })
        if (retMsg !== 'OK') {
            throw new Error('getPositions failed ' + retMsg)
        }
        const res = result.list
        for (const pos of res) {
            await handlePosition(pos)
            await sleep(333)
        }
    } catch (e) {
        logger.error('Trail getPosition request failed: ' + e.message)
        throw e
    }
}

module.exports.getPositions = getPositions

const flow = async () => {
    try {
        await getPositions('USDC')
    } catch (e) {
        logger.error('flow request failed: ' + e.message)
        throw e
    }
}

let minute
function engine() {
    if (new Date().getMinutes() !== minute) {
        minute = new Date().getMinutes()
    }

    const interval = 3000
    setTimeout(() => {
        flow()
            .then(() => {
                engine()
            })
            .catch((e) => {
                logger.error('trail engine fail: ', e)
                engine()
            })
    }, interval)
}

module.exports.engine = engine
