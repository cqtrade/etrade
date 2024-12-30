from binance.um_futures import UMFutures
import pandas as pd


def latest_funding_rate():
    um_futures_client = UMFutures()
    symbols = ['SUIUSDT',
               'ADAUSDT',
               'DOGEUSDT',
               'SOLUSDT',
               'BNBUSDT',
               'XRPUSDT',
               'ETHUSDT',
               'BTCUSDT']

    df_fr = pd.DataFrame(columns=['symbol', 'fr', 'datetime'])

    for symbol in symbols:
        um_futures_fr = um_futures_client.funding_rate(symbol, limit=1)
        fr_df = pd.DataFrame(um_futures_fr)

        # change the funding rate to number
        fr_df['fundingRate'] = fr_df['fundingRate'].astype(float)

        fr_df['fr'] = fr_df['fundingRate']*100*365*3
        fr_df['datetime'] = pd.to_datetime(fr_df['fundingTime']/1000, unit='s')

        # get columns symbol and fr
        fr_df = fr_df[['symbol', 'fr', 'datetime']]
        # add rows to the empty DataFrame
        df_fr = pd.concat([fr_df, df_fr])

    # format the datetime to include date and hour:minute
    df_fr['datetime'] = df_fr['datetime'].dt.strftime('%Y-%m-%d %H')
    return df_fr.reset_index(drop=True)
