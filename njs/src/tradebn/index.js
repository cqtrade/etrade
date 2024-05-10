const { USDMClient } = require("binance");
const logger = require("../logger.js");
const { countDecimals, fixedDecimals } = require("../utils.js");
// eslint-disable-next-line no-unused-vars
const client = new USDMClient(
  {
    api_key: process.env.BN_API_KEY,
    api_secret: process.env.BN_API_SECRET,
  },
  {},
  true
);
// eslint-disable-next-line no-unused-vars
const calculatePositionSize = ({ risk, atrSl, lastPrice, equityUSD }) => {
  const slRisk = (atrSl * 100) / lastPrice;
  const equityLeverage = risk / slRisk;
  const posSizeUSD = equityUSD * equityLeverage;
  const positionSize = posSizeUSD / lastPrice;

  return {
    positionSize,
    equityLeverage,
    posSizeUSD,
  };
};
// eslint-disable-next-line no-unused-vars
const calculateQuantityPrecision = (qty, stepSize) => {
  const rawRes = Math.floor(Number(qty) / Number(stepSize)) * Number(stepSize);
  const decimals = countDecimals(stepSize);

  return fixedDecimals(rawRes, decimals);
};
// eslint-disable-next-line no-unused-vars
const exitPosition = async () => {
  // TODO: implement; see if closePosition from position-check can be extracted to shared reqs file and reused here
};
// eslint-disable-next-line no-unused-vars
const atrTp1Calc = (close, atrTp1) => {
  const diff = parseFloat(100 * (1 - (close - atrTp1) / close));
  const minDiffAllowedPerc = 0.3;

  if (diff < minDiffAllowedPerc) {
    return (close * minDiffAllowedPerc) / 100;
  }

  return atrTp1;
};

// eslint-disable-next-line no-unused-vars
const sell = async (signal) => {
  // TODO: implement
};

// eslint-disable-next-line no-unused-vars
const buy = async (signal) => {
  // TODO: implement
};

const signalHandler = async (signal) => {
  try {
    // TODO: implement
  } catch (error) {
    logger.error(`Signal handler execution failed: ${error.message}`);
  }
};

module.exports.signalHandler = signalHandler;
