from pybit.unified_trading import HTTP
import pandas as pd
import talib as ta
import time
from envvars import evars

adx_low = 23
adx_high = 26
equity = 100
risk = 30


def fixed_decimals(num, decimal_places):
    return round(num, decimal_places)


def count_decimals(num):
    num_as_string = str(num)
    # Check if the number has a decimal point
    if '.' in num_as_string:
        return len(num_as_string.split('.')[1])
    return 0


def calc_qty_precision(qty, step_size):
    raw_res = (qty / step_size) * step_size
    decimals = count_decimals(step_size)
    res = fixed_decimals(raw_res, decimals)
    return res


def calculate_position_size(risk, sl_price, last_price, equity_usd):
    sl_risk = (sl_price * 100) / last_price
    equity_leverage = risk / sl_risk
    pos_size_usd = equity_usd * equity_leverage
    position_size = pos_size_usd / last_price
    return {
        "position_size": float(position_size),
        "equity_leverage": float(equity_leverage),
        "pos_size_usd": float(pos_size_usd)
    }


def set_price_precision_by_tick_size(price, tick_size):
    precision = len(str(tick_size).split('.')[1]) - 1
    return f"{price:.{precision}f}"


class Bybit:
    def __init__(self):
        api_key = evars.envdict['foolsgold_key'],
        api_secret = evars.envdict['foolsgold_secret'],
        api_key = api_key
        api_secret = api_secret

        self.instance = HTTP(
            testnet=False,
            api_key=api_key,
            api_secret=api_secret,
        )

    def get_kline_data(self, symbol):
        # https://bybit-exchange.github.io/docs/v5/market/kline
        kline_data = self.instance.get_kline(
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
        df["timestamp"] = df["timestamp"].dt.tz_localize(
            "UTC").dt.tz_convert("Europe/Tallinn")
        df = df.set_index("timestamp")
        # TODO: Remove last row
        # df = df[:-1]
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
        position = self.instance.get_positions(
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
            res = self.instance.place_order(
                category="linear",
                symbol=symbol,
                side="Sell",
                order_type="Market",
                qty=size,
                time_in_force="GoodTillCancel",
                close_on_trigger=True
            )

        instrument = self.instance.get_instruments_info(
            category="linear", symbol=symbol)["result"]["list"][0]

        ticker = self.instance.get_tickers(category="linear", symbol=symbol)[
            "result"]["list"][0]

        tick_size = instrument["priceFilter"]["tickSize"]
        print("tick_size", tick_size)
        last_price = float(ticker["lastPrice"])
        print("last_price", last_price)

        sl = max(self.df.iloc[-1]['high'], self.df.iloc[-1]['high1'])

        sl_price = float(set_price_precision_by_tick_size(sl, tick_size))
        print("sl_price", sl_price)

        posdict = calculate_position_size(
            risk,
            sl_price,
            last_price,
            equity)
        position_size = posdict["position_size"]

        qty_step = instrument["lotSizeFilter"]["qtyStep"]
        qty_step_parts = qty_step.split(".")
        qty_step = float(qty_step) if len(
            qty_step_parts) > 1 else int(qty_step)
        print("qty_step", qty_step)

        min_qty = instrument["lotSizeFilter"]["minOrderQty"]
        min_qty_parts = min_qty.split(".")
        min_qty = float(min_qty) if len(min_qty_parts) > 1 else int(min_qty)
        print("minOrderQty", min_qty)

        print(position_size)
        pos_size = position_size if position_size > (
            3 * min_qty) else 3 * min_qty
        pos_size = calc_qty_precision(pos_size, qty_step)
        print("final position_size", pos_size)

        res = self.instance.place_order(
            category="linear",
            symbol=symbol,
            side="Sell",
            order_type="Market",
            qty=str(pos_size),
            time_in_force="ImmediateOrCancel",
            stop_loss=str(sl_price),
            sl_trigger_by="LastPrice",
        )
        print(res)
        tp = last_price - self.df.iloc[-1]['atr'] * 2
        tp_price = float(set_price_precision_by_tick_size(tp, tick_size))
        print("tp_price", tp_price)
        tp_qty = calc_qty_precision(
            pos_size/3, qty_step) if pos_size/3 > min_qty else min_qty

        print("tp_qty", tp_qty)
        res = self.instance.place_order(
            category="linear",
            symbol=symbol,
            side="Buy",
            order_type="Limit",
            qty=str(tp_qty),
            time_in_force="PostOnly",
            price=str(tp_price),
            reduce_only=True,
        )
        print(res)

        trailing_stop = last_price - tp_price
        trailing_stop = set_price_precision_by_tick_size(
            trailing_stop, tick_size)
        res = self.instance.set_trading_stop(
            category="linear",
            symbol=symbol,
            active_price=str(tp_price),
            trailing_stop=str(trailing_stop),
        )
        print(res)

    def buy(self, symbol):
        [side, size] = self.get_position(symbol)
        if side == "Buy":
            return

        if side == "Sell":
            res = self.instance.place_order(
                category="linear",
                symbol=symbol,
                side="Buy",
                order_type="Market",
                qty=size,
                time_in_force="GoodTillCancel",
                close_on_trigger=True
            )

        instrument = self.instance.get_instruments_info(
            category="linear", symbol=symbol)["result"]["list"][0]

        ticker = self.instance.get_tickers(category="linear", symbol=symbol)[
            "result"]["list"][0]

        tick_size = instrument["priceFilter"]["tickSize"]
        print("tick_size", tick_size)
        last_price = float(ticker["lastPrice"])
        print("last_price", last_price)

        sl = min(self.df.iloc[-1]['low'], self.df.iloc[-1]['low1'])

        sl_price = float(set_price_precision_by_tick_size(sl, tick_size))
        print("sl_price", sl_price)

        posdict = calculate_position_size(
            risk,
            sl_price,
            last_price,
            equity)
        position_size = posdict["position_size"]

        qty_step = instrument["lotSizeFilter"]["qtyStep"]
        qty_step_parts = qty_step.split(".")
        qty_step = float(qty_step) if len(
            qty_step_parts) > 1 else int(qty_step)
        print("qty_step", qty_step)

        min_qty = instrument["lotSizeFilter"]["minOrderQty"]
        min_qty_parts = min_qty.split(".")
        min_qty = float(min_qty) if len(min_qty_parts) > 1 else int(min_qty)
        print("minOrderQty", min_qty)

        print(position_size)
        pos_size = position_size if position_size > (
            3 * min_qty) else 3 * min_qty
        pos_size = calc_qty_precision(pos_size, qty_step)
        print("final position_size", pos_size)

        res = self.instance.place_order(
            category="linear",
            symbol=symbol,
            side="Buy",
            order_type="Market",
            qty=str(pos_size),
            time_in_force="ImmediateOrCancel",
            stop_loss=str(sl_price),
            sl_trigger_by="LastPrice",
        )
        print(res)
        tp = last_price + self.df.iloc[-1]['atr'] * 2
        tp_price = float(set_price_precision_by_tick_size(tp, tick_size))
        print("tp_price", tp_price)
        tp_qty = calc_qty_precision(
            pos_size/3, qty_step) if pos_size/3 > min_qty else min_qty

        print("tp_qty", tp_qty)
        res = self.instance.place_order(
            category="linear",
            symbol=symbol,
            side="Sell",
            order_type="Limit",
            qty=str(tp_qty),
            time_in_force="PostOnly",
            price=str(tp_price),
            reduce_only=True,
        )
        print(res)

        trailing_stop = tp_price - last_price
        trailing_stop = set_price_precision_by_tick_size(
            trailing_stop, tick_size)
        res = self.instance.set_trading_stop(
            category="linear",
            symbol=symbol,
            active_price=str(tp_price),
            trailing_stop=str(trailing_stop),
        )
        print(res)

    def run(self, symbols="BTCUSDT,SOLUSDT,SUIUSDT,ETHUSDT"):
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


def bootstrap():
    b = Bybit()
    b.run(symbols="BTCUSDT,SOLUSDT,SUIUSDT,ETHUSDT")
    print("Foolsgold run done!")

# df = b.get_signals(symbol="SOLUSDT").df
# print(df)

# print(b.get_latest_signal())
# latest_signal = b.get_latest_signal()
# print(latest_signal['buy'])

# a = calculate_position_size(risk,
#                             200,
#                             100,
#                             equity)

# print(a["position_size"])
# b.buy("SOLUSDT")

# b.get_position(symbol)
# b.sell(symbol=symbol)
