import pandas as pd
from backtesting.engine import work_signals, compute_portfolio_metrics, work_portfolios, compute_portfolio

import warnings
warnings.simplefilter('ignore')


def compact_all_medians(
    symbols,
    interval,
    params,
    compute_signals,
):
    ohlc_dict = {}
    count_bars = 0
    job_signals_long_inputs = []
    for symbol in symbols:
        df = pd.read_csv('../pdata/' + symbol + '_' + interval + '.csv')
        df.rename(columns={'timestamp': 'Date'}, inplace=True)

        df.set_index('Date', inplace=True)
        df.index = pd.to_datetime(df.index)

        closes = pd.Series(df['close'])
        highs = pd.Series(df['high'])
        lows = pd.Series(df['low'])
        opens = pd.Series(df['open'])
        volumes = pd.Series(df['volume'])
        ohlc_dict[symbol] = {
            "closes": closes,
            "highs": highs,
            "lows": lows,
            "opens": opens,
            "volumes": volumes,
        }
        count_bars = len(closes)
        job_signals_long_inputs.append((symbol, ohlc_dict[symbol], params))

    signals_long_responses = work_signals(
        compute_signals,
        job_signals_long_inputs,
    )

    job_portfolios_long_inputs = []
    for signals_long_response in signals_long_responses:
        symbol = signals_long_response['symbol']
        entries = signals_long_response['entries']
        exits = signals_long_response['exits']
        short_entries = signals_long_response['short_entries']
        short_exits = signals_long_response['short_exits']
        job_portfolios_long_inputs.append((
            symbol,
            ohlc_dict[symbol],
            entries,
            exits,
            short_entries,
            short_exits,
        ))

    portfolio_metrics = work_portfolios(compute_portfolio_metrics,
                                        job_portfolios_long_inputs)
    metrics = [
        "total_return",
        "win_rate",
        "count",
        "profit_factor",
        "max_drawdown",
        "expectancy",
    ]
    dict_l_results = {}
    for metric in metrics:
        dict_l_results[metric] = []
    dict_l_results
    for portfolio_metric in portfolio_metrics:
        symbol = portfolio_metric['symbol']
        for metric in metrics:
            dict_l_results[metric].append(portfolio_metric[metric])

    # print(dict_l_results.keys())
    metric = 'total_return'
    medians = []
    for metric in metrics:
        combined = pd.concat(dict_l_results[metric])
        median = combined.groupby(
            level=dict_l_results[metric][0].index.names
        ).median().sort_values(by=metric, ascending=False)
        medians.append(median)

    return pd.concat(medians, axis=1), ohlc_dict, count_bars


def compact_best_medians(
    dfc,
    symbols,
    ohlc_dict,
    compute_signals,
):
    dfc = dfc.dropna()
    cols = dfc.index.names
    # print(cols)
    # drop index
    dfc = dfc.reset_index()
    # dfc.co
    params_best = {}
    direction = 'long'
    for col in cols:
        # remove prefix long_
        col_i = col.replace(f'{direction}_', '')
        params_best[col_i] = dfc[col].unique()

    params_best

    job_signals_best_inputs = []
    for symbol in symbols:
        ohlc_sym = ohlc_dict[symbol]
        job_signals_best_inputs.append(
            (symbol, ohlc_sym, params_best))

    job_signals_best_responses = work_signals(
        compute_signals,
        job_signals_best_inputs,
    )

    pf_dict = {}
    pf_list = []
    for symbol_signal in job_signals_best_responses:
        symbol = symbol_signal['symbol']
        # print(symbol_signal.keys())
        pf = compute_portfolio(
            (symbol,
             ohlc_dict[symbol],
             symbol_signal['entries'],
             symbol_signal['exits'],
             symbol_signal['short_entries'],
             symbol_signal['short_exits'],)
        )
        pf_dict[symbol] = pf
        total_return = pf.total_return().to_frame()
        win_rate = pf.trades.win_rate().to_frame()
        trade_count = pf.trades.count().to_frame()
        profit_factor = pf.trades.profit_factor().to_frame()
        max_drawdown = pf.max_drawdown().to_frame()
        expectancy = pf.trades.expectancy().to_frame()
        pf_list.append({
            "symbol": symbol,
            "total_return": total_return,
            "win_rate": win_rate,
            "count": trade_count,
            "profit_factor": profit_factor,
            "max_drawdown": max_drawdown,
            "expectancy": expectancy,
        })

    metrics = [
        "total_return",
        "win_rate",
        "count",
        "profit_factor",
        "max_drawdown",
        "expectancy",
    ]
    dict_results = {}
    for metric in metrics:
        dict_results[metric] = []

    for pf_detail in pf_list:
        symbol = pf_detail['symbol']
        for metric in metrics:
            dict_results[metric].append(pf_detail[metric])

    # print(dict_results.keys())

    medians = []
    for metric in metrics:
        combined = pd.concat(dict_results[metric])
        median = combined.groupby(
            level=dict_results[metric][0].index.names
        ).median().sort_values(by=metric, ascending=False)
        medians.append(median)

    joined_orig_df = pd.concat(medians, axis=1)

    return joined_orig_df, pf_dict
