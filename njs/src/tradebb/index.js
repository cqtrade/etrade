const reqs = require('./reqs.js')
const log = require('../log.js')

const exampleBuy = {
    "sig": 1,
    "ticker": "BTCUSDT",
    "atrtp": "AtrTp",
    "atrsl": "AtrSl",
    "risk": 1,
    "exchange": "BB"
}

const exampleBuyExit = {
    "sig": -2,
    "ticker": "BTCUSDT",
    "atrtp": "AtrTp",
    "atrsl": "AtrSl",
    "risk": 1,
    "exchange": "BB"
}

const exampleSell = {
    "sig": -1,
    "ticker": "BTCUSDT",
    "atrtp": "AtrTp",
    "atrsl": "AtrSl",
    "risk": 1,
    "exchange": "BB"
}

function calculatePositionSize(
    risk,
    atrSl,
    lastPrice,
    equityUSD,
) {
    const close = lastPrice;
    const atrRiskPerc = (atrSl * 100) / close;
    const riskRatio = risk / atrRiskPerc;
    const equity = equityUSD / close;
    const positionSize = ((equity * riskRatio) / 100);
    return positionSize;
}

function calcStepSize(qty, stepSize) {
    return Math.floor(Number(qty) / Number(stepSize)) * Number(stepSize);
}

async function exitPosition(sig, position) {
    if (position.side === 'Buy') {
        const res = await reqs.submitOrder({
            side: "Sell",
            symbol: sig.ticker,
            qty: position.size,
            orderType: "Market",
            timeInForce: "PostOnly",
            closeOnTrigger: true,
        });

        return res;
    }

    if (position.side === 'Sell') {
        const res = await reqs.submitOrder({
            side: "Buy",
            symbol: sig.ticker,
            qty: position.size,
            orderType: "Market",
            timeInForce: "PostOnly",
            closeOnTrigger: true,
        });

        return res;
    }
}

async function sell(sig) {
    const [ticker, instrument] = await Promise.allSettled([
        reqs.getSymbolTicker(sig.ticker),
        reqs.getInstrumentInfo({ category: 'linear', symbol: sig.ticker }),
    ]);

    const lastPrice = Number(ticker.value.lastPrice);
    const tickSize = instrument.value.priceFilter.tickSize;

    log.debug('lastPrice', lastPrice)
    log.debug('tickSize', tickSize)
    log.debug('atrsl', sig.atrsl)
    log.debug('atrtp', sig.atrtp)
    const tp = lastPrice - sig.atrtp;
    const sl = lastPrice + sig.atrsl;
    log.debug('tp', tp)
    log.debug('sl', sl)
    const slPrice = reqs.setPricePrecisionByTickSize(sl, tickSize);
    const tpPrice = reqs.setPricePrecisionByTickSize(tp, tickSize);

    log.debug('slPrice', slPrice)
    log.debug('tpPrice', tpPrice)

    const equityUSD = 1000;
    const risk = 10;
    const atrSl = sig.atrsl;

    log.debug('instrument.value', instrument.value)

    let posSize = calculatePositionSize(
        risk,
        atrSl,
        lastPrice,
        equityUSD,
    )

    const qtyStep = instrument.value.lotSizeFilter.qtyStep;
    const qtyMin = instrument.value.lotSizeFilter.minTradingQty;

    posSize = calcStepSize(posSize, qtyStep)

    log.debug('posSize', posSize)
    if (posSize < (3 * qtyMin)) {
        posSize = (3 * qtyMin);
    }

    log.debug('posSize', posSize)

    let tpSize = calcStepSize(posSize / 3, qtyStep);
    if (tpSize < qtyMin) {
        tpSize = qtyMin;
    }

    log.debug('tpSize', tpSize)
    const res = await reqs.submitOrder({
        side: "Sell",
        symbol: sig.ticker,
        qty: String(posSize),
        orderType: "Market",
        timeInForce: "ImmediateOrCancel",
        stopLoss: String(slPrice),
        slTriggerBy: "LastPrice",
    });

    //log.debug(res, res)

    const res2 = await reqs.submitOrder({
        side: "Buy",
        symbol: sig.ticker,
        qty: String(tpSize),
        orderType: "Limit",
        timeInForce: "PostOnly",
        price: String(tpPrice),
        reduceOnly: true,
    });

    return [res, res2];
}

