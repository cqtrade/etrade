import numpy as np
import talib
import vectorbt as vbt
import os
from multiprocessing.pool import Pool
import backtesting.indicators as inds


def work_signals(f, inputs):
    # this looks like engine code
    print(f"Available pools -1: {os.cpu_count() - 1}")

    results = []
    with Pool(os.cpu_count() - 1) as p:
        results = p.map(f, inputs)

    signals = []
    for symbol, entries, exits, short_entries, short_exits in results:
        signals.append(
            {
                "symbol": symbol,
                "entries": entries,
                "exits": exits,
                "short_entries": short_entries,
                "short_exits": short_exits,
            })

    return signals


def work_portfolios(f, inputs):
    results = []
    with Pool(os.cpu_count() - 1) as p:
        results = p.map(f, inputs)
    return results


def compute_portfolio_metrics(args):
    # symbol, ohlc_dict, entries, exits = args  # , short_entries, short_exits = args
    symbol, ohlc_dict, entries, exits, short_entries, short_exits = args
    print(f"Start computing portfolio metrics for {symbol}")
    closes = ohlc_dict["closes"]
    highs = ohlc_dict["highs"]
    lows = ohlc_dict["lows"]
    opens = ohlc_dict["opens"]
    # atr = talib.ATR(highs,
    #                 lows,
    #                 closes,
    #                 timeperiod=14)
    # atr_for_close = atr.values
    # atr_for_close = np.nan_to_num(
    #     atr_for_close, nan=np.nanmean(atr_for_close)/2)

    pf = vbt.Portfolio.from_signals(close=closes,
                                    entries=entries,
                                    exits=exits,
                                    short_entries=short_entries,
                                    short_exits=short_exits,
                                    init_cash=1000,
                                    fees=0.001,
                                    # 0.01 = 1%. 0.005 = 0.5%
                                    tp_stop=0.01,
                                    sl_stop=0.01,
                                    # freq="1D",
                                    # adjust_sl_func_nb=inds.adjust_sl_func_nb,
                                    # adjust_sl_args=tuple(
                                    #     np.array([atr_for_close])),

                                    # TODO this is fishy, commented out and it still got some sort of TP?
                                    # adjust_tp_func_nb=inds.adjust_tp_func_nb,
                                    # adjust_tp_args=tuple(
                                    #     np.array([atr_for_close])),

                                    open=opens,
                                    high=highs,
                                    low=lows,
                                    )
    total_return = pf.total_return().to_frame()
    win_rate = pf.trades.win_rate().to_frame()
    trade_count = pf.trades.count().to_frame()
    profit_factor = pf.trades.profit_factor().to_frame()
    max_drawdown = pf.max_drawdown().to_frame()
    expectancy = pf.trades.expectancy().to_frame()

    print(f"End computing portfolio metrics for {symbol}")
    return {
        "symbol": symbol,
        "total_return": total_return,
        "win_rate": win_rate,
        "count": trade_count,
        "profit_factor": profit_factor,
        "max_drawdown": max_drawdown,
        "expectancy": expectancy,
    }


def compute_portfolio(args):
    symbol, ohlc_dict, entries, exits, short_entries, short_exits = args
    print(f"Start computing portfolio for {symbol}")
    # print(entries)
    closes = ohlc_dict["closes"]
    highs = ohlc_dict["highs"]
    lows = ohlc_dict["lows"]
    opens = ohlc_dict["opens"]
    atr = talib.ATR(highs,
                    lows,
                    closes,
                    timeperiod=14)
    atr_for_close = atr.values
    atr_for_close = np.nan_to_num(
        atr_for_close, nan=np.nanmean(atr_for_close)/2)

    pf = vbt.Portfolio.from_signals(close=closes,
                                    entries=entries,
                                    exits=exits,
                                    short_entries=short_entries,
                                    short_exits=short_exits,
                                    init_cash=1000,
                                    fees=0.001,
                                    
                                    tp_stop=0.01,
                                    sl_stop=0.01,
                                    
                                    # freq="1D",
                                    # adjust_sl_func_nb=inds.adjust_sl_func_nb,
                                    # adjust_sl_args=tuple(
                                    #     np.array([atr_for_close])),

                                    # adjust_tp_func_nb=inds.adjust_tp_func_nb,
                                    # adjust_tp_args=tuple(
                                    #     np.array([atr_for_close])),

                                    open=opens,
                                    high=highs,
                                    low=lows,
                                    )
    print(f"End computing portfolio for {symbol}")

    return pf
