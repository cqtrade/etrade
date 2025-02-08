

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


def find_pos_size(instrument, risk, sl_price, last_price, equity):
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

    return pos_size, qty_step, min_qty