async function buy(sig) {
    const [ticker, instrument] = await Promise.allSettled([
        reqs.getSymbolTicker(sig.ticker),
        reqs.getInstrumentInfo({ category: 'linear', symbol: sig.ticker }),
    ]);

    const lastPrice = Number(ticker.value.lastPrice);
    const tickSize = instrument.value.priceFilter.tickSize;

    //log.debug('lastPrice', lastPrice)
    //log.debug('tickSize', tickSize)
    //log.debug('atrsl', sig.atrsl)
    //log.debug('atrtp', sig.atrtp)
    const tp = lastPrice + sig.atrtp;
    const sl = lastPrice - sig.atrsl;
    //log.debug('tp', tp)
    //log.debug('sl', sl)
    const slPrice = reqs.setPricePrecisionByTickSize(sl, tickSize);
    const tpPrice = reqs.setPricePrecisionByTickSize(tp, tickSize);

    //log.debug('slPrice', slPrice)
    //log.debug('tpPrice', tpPrice)

    const equityUSD = Number(process.env.EQUITY);
    const risk = sig.risk;
    const atrSl = sig.atrsl;

    log.debug('instrument.value', instrument.value)

    let posSize = calculatePositionSize(
        risk,
        atrSl,
        lastPrice,
        equityUSD,
    )

    const qtyStep = instrument.value.lotSizeFilter.qtyStep;
    const qtyMin = instrument.value.lotSizeFilter.minTradingQty;

    posSize = calcStepSize(posSize, qtyStep)

    log.debug('posSize', posSize)
    if (posSize < (3 * qtyMin)) {
        posSize = (3 * qtyMin);
    }

    log.debug('posSize', posSize)

    let tpSize = calcStepSize(posSize / 3, qtyStep);
    if (tpSize < qtyMin) {
        tpSize = qtyMin;
    }

    log.debug('tpSize', tpSize)
    const res = await reqs.submitOrder({
        side: "Buy",
        symbol: sig.ticker,
        qty: String(posSize),
        orderType: "Market",
        timeInForce: "ImmediateOrCancel",
        stopLoss: String(slPrice),
        slTriggerBy: "LastPrice",
    });

    //log.debug(res, res)

    const res2 = await reqs.submitOrder({
        side: "Sell",
        symbol: sig.ticker,
        qty: String(tpSize),
        orderType: "Limit",
        timeInForce: "PostOnly",
        price: String(tpPrice),
        reduceOnly: true,
    });

    return [res, res2];
}

// in check positions move sl only if no tp and profit pnl is at least 0.25
async function signalHandler(sig) {
    try {
        log.debug('signalHandler', sig);

        if (!(sig && sig === Object(sig) && sig.ticker)) {
            return;
        }

        log.debug(`signalHandler ${sig.ticker} ${sig.sig}`);

        const position = await reqs.getPosition(sig.ticker, 'USDT');

        log.debug('position', position)

        const side = position.side;

        if (sig.sig === 1 && side === 'None') {

            log.debug('buy', sig.ticker);
            await buy(sig);

        } else if (sig.sig === -1 && side === 'None') {

            log.debug('sell', sig.ticker);
            await sell(sig);

        } else if (sig.sig === -2 && side === 'Buy') {

            log.debug('buy exit', sig.ticker);
            await exitPosition(sig, position);

        } else if (sig.sig === 2 && side === 'Sell') {

            log.debug('sell exit', sig.ticker);
            await exitPosition(sig, position);

        } else if (sig.sig === 1 && side === 'Sell') {

            log.debug('exit sell and buy', sig.ticker);

        } else if (sig.sig === -1 && side === 'Buy') {

            log.debug('exit buy and sell', sig.ticker);

        }
    } catch (error) {
        log.debug('ERROR signalHandler', error)
    }
}

module.exports.signalHandler = signalHandler;
