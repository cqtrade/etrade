const { USDMClient } = require("binance");
const { sleep } = require("../utils.js");
const logger = require("../logger.js");

const client = new USDMClient(
  {
    api_key: "",
    api_secret: "",
  },
  {},
  true
);

const calculatePnl = (side, entryPrice, lastPrice) =>
  Math.floor(
    100 *
      ((100 *
        (side === "BUY" ? lastPrice - entryPrice : entryPrice - lastPrice)) /
        entryPrice)
  ) / 100;

const getSymbolTicker = async (symbol) => {
  try {
    const symbolPriceTicker = await client.getSymbolPriceTicker({ symbol });

    return symbolPriceTicker;
  } catch (error) {
    console.error("getSymbolPriceTicker failed: ", error);
    throw error;
  }
};

const getExchangeInfoForSymbol = async (symbol) => {
  try {
    const exchangeInfo = await client.getExchangeInfo();

    const symbolInfo = exchangeInfo.symbols.find(
      (info) => info.symbol === symbol
    );

    if (!symbolInfo) {
      throw new Error(`Symbol ${symbol} not found in exchange info`);
    }

    return symbolInfo;
  } catch (error) {
    console.error("getExchangeInfo failed: ", error);
    throw error;
  }
};

const getOpenOrders = async (symbol) => {
  try {
    const allOpenOrders = await client.getAllOpenOrders({ symbol });

    return allOpenOrders;
  } catch (error) {
    console.error("getAllOpenOrders failed", error);
  }
};

const getOpenOrdersByType = async (position, orderType) => {
  const openOrders = await getOpenOrders(position.symbol);

  return openOrders.filter(
    (order) => order.type === orderType && order.side !== position.side
  );
};

const getOpenTpOrders = async (position) =>
  getOpenOrdersByType(position, "TAKE_PROFIT_MARKET");

const getOpenSlOrders = async (position) =>
  getOpenOrdersByType(position, "STOP_MARKET");

const findLatestOrderByKey = (key, data) =>
  data.reduce(
    (currentLatestOrder, currentOrder) =>
      currentOrder[key] > currentLatestOrder[key]
        ? currentOrder
        : currentLatestOrder,
    data[0]
  );

const setPricePrecisionByTickSize = (price, tickSize) => {
  const precision = tickSize.toString().split(".")[1].length - 1;

  return Number(price).toFixed(precision);
};

const setTPSL = () => {
  // TODO: implement
};

const handleActivePosition = async (position) => {
  try {
    const { positionAmt, symbol } = position;

    if (positionAmt > 0) {
      const [ticker, exchangeInfo] = await Promise.allSettled([
        getSymbolTicker(symbol),
        getExchangeInfoForSymbol(symbol),
      ]);

      const lastPrice = ticker.value.price;
      const tickSize = exchangeInfo.value.filters.find(
        (filter) => filter.filterType === "PRICE_FILTER"
      ).tickSize;

      const currentPNL = calculatePnl(
        position.side,
        position.entryPrice,
        lastPrice
      );

      // Can there be more than 1 TP and SL order?
      const openTpOrders = await getOpenTpOrders(position);
      const openSlOrders = await getOpenSlOrders(position);

      // TODO: if for some reason there is no SL in place, set it

      let newSl;
      const entryPrice = Number(position.entryPrice);

      if (position.side === "BUY") {
        newSl = setPricePrecisionByTickSize(
          entryPrice + entryPrice * 0.002,
          tickSize
        );
      } else if (position.side === "SELL") {
        newSl = setPricePrecisionByTickSize(
          entryPrice - entryPrice * 0.002,
          tickSize
        );
      }

      const latestSlOrder = findLatestOrderByKey("time", openSlOrders);

      if (!openTpOrders.length && currentPNL > 0.25) {
        if (
          position.side === "BUY" &&
          Number(latestSlOrder.stopPrice) < Number(newSl)
        ) {
          // TODO: handle setting TP and SL
          logger.info("Strategy sl changed " + position.symbol + " " + newSl);
        }

        if (
          position.side === "Sell" &&
          Number(latestSlOrder.stopPrice) > Number(newSl)
        ) {
          // TODO: handle setting TP and SL
          logger.info("Strategy sl changed " + position.symbol + " " + newSl);
        }
      }
    }
  } catch (error) {
    logger.error(
      "trading handlePosition failed: " + position.symbol + error.message
    );
  }
};

const processActivePositions = async (activePositions) => {
  for (const position of activePositions) {
    await handleActivePosition(position);
    await sleep(500);
  }
};

const getAndProcessActivePositions = async () => {
  try {
    const positions = await client.getPositions();
    const activePositions = positions
      .filter(({ positionAmt }) => Number(positionAmt) !== 0)
      .map((position) => ({
        ...position,
        positionAmt: Number(position.positionAmt),
        entryPrice: Number(position.entryPrice),
        breakEvenPrice: Number(position.breakEvenPrice),
        markPrice: Number(position.markPrice),
        unRealizedProfit: Number(position.unRealizedProfit),
        liquidationPrice: Number(position.liquidationPrice),
        leverage: Number(position.leverage),
        notional: Number(position.notional),
        side: Number(position.positionAmt) > 0 ? "BUY" : "SELL",
      }));

    await processActivePositions(activePositions);
  } catch (error) {
    logger.error("trading getPositions request failed: " + error.message);
    throw error;
  }
};

const flow = async () => {
  try {
    await getAndProcessActivePositions();
  } catch (error) {
    logger.error("flow request failed: " + error.message);
    throw error;
  }
};

const engine = async () => {
  const interval = 2000;

  try {
    await flow();
  } catch (e) {
    logger.error("positions engine flow failed: " + e.message);
  }

  setTimeout(engine, interval);
};

module.exports.engine = engine;
