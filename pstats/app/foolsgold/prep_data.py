import pandas as pd
import talib as ta


def create_df(data_list):
    df = pd.DataFrame(data_list,
                      columns=["timestamp",
                               "open",
                               "high",
                               "low",
                               "close",
                               "volume",
                               "turnover"])
    df = df.astype({
        "timestamp": int,
        "open": float,
        "high": float,
        "low": float,
        "close": float,
        "volume": float,
        "turnover": float,
    })
    df = df.sort_values("timestamp", ascending=True)
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    # df["timestamp"] = df["timestamp"].dt.tz_localize(
    #     "UTC").dt.tz_convert("Europe/Tallinn")
    df = df.set_index("timestamp")

    # Remove the current candle
    df = df[:-1]

    df['low1'] = df['low'].shift(1)
    df['high1'] = df['high'].shift(1)
    return df


def add_atr(df, period=14):
    df['atr'] = ta.ATR(df['high'],
                       df['low'],
                       df['close'],
                       timeperiod=period)
    return df


def add_dmi(df, period=14):
    df['adx'] = ta.ADX(df['high'],
                       df['low'],
                       df['close'],
                       timeperiod=period)

    df['adx1'] = df['adx'].shift(1)

    df['adxr'] = ta.ADXR(df['high'],
                         df['low'],
                         df['close'],
                         timeperiod=period)

    df['adxr1'] = df['adxr'].shift(1)

    df['plus_di'] = ta.PLUS_DI(df['high'],
                               df['low'],
                               df['close'],
                               timeperiod=period)

    df['minus_di'] = ta.MINUS_DI(df['high'],
                                 df['low'],
                                 df['close'],
                                 timeperiod=period)
    return df


# def heikin_ashi(df):
#     df["ha_close"] = (df['open'] + df['high'] + df['low'] + df['close']) / 4
#     df["ha_open"] = (df['open'].shift(1) + df['close'].shift(1)) / 2
#     df["ha_open"].iloc[0] = df['open'].iloc[0]  # Set the first value
#     df["ha_high"] = df[['high', 'open', 'close']].max(axis=1)
#     df["ha_low"] = df[['low', 'open', 'close']].min(axis=1)
#     return df


def prepare_df(data_list):
    df = create_df(data_list)
    df = add_atr(df)
    df = add_dmi(df)
    # df = heikin_ashi(df)
    return df


# heikin ashi for numba
# https://stackoverflow.com/questions/40613480/heiken-ashi-using-pandas-python

