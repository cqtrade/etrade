

def close_position(api, symbol, side, size):
    api.place_order(
        category="linear",
        symbol=symbol,
        side=side,
        order_type="Market",
        qty=size,
        time_in_force="GoodTillCancel",
        close_on_trigger=True
    )


def market_order_with_sl(api, symbol, side, pos_size, sl_price):
    api.place_order(
        category="linear",
        symbol=symbol,
        side=side,
        order_type="Market",
        qty=str(pos_size),
        time_in_force="ImmediateOrCancel",
        stop_loss=str(sl_price),
        sl_trigger_by="LastPrice",
    )


def limit_order(api, symbol, side, pos_size, price):
    api.place_order(
        category="linear",
        symbol=symbol,
        side=side,
        order_type="Limit",
        qty=str(pos_size),
        time_in_force="PostOnly",
        price=str(price),
        reduce_only=True,
    )


def trailing_stop_order(api, symbol, active_price, trailing_stop):
    api.set_trading_stop(
        category="linear",
        symbol=symbol,
        active_price=str(active_price),
        trailing_stop=str(trailing_stop),
    )
