// const reqs = require('./reqs.js')
// const logger = require('../logger.js')
const R = require('ramda')
const { USDMClient } = require('binance');
const API_KEY = "123";
const API_SECRET = "123";
const { sleep } = require('../utils.js')
// FuturesSymbolExchangeInfo
// client.getExchangeInfo()
//     .then((result) => {
//         console.log('getExchangeInfo result: ', result.symbols.length);
//         // const r = Object.groupBy(result, ({ pair }) => pair);
//         // console.log('r: ', r);
//     })
//     .catch((err) => {
//         console.error('getExchangeInfo error: ', err);
//     });

// client
//     .getBalance()
//     .then((result) => {
//         // console.log('getBalance result: ', result);
//         const usdt = result.find((item) => item.asset === 'USDT');
//         console.log('usdt: ', usdt);
//     })
//     .catch((err) => {
//         console.error('getBalance error: ', err);
//     });

// client
//     .get24hrChangeStatistics()
//     .then((result) => {
//         console.log('get24hrChangeStatististics inverse futures result: ', result);
//     })
//     .catch((err) => {
//         console.error('get24hrChangeStatististics inverse futures error: ', err);
//     });


const client = new USDMClient({
    api_key: API_KEY,
    api_secret: API_SECRET,
});

async function openPosition(
    side,
    pair,
    qty,
    takeProfitPrice,
    stopLossPrice) {
    try {
        // const result = await client.futuresLeverage({
        //     symbol: pair,
        //     leverage: leverage,
        // });
        // add limit sell order
        // const result = await client.futuresOrder({
        //     symbol: pair,
        //     side: 'SELL',
        //     type: 'LIMIT',
        //     quantity: qty,
        //     price: takeProfitPrice,
        //     timeInForce: 'GTE_GTC',
        // });

        const oppositeSide = side.toUpperCase() === 'BUY' ? 'SELL' : 'BUY'

        const entryOrder = {
            // positionSide: "BOTH",
            quantity: String(qty),
            reduceOnly: "false",
            side: side.toUpperCase(),
            symbol: pair,
            type: "MARKET",
            // stopPrice: String(stopLossPrice),
        };



        const stopLossOrder = {
            positionSide: "BOTH",
            priceProtect: "TRUE",
            quantity: String(qty),
            side: oppositeSide,
            stopPrice: String(stopLossPrice),
            symbol: pair,
            timeInForce: "GTE_GTC",
            type: "STOP_MARKET",
            workingType: "MARK_PRICE",
            closePosition: "true",
            // reduceOnly: "true",
        };

        const takeProfitOrder = {
            symbol: pair,
            side: oppositeSide,
            type: 'LIMIT',
            quantity: String(qty / 3),
            price: String(takeProfitPrice),
            timeInForce: 'GTC',
            reduceOnly: "true",
        }

        const openedOrder = await client.submitMultipleOrders([
            entryOrder,
            stopLossOrder,
            takeProfitOrder,
        ])
        console.log('openedOrder result: ', JSON.stringify(openedOrder));
        R.pipe(
            R.filter(({ orderId }) => orderId),
            R.count(({ status }) => status),
        )

        /**
         close long 
{"symbol":"BTCUSDT","type":"MARKET","side":"SELL",
"quantity":0.003,"positionSide":"BOTH","leverage":52,
"isolated":false,"reduceOnly":true,"newOrderRespType":"RESULT",
"placeType":"position"}


         */
    } catch (error) {
        console.error('openedOrder error: ', error)
    }

}

