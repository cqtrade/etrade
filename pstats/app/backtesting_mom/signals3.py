import numpy as np
# from numba import njit
import vectorbt as vbt
# import os
# from multiprocessing.pool import Pool
import talib
# import backtesting.indicators as inds


def params_long() -> dict:
    adx_p = np.arange(14, 22 + 1, step=2)
    adx_low = np.arange(18, 24 + 1, step=2)
    adx_high = np.arange(30, 42 + 1, step=4)

    fastperiod = np.arange(8, 20 + 1, step=4)
    slowperiod = np.arange(22, 34 + 1, step=4)
    signalperiod = np.arange(6, 12 + 1, step=3)

    # tdfi_p = np.arange(10, 20 + 1, step=5, dtype=int)
    # tdfi_level = np.arange(10, 100 + 1, step=10) / 100
    # rex_p = np.arange(10, 20 + 1, step=5, dtype=int)
    # rex_sig_p = np.arange(10, 20 + 1, step=5, dtype=int)

    permutations = (
        len(adx_p)
        * len(adx_low)
        * len(adx_high)
        * len(fastperiod)
        * len(slowperiod)
        * len(signalperiod)
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
        "fastperiod": fastperiod,
        "slowperiod": slowperiod,
        "signalperiod": signalperiod,
        # "tdfi_p": tdfi_p,
        # "tdfi_level": tdfi_level,
        # "rex_p": rex_p,
        # "rex_sig_p": rex_sig_p,
    }


def params_short() -> dict:
    adx_p = np.arange(14, 22 + 1, step=2)
    adx_low = np.arange(18, 24 + 1, step=2)
    adx_high = np.arange(30, 42 + 1, step=4)

    fastperiod = np.arange(8, 20 + 1, step=4)
    slowperiod = np.arange(22, 34 + 1, step=4)
    signalperiod = np.arange(6, 12 + 1, step=3)
    # tdfi_p = np.arange(10, 20 + 1, step=5, dtype=int)
    # tdfi_level = np.arange(10, 100 + 1, step=10) / 100
    # rex_p = np.arange(10, 20 + 1, step=5, dtype=int)
    # rex_sig_p = np.arange(10, 20 + 1, step=5, dtype=int)

    permutations = (
        len(adx_p)
        * len(adx_low)
        * len(adx_high)
        * len(fastperiod)
        * len(slowperiod)
        * len(signalperiod)
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
        "fastperiod": fastperiod,
        "slowperiod": slowperiod,
        "signalperiod": signalperiod,
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
    fastperiod,
    slowperiod,
    signalperiod,
    # tdfi_p,
    # tdfi_level,
    # rex_p,
    # rex_sig_p,
):
    signal = np.full(closes.shape, np.nan)
    adx = talib.ADX(highs, lows, closes, timeperiod=adx_p)
    # adxr = talib.ADXR(highs, lows, closes, timeperiod=adx_p)
    plus_di = talib.PLUS_DI(highs, lows, closes, timeperiod=adx_p)
    minus_di = talib.MINUS_DI(highs, lows, closes, timeperiod=adx_p)

    # ntdf = inds.tdfi_nb(closes, tdfi_p)
    # rexs = inds.rex_nb(closes, highs, lows, opens, rex_p)
    # rex_sigs = inds.rex_sig_nb(rexs, rex_sig_p)

    # signal line is slower compared to macd line
    macd, macd_signal, _ = talib.MACD(
        closes,
        fastperiod=fastperiod,
        slowperiod=slowperiod,
        signalperiod=signalperiod,
    )

    for idx in range(len(closes)):
        if idx < 53:
            signal[idx] = 0
            continue

        # buy_tdfi = inds.crossover_array_scalar_nb(
        #     ntdf, tdfi_level, idx
        # )

        buy = (
            plus_di[idx] > minus_di[idx]
            and adx[idx-1] < adx_low
            and adx[idx] > adx_low
            and adx[idx] < adx_high
            and macd[idx] > macd_signal[idx]
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


def signals_breakout_short(
    closes,
    highs,
    lows,
    opens,
    adx_p,
    adx_low,
    adx_high,
    fastperiod,
    slowperiod,
    signalperiod,
    # tdfi_p,
    # tdfi_level,
    # rex_p,
    # rex_sig_p,
):
    signal = np.full(closes.shape, np.nan)
    adx = talib.ADX(highs, lows, closes, timeperiod=adx_p)
    # adxr = talib.ADXR(highs, lows, closes, timeperiod=adx_p)
    plus_di = talib.PLUS_DI(highs, lows, closes, timeperiod=adx_p)
    minus_di = talib.MINUS_DI(highs, lows, closes, timeperiod=adx_p)

    # ntdf = inds.tdfi_nb(closes, tdfi_p)
    # rexs = inds.rex_nb(closes, highs, lows, opens, rex_p)
    # rex_sigs = inds.rex_sig_nb(rexs, rex_sig_p)

    # signal line is slower compared to macd line
    macd, macd_signal, _ = talib.MACD(
        closes,
        fastperiod=fastperiod,
        slowperiod=slowperiod,
        signalperiod=signalperiod,
    )

    for idx in range(len(closes)):
        if idx < 53:
            signal[idx] = 0
            continue

        # buy_tdfi = inds.crossover_array_scalar_nb(
        #     ntdf, tdfi_level, idx
        # )

        sell = (
            minus_di[idx] > plus_di[idx]
            and adx[idx-1] < adx_low
            and adx[idx] > adx_low
            and adx[idx] < adx_high
            and macd[idx] < macd_signal[idx]
        )
        # exit_buy = inds.crossunder_array_array_nb(
        #     rexs, rex_sigs, idx
        # )

        if sell:
            signal[idx] = -1
        # elif exit_sell:
        #     signal[idx] = 2
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
            "fastperiod",
            "slowperiod",
            "signalperiod",
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
        fastperiod=10,
        slowperiod=10,
        signalperiod=10,
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
        fastperiod=params["fastperiod"],
        slowperiod=params["slowperiod"],
        signalperiod=params["signalperiod"],
        # tdfi_p=params["tdfi_p"],
        # tdfi_level=params["tdfi_level"],
        # rex_p=params["rex_p"],
        # rex_sig_p=params["rex_sig_p"],
        param_product=True
    )

    entries = res.value == 1
    exits = res.value == -2
    short_entries = res.value == -1
    short_exits = res.value == 2

    print(f"End computing signals for {symbol}")
    return symbol, entries, exits, short_entries, short_exits


def compute_signals_short(args: tuple):
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
            "fastperiod",
            "slowperiod",
            "signalperiod",
            # "tdfi_p",
            # "tdfi_level",
            # "rex_p",
            # "rex_sig_p",
        ],
        output_names=["value"]).from_apply_func(
        signals_breakout_short,
        adx_p=2,
        adx_low=20,
        adx_high=20,
        fastperiod=10,
        slowperiod=10,
        signalperiod=10,
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
        fastperiod=params["fastperiod"],
        slowperiod=params["slowperiod"],
        signalperiod=params["signalperiod"],
        # tdfi_p=params["tdfi_p"],
        # tdfi_level=params["tdfi_level"],
        # rex_p=params["rex_p"],
        # rex_sig_p=params["rex_sig_p"],
        param_product=True
    )

    entries = res.value == 1
    exits = res.value == -2
    short_entries = res.value == -1
    short_exits = res.value == 2

    print(f"End computing signals for {symbol}")
    return symbol, entries, exits, short_entries, short_exits
