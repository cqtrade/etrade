const { ContractClient } = require('bybit-api')
const { sleep } = require('../utils.js')
const logger = require('../logger.js')

const key = process.env.API_KEY;
const secret = process.env.API_SECRET;

const client = new ContractClient({
  key,
  secret,
  strict_param_validation: true,
});

function getCurrentTime() {
  const d = new Date();
  return `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
}

const pnl = (side, avgEntry, lastPrice) => {
  if (side === 'Buy') {
    return ((Math.floor(100 * (100 * (lastPrice - avgEntry) / avgEntry))) / 100);
  } else {
    return ((Math.floor(100 * (100 * (avgEntry - lastPrice) / avgEntry))) / 100);
  }
}

const getActiveOrders = async (symbol) => {
  try {
    const { retMsg, result } = await client.getActiveOrders({ symbol });
    // if (retMsg !== 'OK') {
    //   throw new Error('getKline failed ' + retMsg);
    // }

    return result.list;
  } catch (error) {
    console.error('getActiveOrders failed: ', error);
    throw error;
  }
};

const hasActiveLimitTpOrders = async (position) => {
  const activeOrders = await getActiveOrders(position.symbol);
  const activeLimitTPOrders = activeOrders
    .filter((order) => {
      return order.orderType === 'Limit'
        && order.side !== position.side;
    });
  return activeLimitTPOrders;
}

const getSymbolTicker = async (symbol) => {
  try {
    const { retMsg, result } = await client.getSymbolTicker('', symbol);
    if (retMsg !== 'OK') {
      throw new Error('getKline failed ' + retMsg);
    }

    const [tickerInfo] = result.list;
    return tickerInfo;
  } catch (error) {
    console.error('getSymbolTicker failed: ', error);
    throw error;
  }
};

module.exports.getSymbolTicker = getSymbolTicker;

const getInstrumentInfo = async ({ category, symbol }) => {
  try {
    const { retMsg, result } = await client.getInstrumentInfo({
      category,
      symbol,
    });
    if (retMsg !== 'OK') {
      throw new Error('getInstrumentInfo failed ' + retMsg);
    }
    const [instrumentInfo] = result.list;
    return instrumentInfo;
  } catch (error) {
    console.error('getInstrumentInfo failed: ', error);
    throw error;
  }
};

module.exports.getInstrumentInfo = getInstrumentInfo;

const setTPSL = async ({
  positionIdx,
  stopLoss,
  symbol,
  takeProfit,
}) => {
  // positionIdx: "0",
  // symbol: "SOLUSDT",
  // slTriggerBy: "LastPrice",
  // stopLoss: "21.97",
  // takeProfit: "22.56",
  // tpTriggerBy: "LastPrice",

  /** 0-one-way, 1-buy side, 2-sell side */
  try {
    const slTriggerBy = 'LastPrice';
    const tpTriggerBy = 'LastPrice';
    const r = await client.setTPSL(
      takeProfit
        ? {
          positionIdx,
          slTriggerBy,
          stopLoss: String(stopLoss),
          symbol,
          takeProfit: String(takeProfit),
          tpTriggerBy,
        }
        : {
          positionIdx,
          slTriggerBy,
          stopLoss: String(stopLoss),
          symbol,
        }
    );
    if (r.retCode !== 0) {
      throw new Error(JSON.stringify(r));
    }
    return r;
  } catch (error) {
    console.error('trading setTPSL failed: ', error);
    throw error;
  }
};

const calcSlPercentage = (side, entryPriceString, percentage) => {
  let entryPrice = Number(entryPriceString)
  if (side === 'Buy') {
    return entryPrice - (entryPrice * percentage / 100);
  } else {
    return entryPrice + (entryPrice * percentage / 100);
  }
};

const setPricePrecisionByTickSize = (price, tickSize) => {
  const precision = tickSize.toString().split('.')[1].length - 1;
  return Number(price).toFixed(precision);
}

const handlePosSl = async (pos, p, instrumentInfo) => {
  const tickSize = instrumentInfo.priceFilter.tickSize;
  const currentSl = pos.stopLoss;
  const newSlRaw = calcSlPercentage(pos.side, pos.entryPrice, p)
  const newSl = setPricePrecisionByTickSize(newSlRaw, tickSize);

  if (
    (pos.side === 'Buy' && Number(newSl) > Number(currentSl))
    ||
    (pos.side === 'Sell' && Number(newSl) < Number(currentSl))
  ) {

    await setTPSL({
      positionIdx: pos.positionIdx,
      symbol: pos.symbol,
      stopLoss: newSl,
    });

    logger.info('Trading positions SL changed ' + pos.symbol);
  }
};

function calcStepSize(qty, stepSize) {
  return Math.floor(Number(qty) / Number(stepSize)) * Number(stepSize);
}

const handlePosition = async (pos) => {
  try {
    if (pos.size > 0) {

      const [ticker, instrument] = await Promise.allSettled([
        getSymbolTicker(pos.symbol),
        getInstrumentInfo({ category: 'linear', symbol: pos.symbol }),
      ]);
      const tickerInfo = ticker.value;
      const instrumentInfo = instrument.value;

      const currPNL = pnl(pos.side, pos.entryPrice, tickerInfo.lastPrice);

      const activeTpOrders = await hasActiveLimitTpOrders(pos)
      let newSl
      const entryPrice = Number(pos.entryPrice)
      if (pos.side === 'Buy') {
        newSl = setPricePrecisionByTickSize((entryPrice + entryPrice * 0.002), instrumentInfo.priceFilter.tickSize)
      } else if (pos.side === 'Sell') {
        newSl = setPricePrecisionByTickSize((entryPrice - entryPrice * 0.002), instrumentInfo.priceFilter.tickSize)
      }

      if (
        !activeTpOrders.length
        && currPNL > 0.25
        && Number(pos.stopLoss) !== Number(newSl)
      ) {

        const r = await setTPSL({
          positionIdx: pos.positionIdx,
          symbol: pos.symbol,
          stopLoss: newSl,
        });

        logger.info('Strategy sl changed ' + pos.symbol + ' ' + newSl)
      }

    }
  } catch (error) {
    logger.error('trading handlePosition failed: ' + pos.symbol + error.message);
  }
}

const getPositions = async (settleCoin) => {
  try {
    const { retMsg, result } = await client.getPositions({
      settleCoin,
    });
    if (retMsg !== 'OK') {
      throw new Error('getPositions failed ' + retMsg);
    }
    const res = result.list;
    for (const pos of res) {
      await handlePosition(pos);
      await sleep(333);
    }
  } catch (e) {
    logger.error('trading getPositions request failed: ' + e.message);
    throw e;
  }
};

module.exports.getPositions = getPositions;


const flow = async () => {
  try {
    await getPositions('USDT');
  } catch (e) {
    logger.error('flow request failed: ' + e.message);
    throw e;
  }
}

// let minute;
function engine() {
  // if ((new Date()).getMinutes() !== minute) {
  //   minute = (new Date()).getMinutes();
  //   console.log('Tick positions', `:${minute}`);
  // }

  const interval = 1000;
  setTimeout(() => {
    flow()
      .then(() => {
        engine();
      })
      .catch(e => {
        logger.error('positions engine flow failed: ' + e.message);
        engine();
      });
  }, interval);
}

module.exports.engine = engine;
