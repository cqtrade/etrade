import pandas as pd


def mom_long(df: pd.DataFrame, **kwargs) -> pd.DataFrame:
    return (
        (df['l_plus_di'] > df['l_adxr'])
        & (df['l_adxr1'] < df['l_adxr'])
        & (df['l_adxr'] > kwargs['l_adx_low'])
        & (df['l_adxr'] < kwargs['l_adx_high'])
    )


def mom_short(df: pd.DataFrame, **kwargs) -> pd.DataFrame:
    return (
        (df['s_minus_di'] > df['s_adxr'])
        & (df['s_adxr1'] < df['s_adxr'])
        & (df['s_adxr'] > kwargs['s_adx_low'])
        & (df['s_adxr'] < kwargs['s_adx_high'])
    )
