import numpy as np
from numba import njit
import vectorbt as vbt
import os
from multiprocessing.pool import Pool
import talib
import backtesting.indicators as inds


def params_long() -> dict:
    adx_p = np.arange(14, 14 + 1, step=1, dtype=int)
    adx_low = np.arange(22, 24 + 1, step=1)
    adx_high = np.arange(25, 30 + 1, step=1)

    # tdfi_p = np.arange(10, 20 + 1, step=5, dtype=int)
    # tdfi_level = np.arange(10, 100 + 1, step=10) / 100
    # rex_p = np.arange(10, 20 + 1, step=5, dtype=int)
    # rex_sig_p = np.arange(10, 20 + 1, step=5, dtype=int)

    permutations = (
        len(adx_p)
        * len(adx_low)
        * len(adx_high)
        # * len(tdfi_p)
        # * len(tdfi_level)
        # * len(rex_p)
        # * len(rex_sig_p)
    )
    print(f"Number of permutations params_long: {permutations}")
    return {
        "adx_p": adx_p,
        "adx_low": adx_low,
        "adx_high": adx_high,
        # "tdfi_p": tdfi_p,
        # "tdfi_level": tdfi_level,
        # "rex_p": rex_p,
        # "rex_sig_p": rex_sig_p,
    }


def signals_breakout_long(
    closes,
    highs,
    lows,
    opens,
    adx_p,
    adx_low,
    adx_high,
    # tdfi_p,
    # tdfi_level,
    # rex_p,
    # rex_sig_p,
):
    signal = np.full(closes.shape, np.nan)
    adx = talib.ADX(highs, lows, closes, timeperiod=adx_p)
    adxr = talib.ADXR(highs, lows, closes, timeperiod=adx_p)
    plus_di = talib.PLUS_DI(highs, lows, closes, timeperiod=adx_p)
    minus_di = talib.MINUS_DI(highs, lows, closes, timeperiod=adx_p)

    # ntdf = inds.tdfi_nb(closes, tdfi_p)
    # rexs = inds.rex_nb(closes, highs, lows, opens, rex_p)
    # rex_sigs = inds.rex_sig_nb(rexs, rex_sig_p)

    for idx in range(len(closes)):
        if idx < 53:
            signal[idx] = 0
            continue

        # buy_tdfi = inds.crossover_array_scalar_nb(
        #     ntdf, tdfi_level, idx
        # )

        buy = (
            adx[idx-1] < adx_low
            and plus_di[idx] > adx[idx]
            and adx[idx] > adx_low
            and adx[idx] < adx_high
            and adxr[idx-1] < adxr[idx]
        )
        # exit_buy = inds.crossunder_array_array_nb(
        #     rexs, rex_sigs, idx
        # )

        if buy:
            signal[idx] = 1
        # elif exit_buy:
        #     signal[idx] = -2
        else:
            signal[idx] = 0

    return signal


def compute_signals_long(args: tuple):
    symbol, ohlc_dict, params = args

    print(f"Start computing signals for {symbol}")
    indicator = vbt.IndicatorFactory(
        class_name="Long",
        short_name="long",
        input_names=[
            "closes",
            "highs",
            "lows",
            "opens",
        ],
        param_names=[
            "adx_p",
            "adx_low",
            "adx_high",
            # "tdfi_p",
            # "tdfi_level",
            # "rex_p",
            # "rex_sig_p",
        ],
        output_names=["value"]).from_apply_func(
        signals_breakout_long,
        adx_p=2,
        adx_low=20,
        adx_high=20,
        # tdfi_p=2,
        # tdfi_level=0.5,
        # rex_p=10,
        # rex_sig_p=10,
        to_2d=False
    )
    closes = ohlc_dict["closes"]
    highs = ohlc_dict["highs"]
    lows = ohlc_dict["lows"]
    opens = ohlc_dict["opens"]
    res = indicator.run(
        closes,
        highs,
        lows,
        opens,
        adx_p=params["adx_p"],
        adx_low=params["adx_low"],
        adx_high=params["adx_high"],
        # tdfi_p=params["tdfi_p"],
        # tdfi_level=params["tdfi_level"],
        # rex_p=params["rex_p"],
        # rex_sig_p=params["rex_sig_p"],
        param_product=True
    )

    entries = res.value == 1
    exits = res.value == -2
    short_entries = res.value == 888
    short_exits = res.value == 888

    print(f"End computing signals for {symbol}")
    return symbol, entries, exits, short_entries, short_exits
