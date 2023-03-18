const reqs = require('./reqs.js')
const log = require('../log.js')

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

    console.log('lastPrice', lastPrice)
    console.log('tickSize', tickSize)
    console.log('atrsl', sig.atrsl)
    console.log('atrtp', sig.atrtp)
    const tp = lastPrice - sig.atrtp;
    const sl = lastPrice + sig.atrsl;
    console.log('tp', tp)
    console.log('sl', sl)
    const slPrice = reqs.setPricePrecisionByTickSize(sl, tickSize);
    const tpPrice = reqs.setPricePrecisionByTickSize(tp, tickSize);

    console.log('slPrice', slPrice)
    console.log('tpPrice', tpPrice)

    const equityUSD = 1000;
    const risk = 10;
    const atrSl = sig.atrsl;

    console.log('instrument.value', instrument.value)

    let posSize = calculatePositionSize(
        risk,
        atrSl,
        lastPrice,
        equityUSD,
    )

    const qtyStep = instrument.value.lotSizeFilter.qtyStep;
    const qtyMin = instrument.value.lotSizeFilter.minTradingQty;

    posSize = calcStepSize(posSize, qtyStep)

    console.log('posSize', posSize)
    if (posSize < (3 * qtyMin)) {
        posSize = (3 * qtyMin);
    }

    console.log('posSize', posSize)

    let tpSize = calcStepSize(posSize / 3, qtyStep);
    if (tpSize < qtyMin) {
        tpSize = qtyMin;
    }

    console.log('tpSize', tpSize)
    const res = await reqs.submitOrder({
        side: "Sell",
        symbol: sig.ticker,
        qty: String(posSize),
        orderType: "Market",
        timeInForce: "ImmediateOrCancel",
        stopLoss: String(slPrice),
        slTriggerBy: "LastPrice",
    });

    //console.log(res, res)

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

    //console.log('lastPrice', lastPrice)
    //console.log('tickSize', tickSize)
    //console.log('atrsl', sig.atrsl)
    //console.log('atrtp', sig.atrtp)
    const tp = lastPrice + sig.atrtp;
    const sl = lastPrice - sig.atrsl;
    //console.log('tp', tp)
    //console.log('sl', sl)
    const slPrice = reqs.setPricePrecisionByTickSize(sl, tickSize);
    const tpPrice = reqs.setPricePrecisionByTickSize(tp, tickSize);

    //console.log('slPrice', slPrice)
    //console.log('tpPrice', tpPrice)

    const equityUSD = Number(process.env.EQUITY);
    const risk = sig.risk;
    const atrSl = sig.atrsl;

    console.log('instrument.value', instrument.value)

    let posSize = calculatePositionSize(
        risk,
        atrSl,
        lastPrice,
        equityUSD,
    )

    const qtyStep = instrument.value.lotSizeFilter.qtyStep;
    const qtyMin = instrument.value.lotSizeFilter.minTradingQty;

    posSize = calcStepSize(posSize, qtyStep)

    console.log('posSize', posSize)
    if (posSize < (3 * qtyMin)) {
        posSize = (3 * qtyMin);
    }

    console.log('posSize', posSize)

    let tpSize = calcStepSize(posSize / 3, qtyStep);
    if (tpSize < qtyMin) {
        tpSize = qtyMin;
    }

    console.log('tpSize', tpSize)
    const res = await reqs.submitOrder({
        side: "Buy",
        symbol: sig.ticker,
        qty: String(posSize),
        orderType: "Market",
        timeInForce: "ImmediateOrCancel",
        stopLoss: String(slPrice),
        slTriggerBy: "LastPrice",
    });

    //console.log(res, res)

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
        log.debug(`Signal ${sig.ticker} ${sig.sig}`);

        if (!(sig && sig === Object(sig) && sig.ticker)) {
            return;
        }

        console.log(`signalHandler ${sig.ticker} ${sig.sig}`);

        const position = await reqs.getPosition(sig.ticker, 'USDT');

        console.log('position', position)

        const side = position.side;

        if (sig.sig === 1 && side === 'None') {

            console.log('buy', sig.ticker);
            return await buy(sig);

        }

        if (sig.sig === -1 && side === 'None') {

            console.log('sell', sig.ticker);
            return await sell(sig);

        }

        if (sig.sig === -2 && side === 'Buy') {

            console.log('buy exit', sig.ticker);
            return await exitPosition(sig, position);

        }

        if (sig.sig === 2 && side === 'Sell') {

            console.log('sell exit', sig.ticker);
            return await exitPosition(sig, position);

        }

        if (sig.sig === 1 && side === 'Sell') {

            console.log('exit sell and buy', sig.ticker);
            return

        }

        if (sig.sig === -1 && side === 'Buy') {

            console.log('exit buy and sell', sig.ticker);
            return

        }
    } catch (error) {
        console.log('ERROR signalHandler', error)
    }
}

module.exports.signalHandler = signalHandler;