async function signalsHandler1(signals) {

    // const exchangeInfo = await client.getExchangeInfo()

    // const p = R
    //     .pipe(
    //         R.filter(({ quoteAsset, contractType, pair }) =>
    //         (quoteAsset === 'USDT'
    //             && contractType === 'PERPETUAL'
    //             && pair.endsWith('USDT'))),
    //         R.groupBy(R.prop('pair')))
    //     (exchangeInfo.symbols)

    // console.log("symbols", p);
    // // console.log("symbols", Object.keys(p).length);

    await openPosition('BUY', 'BTCUSDT', 0.003, 30000, 27000)
    // needs IP
    const positions = await client.getPositions()

    // console.log("positions", positions)
    const activePositions = R.pipe(
        R.filter(({ positionAmt }) => Number(positionAmt) !== 0),
        R.map((pos) => R.mergeAll([
            pos,
            {
                positionAmt: Number(pos.positionAmt),
                entryPrice: Number(pos.entryPrice),
                breakEvenPrice: Number(pos.breakEvenPrice),
                markPrice: Number(pos.markPrice),
                unRealizedProfit: Number(pos.unRealizedProfit),
                liquidationPrice: Number(pos.liquidationPrice),
                leverage: Number(pos.leverage),
                notional: Number(pos.notional),
                theSide: Number(pos.positionAmt) > 0 ? 'LONG' : 'SHORT',
            }]))
    )(positions)

    /*

// Long position has positive positionAmt
activePositions [
{
symbol: 'BTCUSDT',
positionAmt: '0.001',
entryPrice: '28262.5',
breakEvenPrice: '28276.63125',
markPrice: '28262.50000000',
unRealizedProfit: '0.00000000',
liquidationPrice: '0',
leverage: '52',
maxNotionalValue: '250000',
marginType: 'cross',
isolatedMargin: '0.00000000',
isAutoAddMargin: 'false',
positionSide: 'BOTH',
notional: '28.26250000', // Amount in USDT
isolatedWallet: '0',
updateTime: 1697655913644
}
]

// Short position has negative positionAmt
activePositions [
{
symbol: 'BTCUSDT',
positionAmt: '-0.001',
entryPrice: '28246.3',
breakEvenPrice: '28232.17685',
markPrice: '28242.46972527',
unRealizedProfit: '0.00383027',
liquidationPrice: '137635.46133466',
leverage: '52',
maxNotionalValue: '250000',
marginType: 'cross',
isolatedMargin: '0.00000000',
isAutoAddMargin: 'false',
positionSide: 'BOTH',
notional: '-28.24246972', // Amount in USDT
isolatedWallet: '0',
updateTime: 1697656029874
}
]
*/
    console.log("activePositions", activePositions)

    /*

    const stats = await client.get24hrChangeStatistics()

    // https://www.tabnine.com/code/javascript/functions/ramda/sortBy
    const r = R.pipe(
        R.filter(({ symbol }) => p[symbol]),
        R.sortBy(({ quoteVolume }) => Number(quoteVolume)),
        R.reverse,
        (arr => arr.slice(0, 50)),
        // R.map(o => o.symbol),
    )(stats)


    R.forEach((pair) => {
        console.log(pair.symbol, Number(pair.quoteVolume).toFixed(2))
    }, r)
    */
}


// && (pair === 'BTCUSDT'
//                 || pair === 'ETHUSDT')



const signal = {
    open: 28270.0,
    baseline: 27331.154,
    startTime: "Tue Oct 17 04:00:00 UTC 2023",
    time: 1697515200000,
    ticker: "ADAUSDT",
    risk: 0.5,
    close: 28462.97,
    atrtp: 310.86519330144006,
    rex: 73.36357,
    volume: 6818.99624,
    resolution: "4h",
    high: 28475.82,
    atrsl: 660.5885357655601,
    sig: 1,
    sell: false,
    low: 28069.32,
    atr: 388.5814916268001,
    market: "BTCUSDT",
    tdfi: 0.79636,
    end: 1697529599999,
    exchange: "B"
}

// signalsHandler([signal]).catch((err) => {
//     console.error('signalsHandler error: ', err);
// });

// const averagePrice = R.pipe(
//     R.map(R.prop('price')),
//     sumPrices,
//     average
//   )(products);

async function signalHandler(signal, tickerInfo, positionInfo) {

    console.log('signal received: ', signal);
    console.log('einfo received: ', tickerInfo);
    console.log('position received: ', positionInfo);

    console.log('einfo received: ', tickerInfo[0].filters);
    const klines = await client.getKlines({
        symbol: signal.ticker,
        interval: '1m',
        limit: 1,
    });
    const lastPrice = Number(klines[0][4]);
    console.log(signal.ticker, lastPrice);
    // maybe use markPrice from positionInfo?


    // get the last price
    // const lastPrice = tickerInfo[0].lastPrice;
}

async function signalsHandler(signals) {
    const exchangeInfo = await client.getExchangeInfo();
    const exchangeInfoGrouped = R
        .pipe(
            R.filter(({ quoteAsset, contractType, pair }) =>
            (quoteAsset === 'USDT'
                && contractType === 'PERPETUAL'
                && pair.endsWith('USDT'))),
            R.groupBy(R.prop('pair')))
        (exchangeInfo.symbols);

    const positions = await client.getPositions()
    const activePositions = R.pipe(
        // R.filter(({ positionAmt }) => Number(positionAmt) !== 0),
        R.map((pos) => R.mergeAll([
            pos,
            {
                positionAmt: Number(pos.positionAmt),
                entryPrice: Number(pos.entryPrice),
                breakEvenPrice: Number(pos.breakEvenPrice),
                markPrice: Number(pos.markPrice),
                unRealizedProfit: Number(pos.unRealizedProfit),
                liquidationPrice: Number(pos.liquidationPrice),
                leverage: Number(pos.leverage),
                notional: Number(pos.notional),
                positionSide: Number(pos.positionAmt) > 0 ? 'Buy' : 'Sell',
            }])),
        R.groupBy(R.prop('symbol'))
    )(positions)

    // console.log("activePositions", activePositions)
    for (const sig of signals) {
        await signalHandler(
            sig,
            exchangeInfoGrouped[sig.ticker],
            activePositions[sig.ticker]
        );

        await sleep(1000); // seem to work
    }
    client.getAllOpenOrders()
}

signalsHandler([signal]).catch((err) => {
    console.error('signalsHandler error: ', err);
});
