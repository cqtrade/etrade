import vectorbt as vbt
from numba import njit
import numpy as np
import talib

@njit
def NOTadjust_sl_func_nb(c, atr_array):
    """
    Trail stop loss function
    """
    sl_multiplier = 2.0
    atr_entry = atr_array[c.init_i]
    if c.position_now > 0:  # Longs
        sl_price = c.val_price_now - (atr_entry * sl_multiplier)
        stop_loss = ((c.val_price_now - sl_price) / c.val_price_now)
    elif c.position_now < 0:  # Shorts
        sl_price = c.val_price_now + (atr_entry * sl_multiplier)
        stop_loss = ((sl_price - c.val_price_now) / c.val_price_now) * -1
    else:  # No position
        stop_loss = 1.00

    if stop_loss < 0.00:
        stop_loss = 1.00  # Never hit

    return stop_loss, True


@njit
def adjust_sl_func_nb(c, atr_array):
    """
    Fixed stop loss function
    """
    sl_multiplier = 2

    if c.position_now > 0:  # Longs
        atr_entry = atr_array[c.init_i]
        sl_price = c.init_price - (atr_entry * sl_multiplier)
        stop_loss = ((c.val_price_now - sl_price) / c.val_price_now)

    elif c.position_now < 0:  # Shorts
        atr_entry = atr_array[c.init_i]
        sl_price = c.init_price + (atr_entry * sl_multiplier)
        stop_loss = ((sl_price - c.val_price_now) / c.val_price_now) * -1
    else:  # No position
        stop_loss = 1.00

    if stop_loss < 0.00:
        stop_loss = 1.00  # Never hit

    return stop_loss, True


@njit
def adjust_tp_func_nb(c, atr_array):
    # TODO: Implement a better take profit function
    tp_multiplier = 0.5

    if c.position_now > 0:  # Longs
        atr_entry = atr_array[c.init_i]
        tp_price = c.init_price + (atr_entry * tp_multiplier)
        take_profit = ((c.val_price_now - tp_price) / c.val_price_now)

    elif c.position_now < 0:  # Shorts
        atr_entry = atr_array[c.init_i]
        tp_price = c.init_price - (atr_entry * tp_multiplier)
        take_profit = ((c.val_price_now - tp_price) / c.val_price_now) * -1
    else:  # No position
        take_profit = 1.00

    if take_profit < 0.00:
        take_profit = 1.00  # Never hit

    return take_profit


@njit
def max_over_period(data, period):
    return np.array([np.max(np.abs(data[i-period+1:i+1]))
                     if i >= period
                     else np.max(np.abs(data[:i+1]))
                     for i in range(len(data))])


@njit
def tdfi_nb(close, tdfi_period):
    tdfi_close = np.asarray(close * 10000000)
    mma = vbt.nb.ewm_mean_1d_nb(tdfi_close, tdfi_period)
    smma = vbt.nb.ewm_mean_1d_nb(mma, tdfi_period)
    impetmma = mma - np.roll(mma, 1)
    impetsmma = smma - np.roll(smma, 1)
    divma = np.abs(mma - smma)
    averimpet = (impetmma + impetsmma) / 2
    number = averimpet
    result = np.power(number, 3)
    tdf = divma * result
    ntdf = tdf / max_over_period(np.abs(tdf), tdfi_period * 3)
    for i in range(tdfi_period*3):
        ntdf[i] = np.nan
    return ntdf


@njit
def rex_nb(closes, highs, lows, opens, p):
    tvb = 3 * closes - opens - highs - lows
    return vbt.nb.rolling_mean_1d_nb(tvb, p)

@njit
def rex_sig_nb(rexs, p):
    return vbt.nb.rolling_mean_1d_nb(rexs, p)

def rex(closes, highs, lows, opens, p):
    tvb = 3 * closes - opens - highs - lows
    return talib.SMA(tvb, p)

def rex_sig(rexs, p):
    return talib.SMA(rexs, p)


@njit
def crossover_array_array_nb(a, b, current_idx, period=0) -> bool:
    if period == -1:
        return True
    nparange = np.arange((current_idx - period), current_idx + 1, 1)
    for i in nparange:
        if a[i - 1] <= b[i - 1] and a[i] > b[i]:
            return True
    return False


@njit
def crossunder_array_array_nb(a, b, current_idx, period=0) -> bool:
    """
    A crosses under B
    """
    if period == -1:
        return True
    nparange = np.arange((current_idx - period), current_idx + 1, 1)
    for i in nparange:
        if a[i - 1] >= b[i - 1] and a[i] < b[i]:
            return True
    return False


@njit
def crossover_array_scalar_nb(a, b, current_idx, period=0) -> bool:
    if period == -1:
        return True
    nparange = np.arange((current_idx - period), current_idx + 1, 1)
    for i in nparange:
        if a[i - 1] <= b and a[i] > b:
            return True
    return False


@njit
def crossunder_array_scalar_nb(a, b, current_idx, period=0) -> bool:
    if period == -1:
        return True
    nparange = np.arange((current_idx - period), current_idx + 1, 1)
    for i in nparange:
        if a[i - 1] >= b and a[i] < b:
            return True
    return False
