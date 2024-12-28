from binance.cm_futures import CMFutures
from binance.um_futures import UMFutures
from binance.spot import Spot
from pandas import DataFrame

def cash_and_carry(spot_price, futures_price, interest_rate, days_to_expiry):
    return (futures_price - spot_price) / spot_price * 365 / days_to_expiry - interest_rate

def future_premium(cm_futures_prices_df, spot_prices_df, symbol):
    # from cm_futures_prices_df get all tickers containing "BTC"
    btc_cm_futures_prices_df = cm_futures_prices_df[cm_futures_prices_df['symbol'].str.contains(
        symbol)]
    # print the row ith the highest price
    btc_cm_futures_prices_df_max = btc_cm_futures_prices_df[
        btc_cm_futures_prices_df['price'] == btc_cm_futures_prices_df['price'].max()]
    max_price = float(btc_cm_futures_prices_df['price'].max())
    btc_spot_prices_df = spot_prices_df[spot_prices_df['symbol'] == f"{
        symbol}USDT"]
    spot_price = float(btc_spot_prices_df['price'].values[0])
    # Get the difference between the max price and the spot price percentage
    percentage = (((max_price - spot_price) / spot_price) * 100) # - 0.4 # 0.4 is the tx fee
    # rount to 2 decimal places
    return btc_cm_futures_prices_df_max['symbol'].values[0], round(percentage, 2)

def get_stats():
    spot_client = Spot()
    cm_futures_client = CMFutures() # settled in cryptocurrency
    um_futures_client = UMFutures() # settled in USDT USDC
    spot_prices = spot_client.ticker_price()
    spot_prices_df = DataFrame(spot_prices)
    cm_futures_prices = cm_futures_client.ticker_price()
    cm_futures_prices_df = DataFrame(cm_futures_prices)
    cm_futures_prices_df
    # filter all symbols that end with number
    cm_futures_prices_df_n = cm_futures_prices_df[cm_futures_prices_df.symbol.str.contains(r'\d$')]
    cm_futures_prices_df_n['symbol'].values
    # split all values by usd and leav ethe first part
    cm_futures_prices_df_n['symbol'].str.split('USD').str[0].values
    
    # btc_cm_futures_prices_df = cm_futures_prices_df[cm_futures_prices_df['symbol'].str.contains("BTC")]
    # print the row ith the highest price
    # btc_cm_futures_prices_df_max = btc_cm_futures_prices_df[btc_cm_futures_prices_df['price'] == btc_cm_futures_prices_df['price'].max()]
    # max_price = float(btc_cm_futures_prices_df['price'].max())
    # btc_spot_prices_df = spot_prices_df[spot_prices_df['symbol'] == "BTCUSDT"]
    # spot_price = float(btc_spot_prices_df['price'].values[0])
    # Get the difference between the max price and the spot price percentage
    # percentage = ((max_price - spot_price) / spot_price) * 100
    
    cm_futures_prices = cm_futures_client.ticker_price()
    cm_futures_prices_df = DataFrame(cm_futures_prices)
    cm_futures_prices_df
    # filter all symbols that end with number
    cm_futures_prices_df_n = cm_futures_prices_df[cm_futures_prices_df.symbol.str.contains(
        r'\d$')]
    cm_futures_prices_df_n['symbol'].values
    # split all values by usd and leave the first part
    symbols = cm_futures_prices_df_n['symbol'].str.split('USD').str[0].values

    # create empty dataframe
    df_ = DataFrame(columns=['symbol', 'percentage'])
    for symbol in symbols:
        s, p = future_premium(cm_futures_prices_df, spot_prices_df, symbol)
        # append to the dataframe
        df_ = df_._append({'symbol': s, 'percentage': p}, ignore_index=True)

    # sort dataframe by percentage descending
    df_ = df_.sort_values(by='percentage', ascending=False)
    # remove duplicates
    df_ = df_.drop_duplicates()
    # reset index
    df_ = df_.reset_index(drop=True)

    return df_.reset_index(drop=True)
    
