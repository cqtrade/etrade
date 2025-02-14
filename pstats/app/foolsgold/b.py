from pybit.unified_trading import HTTP
import time
from foolsgold.strategies import mom_long, mom_short
from foolsgold.prep_data import prepare_df
from foolsgold.reqs import close_position, limit_order, market_order_with_sl, trailing_stop_order
from foolsgold.utils import set_price_precision_by_tick_size, calc_qty_precision, find_pos_size

adx_low = 23
l_adx_low = 16
s_adx_low = 26
adx_high = 26
l_adx_high = 36
s_adx_high = 36

equity = 100
risk = 30


class Bybit:
    def __init__(self, api_key, api_secret, clogger=print):
        self.clogger = clogger
        self.api = HTTP(
            testnet=False,
            api_key=api_key,
            api_secret=api_secret,
        )

    def prepare_df(self, symbol):
        # https://bybit-exchange.github.io/docs/v5/market/kline
        data_list = self.api.get_kline(
            category="linear",
            symbol=symbol,
            interval=60,
            limit=100,
        )["result"]["list"]
        self.df = prepare_df(data_list)
        return self

    def signals(self, **kwargs):
        if kwargs["strategy"] == "mom":
            self.df['buy'] = mom_long(self.df, **kwargs)
            self.df['sell'] = mom_short(self.df, **kwargs)

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

        # sl = max(self.df.iloc[-1]['high'], self.df.iloc[-1]['high1'])
        sl = last_price + last_price*0.01

        sl_price = float(set_price_precision_by_tick_size(sl, tick_size))
        print("sl_price", sl_price)

        [pos_size, qty_step, min_qty] = find_pos_size(
            instrument, risk, sl_price, last_price, equity)

        print("final position_size", pos_size)

        res = market_order_with_sl(
            self.api, symbol, "Sell", pos_size, sl_price)
        print(res)

        # tp = last_price - self.df.iloc[-1]['atr'] * 1

        tp = last_price - last_price*0.005
        tp_price = float(set_price_precision_by_tick_size(tp, tick_size))
        print("tp_price", tp_price)
        tp_qty = calc_qty_precision(
            pos_size/3, qty_step) if pos_size/3 > min_qty else min_qty

        print("tp_qty", tp_qty)

        res = limit_order(self.api, symbol, "Buy", tp_qty, tp_price)

        print(res)

        trailing_stop = set_price_precision_by_tick_size(
            last_price - tp_price,
            tick_size,
        )

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

        # sl = min(self.df.iloc[-1]['low'], self.df.iloc[-1]['low1'])
        sl = last_price - last_price*0.01

        sl_price = float(set_price_precision_by_tick_size(sl, tick_size))
        print("sl_price", sl_price)

        [pos_size, qty_step, min_qty] = find_pos_size(
            instrument, risk, sl_price, last_price, equity)

        print("final position_size", pos_size)

        res = market_order_with_sl(self.api, symbol, "Buy", pos_size, sl_price)

        print(res)

        # tp = last_price + self.df.iloc[-1]['atr'] * 1
        tp = last_price + last_price*0.005

        tp_price = float(set_price_precision_by_tick_size(tp, tick_size))
        print("tp_price", tp_price)
        tp_qty = calc_qty_precision(
            pos_size/3, qty_step) if pos_size/3 > min_qty else min_qty

        print("tp_qty", tp_qty)

        res = limit_order(self.api, symbol, "Sell", tp_qty, tp_price)

        print(res)

        trailing_stop = set_price_precision_by_tick_size(
            tp_price - last_price,
            tick_size,
        )

        res = trailing_stop_order(self.api, symbol, tp_price, trailing_stop)

        print(res)
        self.clogger(f"Long {symbol}")

    def run(self, symbols="SOLUSDT,SUIUSDT"):
        symbols = symbols.split(",")
        for symbol in symbols:
            symbol = symbol.strip()
            self.prepare_df(symbol)
            self.signals(strategy="mom",
                         l_adx_high=l_adx_high,
                         s_adx_high=s_adx_high,
                         l_adx_low=l_adx_low,
                         s_adx_low=s_adx_low,
                         )
            latest_signal = self.df.iloc[-1]

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


# FOOLSGOLD_KEY = ""
# FOOLSGOLD_SECRET = ""

# symbol = "ETHUSDT"
# b = Bybit(FOOLSGOLD_KEY, FOOLSGOLD_SECRET, print)
# b.prepare_df(symbol)
# b.signals(strategy="mom",
#           l_adx_high=l_adx_high,
#           s_adx_high=s_adx_high,
#           l_adx_low=l_adx_low,
#           s_adx_low=s_adx_low,)
# print(b.df)
# b.buy(symbol)
# b.sell(symbol)
# bootstrap(
#     FOOLSGOLD_KEY,
#     FOOLSGOLD_SECRET,
#     print,
#     symbols="BTCUSDT,SOLUSDT",
# )
