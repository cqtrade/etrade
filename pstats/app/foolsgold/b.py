from pybit.unified_trading import HTTP
import pandas as pd
import talib as ta
import time
# from envvars import evars
from reqs import close_position, limit_order, market_order_with_sl, trailing_stop_order
from utils import set_price_precision_by_tick_size, calc_qty_precision, find_pos_size

adx_low = 23
adx_high = 26
equity = 100
risk = 30


class Bybit:
    def __init__(self, api_key, api_secret, clogger=print):
        # api_key = evars.envdict['foolsgold_key'],
        # api_secret = evars.envdict['foolsgold_secret'],
        # api_key = api_key
        # api_secret = api_secret
        self.clogger = clogger
        self.api = HTTP(
            testnet=False,
            api_key=api_key,
            api_secret=api_secret,
        )

    def get_kline_data(self, symbol):
        # https://bybit-exchange.github.io/docs/v5/market/kline
        kline_data = self.api.get_kline(
            category="linear",
            symbol=symbol,
            interval=60,
            limit=1000

        )["result"]

        # Getting 0 element from list
        data_list = kline_data["list"]
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

        df = df[:-1]

        self.df = df
        self.df['low1'] = self.df['low'].shift(1)
        self.df['high1'] = self.df['high'].shift(1)
        return df

    def add_atr(self, period=14):
        self.df['atr'] = ta.ATR(self.df['high'],
                                self.df['low'],
                                self.df['close'],
                                timeperiod=period)

    def add_dmi(self, period=14):
        self.df['adx'] = ta.ADX(self.df['high'],
                                self.df['low'],
                                self.df['close'],
                                timeperiod=period)

        self.df['adx1'] = self.df['adx'].shift(1)

        self.df['adxr'] = ta.ADXR(self.df['high'],
                                  self.df['low'],
                                  self.df['close'],
                                  timeperiod=period)
        self.df['adxr1'] = self.df['adxr'].shift(1)

        self.df['plus_di'] = ta.PLUS_DI(self.df['high'],
                                        self.df['low'],
                                        self.df['close'],
                                        timeperiod=period)

        self.df['minus_di'] = ta.MINUS_DI(self.df['high'],
                                          self.df['low'],
                                          self.df['close'],
                                          timeperiod=period)

    def signals(self):
        self.df['buy'] = ((self.df['plus_di'] > self.df['adx'])
                          & (self.df['adx'] > adx_low)
                          & (self.df['adx'] < adx_high)
                          & (self.df['adx'] > self.df['adx1'])
                          & (self.df['adxr'] > self.df['adxr1']))
        self.df['sell'] = ((self.df['minus_di'] > self.df['adx'])
                           & (self.df['adx'] > adx_low)
                           & (self.df['adx'] < adx_high)
                           & (self.df['adx'] > self.df['adx1'])
                           & (self.df['adxr'] > self.df['adxr1']))

    def get_latest_signal(self):
        return self.df.iloc[-1]

    def prepare_sl(self, symbol):
        latest_signal = self.get_latest_signal()
        if latest_signal['buy']:
            sl = latest_signal['low1'] - latest_signal['atr']
            return sl
        elif latest_signal['sell']:
            sl = latest_signal['high1'] + latest_signal['atr']
            return sl

    def prepare_sl_sell(self, symbol):
        latest_signal = self.get_latest_signal()
        if latest_signal['sell']:
            sl = latest_signal['high1'] + latest_signal['atr']
            return sl

    def get_signals(self, symbol):
        self.get_kline_data(symbol)
        self.add_atr()
        self.add_dmi()
        self.signals()
        return self

    def get_position(self, symbol):
        position = self.api.get_positions(
            category="linear",
            symbol=symbol
        )

        # Buy or Sell or ""
        side = position["result"]["list"][0]["side"]
        size = position["result"]["list"][0]["size"]

        return side, size

    def sell(self, symbol):
        [side, size] = self.get_position(symbol)
        if side == "Sell":
            return

        if side == "Buy":
            close_position(self.api, symbol, "Sell", size)

        instrument = self.api.get_instruments_info(
            category="linear", symbol=symbol)["result"]["list"][0]

        ticker = self.api.get_tickers(category="linear", symbol=symbol)[
            "result"]["list"][0]

        tick_size = instrument["priceFilter"]["tickSize"]
        print("tick_size", tick_size)
        last_price = float(ticker["lastPrice"])
        print("last_price", last_price)

        sl = max(self.df.iloc[-1]['high'], self.df.iloc[-1]['high1'])

        sl_price = float(set_price_precision_by_tick_size(sl, tick_size))
        print("sl_price", sl_price)

        [pos_size, qty_step, min_qty] = find_pos_size(
            instrument, risk, sl_price, last_price, equity)

        print("final position_size", pos_size)

        res = market_order_with_sl(
            self.api, symbol, "Sell", pos_size, sl_price)
        print(res)
        tp = last_price - self.df.iloc[-1]['atr'] * 1
        tp_price = float(set_price_precision_by_tick_size(tp, tick_size))
        print("tp_price", tp_price)
        tp_qty = calc_qty_precision(
            pos_size/3, qty_step) if pos_size/3 > min_qty else min_qty

        print("tp_qty", tp_qty)

        res = limit_order(self.api, symbol, "Buy", tp_qty, tp_price)
        print(res)

        trailing_stop = last_price - tp_price
        trailing_stop = set_price_precision_by_tick_size(
            trailing_stop, tick_size)

        res = trailing_stop_order(self.api, symbol, tp_price, trailing_stop)
        print(res)
        self.clogger(f"Short {symbol}")

    def buy(self, symbol):
        [side, size] = self.get_position(symbol)
        if side == "Buy":
            return

        if side == "Sell":
            close_position(self.api, symbol, "Buy", size)

        instrument = self.api.get_instruments_info(
            category="linear", symbol=symbol)["result"]["list"][0]

        ticker = self.api.get_tickers(category="linear", symbol=symbol)[
            "result"]["list"][0]

        tick_size = instrument["priceFilter"]["tickSize"]
        print("tick_size", tick_size)
        last_price = float(ticker["lastPrice"])
        print("last_price", last_price)

        sl = min(self.df.iloc[-1]['low'], self.df.iloc[-1]['low1'])

        sl_price = float(set_price_precision_by_tick_size(sl, tick_size))
        print("sl_price", sl_price)

        [pos_size, qty_step, min_qty] = find_pos_size(
            instrument, risk, sl_price, last_price, equity)

        print("final position_size", pos_size)

        res = market_order_with_sl(self.api, symbol, "Buy", pos_size, sl_price)

        print(res)
        tp = last_price + self.df.iloc[-1]['atr'] * 1
        tp_price = float(set_price_precision_by_tick_size(tp, tick_size))
        print("tp_price", tp_price)
        tp_qty = calc_qty_precision(
            pos_size/3, qty_step) if pos_size/3 > min_qty else min_qty

        print("tp_qty", tp_qty)

        res = limit_order(self.api, symbol, "Sell", tp_qty, tp_price)

        print(res)

        trailing_stop = tp_price - last_price
        trailing_stop = set_price_precision_by_tick_size(
            trailing_stop, tick_size)

        res = trailing_stop_order(self.api, symbol, tp_price, trailing_stop)

        print(res)
        self.clogger(f"Long {symbol}")

    def run(self, symbols="SOLUSDT,SUIUSDT"):
        symbols = symbols.split(",")
        for symbol in symbols:
            self.get_signals(symbol)
            latest_signal = self.get_latest_signal()
            print(symbol)
            print(latest_signal)

            if latest_signal['buy']:
                self.buy(symbol)
            elif latest_signal['sell']:
                self.sell(symbol)
            time.sleep(1)


def bootstrap(api_key, api_secret, clogger, symbols="BTCUSDT,SOLUSDT,SUIUSDT,ETHUSDT"):
    b = Bybit(api_key, api_secret, clogger)
    b.run(symbols=symbols)
    print("Foolsgold run done!")


symbol = "SOLUSDT"
b = Bybit("", "", print)
df = b.get_signals(symbol).df
# print(df)
b.buy(symbol)
# b.sell(symbol)
