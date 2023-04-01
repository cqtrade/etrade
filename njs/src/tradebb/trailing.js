const { ContractClient } = require('bybit-api')
const log = require('../log.js')

const key = process.env.API_KEY;
const secret = process.env.API_SECRET;

const client = new ContractClient({
  key,
  secret,
  strict_param_validation: true,
});

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

module.exports.sleep = sleep;

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

const getSymbolTicker = async (symbol) => {
  try {
    const { retMsg, result } = await client.getSymbolTicker('', symbol);
    if (retMsg !== 'OK') {
      throw new Error('getKline failed ' + retMsg);
    }

    const [tickerInfo] = result.list;
    return tickerInfo;
  } catch (error) {
    log.error('trailing getSymbolTicker failed: ' + error.message)
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
    log.error('trailing getInstrumentInfo failed: ' + error.message)
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
    );
    if (r.retCode !== 0) {
      throw new Error(JSON.stringify(r));
    }
    return r;
  } catch (error) {
    log.error('TRAIL setTPSL failed: ' + error.message);
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

const handlePosSl = async (pos, p, instrumentInfo, currPNL) => {
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

    log.info('Trailing SL changed ' + currPNL + ' ' + pos.symbol)
  }
};

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

      let p;
      if (currPNL >= 0.2 && currPNL < 0.4) {
        p = -0.1;
      } else if (currPNL >= 0.4 && currPNL < 0.5) {
        p = -0.2;
      } else if (currPNL >= 0.5 && currPNL < 0.75) {
        p = -0.29;
      } else if (currPNL >= 0.75 && currPNL < 1.0) {
        p = -0.5;
      } else if (currPNL >= 1.00 && currPNL < 1.5) {
        p = -0.75;
      } else if (currPNL >= 1.5 && currPNL < 2) {
        p = -1;
      } else if (currPNL >= 2 && currPNL < 3) {
        p = -1.5;
      } else if (currPNL >= 3 && currPNL < 4) {
        p = -2.5;
      } else if (currPNL >= 4 && currPNL < 5) {
        p = -3.5;
      } else if (currPNL >= 5 && currPNL < 6) {
        p = -4.5;
      } else if (currPNL >= 6 && currPNL < 7) {
        p = -5.5;
      }
      // >= 7 might make sense to add the real trailing stop?

      if (p) {
        await handlePosSl(pos, p, instrumentInfo, currPNL);
      }
    }
  } catch (error) {
    log.error('handlePosition failed: ' + pos.symbol + error.message);
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
    log.error('Trail getPosition request failed: ' + e.message);
    throw e;
  }
};

module.exports.getPositions = getPositions;


const flow = async () => {
  try {
    await getPositions('USDC');
  } catch (e) {
    console.error('flow request failed: ', e);
    log.error('flow request failed: ' + e.message);
    throw e;
  }

}

let minute;
function engine() {
  if ((new Date()).getMinutes() !== minute) {
    minute = (new Date()).getMinutes();
  }

  const interval = 333;
  setTimeout(() => {
    flow()
      .then(() => {
        engine();
      })
      .catch(e => {
        log.error('trail engine fail: ', e);
        engine();
      });
  }, interval);
}

module.exports.engine = engine;
