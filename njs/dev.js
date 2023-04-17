require('dotenv').config()

const trade = require('./src/tradebb/index.js')

function atrTp1Calc1(close, atr, tp1Coef) {
    const atrTp1 = atr * tp1Coef;
    const diff = parseFloat(100 * (1 - (close - atrTp1) / close));
    const diffAllowedPerc = 0.3;

    if (diff < diffAllowedPerc) {
        return (close * diffAllowedPerc) / 100;
    }
    return atrTp1;
}

function atrTp1Calc(close, atrTp1) {
    const diff = parseFloat(100 * (1 - (close - atrTp1) / close));
    console.log(diff);
    const minDiffAllowedPerc = 0.3;

    if (diff < minDiffAllowedPerc) {
        return (close * minDiffAllowedPerc) / 100;
    }
    return atrTp1;
}


/*
(comment
    (let [close 100
          atr 1
          atr-tp1 0.06]
      (atr-tp1-calc close atr atr-tp1))
1)
*/
const close = 100;
const atr = 0.1;
const atrTp1Coef = 4;
const atrTp1 = atr * atrTp1Coef;
const tp = atrTp1Calc(close, atrTp1);
console.log(tp);
