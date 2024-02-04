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
        console.error('getSymbolTicker failed: ', error)
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
        console.error('getInstrumentInfo failed: ', error)
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
        return await client.setTPSL(
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
    } catch (error) {
        console.error('setTPSL failed: ', error)
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

module.exports.setPricePrecisionByTickSize = setPricePrecisionByTickSize

const handlePosSl = async (pos, p, instrumentInfo) => {
    const tickSize = instrumentInfo.priceFilter.tickSize
    const currentSl = pos.stopLoss
    const newSlRaw = calcSlPercentage(pos.side, pos.entryPrice, p)
    const newSl = setPricePrecisionByTickSize(newSlRaw, tickSize)

    if (
        (pos.side === 'Buy' && Number(newSl) > Number(currentSl)) ||
        (pos.side === 'Sell' && Number(newSl) < Number(currentSl))
    ) {
        console.log('currentSl !== newSl', currentSl, newSl)

        await setTPSL({
            positionIdx: pos.positionIdx,
            symbol: pos.symbol,
            stopLoss: newSl,
        })

        console.log('SL changed')
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

            logger.debug('handlePosition', {
                symbol: pos.symbol,
                pnl: currPNL,
                side: pos.side,
                size: pos.size,
                entryPrice: pos.entryPrice,
            })

            const thresholds = [
                { min: 0.4, max: 0.5, value: -0.2 },
                { min: 0.5, max: 0.75, value: -0.29 },
                { min: 0.75, max: 1.0, value: -0.5 },
                { min: 1.0, max: 1.5, value: -0.75 },
                { min: 1.5, max: 2.0, value: -1 },
                { min: 2.0, max: 3.0, value: -1.5 },
                { min: 3.0, max: 4.0, value: -2.5 },
                { min: 4.0, max: 5.0, value: -3.5 },
                { min: 5.0, max: 6.0, value: -4.5 },
                { min: 6.0, max: 7.0, value: -5.5 },
            ]

            const percentage = thresholds.find(
                (threshold) =>
                    currPNL >= threshold.min && currPNL < threshold.max
            )?.value

            if (percentage) {
                await handlePosSl(pos, percentage, instrumentInfo)
            }
        }
    } catch (error) {
        logger.error('handlePosition failed: ', pos.symbol, error)
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
        console.error('request failed: ', e)
        throw e
    }
}

module.exports.getPositions = getPositions

const getPosition = async (symbol, settleCoin) => {
    try {
        const { result } = await client.getPositions({
            symbol,
            settleCoin,
        })
        return result.list[0]
    } catch (e) {
        console.error('request failed: ', e)
        throw e
    }
}

module.exports.getPosition = getPosition

const submitOrder = async ({
    side,
    symbol,
    qty,
    orderType,
    timeInForce,
    stopLoss,
    slTriggerBy,
    price,
    reduceOnly,
}) => {
    try {
        const { retMsg, result } = await client.submitOrder({
            side,
            symbol,
            qty,
            orderType,
            timeInForce,
            stopLoss,
            slTriggerBy,
            price,
            reduceOnly,
        })
        if (retMsg !== 'OK') {
            throw new Error(
                'ERROR submitOrder ' + symbol + ' qty ' + qty + retMsg
            )
        }
        return result
    } catch (error) {
        console.error('submitOrder failed: ', error)
        throw error
    }
}

module.exports.submitOrder = submitOrder
