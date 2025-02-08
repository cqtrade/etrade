import pandas as pd

# see for more https://stackoverflow.com/questions/1769403/what-is-the-purpose-and-use-of-kwargs


def mom_long(df: pd.DataFrame, **kwargs) -> pd.DataFrame:
    return ((df['plus_di'] > df['adx'])
            & (df['adx'] > kwargs['adx_low'])
            & (df['adx'] < kwargs['adx_high'])
            & (df['adx'] > df['adx1'])
            & (df['adxr'] > df['adxr1']))


def mom_short(df: pd.DataFrame, **kwargs) -> pd.DataFrame:
    return ((df['minus_di'] > df['adx'])
            & (df['adx'] > kwargs['adx_low'])
            & (df['adx'] < kwargs['adx_high'])
            & (df['adx'] > df['adx1'])
            & (df['adxr'] > df['adxr1']))
