const reqs = require('./reqs.js')
const logger = require('../logger.js')

function calculatePositionSize(
    risk,
    atrSl,
    lastPrice,
    equityUSD,
) {
    const slRisk = (atrSl * 100) / lastPrice;
    const equityLeverage = risk / slRisk;
    const posSizeUSD = equityUSD * equityLeverage;
    const positionSize = posSizeUSD / lastPrice;
    return {
        positionSize,
        equityLeverage,
        posSizeUSD
    };
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

    const tp = lastPrice - sig.atrtp;
    const sl = lastPrice + sig.atrsl;

    const slPrice = reqs.setPricePrecisionByTickSize(sl, tickSize);
    const tpPrice = reqs.setPricePrecisionByTickSize(tp, tickSize);

    const equityUSD = Number(process.env.EQUITY);
    const risk = sig.risk;
    const atrSl = sig.atrsl;

    const {
        positionSize,
        equityLeverage,
        posSizeUSD,
    } = calculatePositionSize(
        risk,
        atrSl,
        lastPrice,
        equityUSD,
    );

    let posSize = positionSize;

    const qtyStep = instrument.value.lotSizeFilter.qtyStep;
    const qtyMin = instrument.value.lotSizeFilter.minTradingQty;

    let posSizeB4Step = posSize;

    posSize = calcStepSize(posSize, qtyStep)

    let posSizeB4MinCmp = posSize
    if (posSize < (3 * qtyMin)) {
        posSize = (3 * qtyMin);
    }

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

    const res2 = await reqs.submitOrder({
        side: "Buy",
        symbol: sig.ticker,
        qty: String(tpSize),
        orderType: "Limit",
        timeInForce: "PostOnly",
        price: String(tpPrice),
        reduceOnly: true,
    });

    const tpSizeUSD = tpSize * lastPrice;
    setTimeout(() => {
        logger.info(
            JSON.stringify({
                side: "Sell",
                symbol: sig.ticker,
                risk,
                atrSl,
                lastPrice,
                equityUSD,
                posSizeB4Step,
                posSizeB4MinCmp,
                posSize,
                tpSize,
                equityLeverage,
                posSizeUSD,
                tpSizeUSD,
                tp,
                sl,
            }))
    }, 0)

    return [res, res2];
}

async function buy(sig) {
    const [ticker, instrument] = await Promise.allSettled([
        reqs.getSymbolTicker(sig.ticker),
        reqs.getInstrumentInfo({ category: 'linear', symbol: sig.ticker }),
    ]);

    const lastPrice = Number(ticker.value.lastPrice);
    const tickSize = instrument.value.priceFilter.tickSize;

    const tp = lastPrice + sig.atrtp;
    const sl = lastPrice - sig.atrsl;

    const slPrice = reqs.setPricePrecisionByTickSize(sl, tickSize);
    const tpPrice = reqs.setPricePrecisionByTickSize(tp, tickSize);

    const equityUSD = Number(process.env.EQUITY);
    const risk = sig.risk;
    const atrSl = sig.atrsl;

    const {
        positionSize,
        equityLeverage,
        posSizeUSD,
    } = calculatePositionSize(
        risk,
        atrSl,
        lastPrice,
        equityUSD,
    );

    let posSize = positionSize;

    const qtyStep = instrument.value.lotSizeFilter.qtyStep;
    const qtyMin = instrument.value.lotSizeFilter.minTradingQty;

    let posSizeB4Step = posSize;
    posSize = calcStepSize(posSize, qtyStep)

    let posSizeB4MinCmp = posSize
    if (posSize < (3 * qtyMin)) {
        posSize = (3 * qtyMin);
    }

    let tpSize = calcStepSize(posSize / 3, qtyStep);
    if (tpSize < qtyMin) {
        tpSize = qtyMin;
    }

    const res = await reqs.submitOrder({
        side: "Buy",
        symbol: sig.ticker,
        qty: String(posSize),
        orderType: "Market",
        timeInForce: "ImmediateOrCancel",
        stopLoss: String(slPrice),
        slTriggerBy: "LastPrice",
    });

    const res2 = await reqs.submitOrder({
        side: "Sell",
        symbol: sig.ticker,
        qty: String(tpSize),
        orderType: "Limit",
        timeInForce: "PostOnly",
        price: String(tpPrice),
        reduceOnly: true,
    });

    const tpSizeUSD = tpSize * lastPrice;
    setTimeout(() => {
        logger.info(
            JSON.stringify({
                side: "Buy",
                symbol: sig.ticker,
                risk,
                atrSl,
                lastPrice,
                equityUSD,
                posSizeB4Step,
                posSizeB4MinCmp,
                posSize,
                tpSize,
                equityLeverage,
                posSizeUSD,
                tpSizeUSD,
                tp,
                sl,
            }))
    }, 0)

    return [res, res2];
}

// in check positions move sl only if no tp order and profit pnl is at least 0.25%
async function signalHandler(sig) {
    try {
        logger.info(`Signal ${sig.ticker} ${sig.sig}`);

        if (!(sig && sig === Object(sig) && sig.ticker)) {
            return;
        }

        const position = await reqs.getPosition(sig.ticker, 'USDT');

        const side = position.side;

        if (sig.sig === 1 && side === 'None') {
            setTimeout(async () => {
                console.log('buy', sig.ticker);
                logger.info(JSON.stringify(sig));
            }, 0);

            return await buy(sig);

        }

        if (sig.sig === -1 && side === 'None') {
            setTimeout(async () => {
                console.log('sell', sig.ticker);
                logger.debug(JSON.stringify(sig));
            }, 0);

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
            setTimeout(async () => {
                logger.info('exit short and long' + sig.ticker)
                logger.debug(JSON.stringify(sig))
            }, 0);

            await exitPosition(sig, position)
            return await buy(sig)
        }

        if (sig.sig === -1 && side === 'Buy') {
            setTimeout(async () => {
                logger.info('exit long and short' + sig.ticker)
                logger.debug(JSON.stringify(sig))
            }, 0);

            await exitPosition(sig, position)
            return await sell(sig)
        }
    } catch (error) {
        logger.error(`ERROR signalHandler ${error.message}`)
    }
}

module.exports.signalHandler = signalHandler;
