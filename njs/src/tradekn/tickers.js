const krakenTickers = {
    'BTCUSDT': 'PF_XBTUSD',
    'ETHUSDT': 'PF_ETHUSD',
    'BNBUSDT': 'PF_BNBUSD',
    'SOLUSDT': 'PF_SOLUSD',
    'XRPUSDT': 'PF_XRPUSD',
    'DOGEUSDT': 'PF_DOGEUSD',
    'ADAUSDT': 'PF_ADAUSD',
    'AVAXUSDT': 'PF_AVAXUSD',
    'TRXUSDT': 'PF_TRXUSD',
    '1000SHIBUSDT': 'PF_SHIBUSD',
    'LINKUSDT': 'PF_LINKUSD',
    'DOTUSDT' :'PF_DOTUSD',
    'BCHUSDT' :'PF_BCHUSD',
    'NEARUSDT' :'PF_NEARUSD',
    'LTCUSDT' :'PF_LTCUSD',
    'SUIUSDT' : 'PF_SUIUSD',
    'ICPUSDT' : 'PF_ICPUSD',
    'TAOUSDT' : 'PF_TAOUSD',
    'UNIUSDT' : 'PF_UNIUSD',
    'APTUSDT' : 'PF_APTUSD',
    'FETUSDT' : 'PF_FETUSD',
    'RENDERUSDT' : 'PF_RENDERUSD',
    '1000PEPEUSDT' : 'PF_PEPEUSD',
    'WIFUSDT' : 'PF_WIFUSD',
    'INJUSDT' : 'PF_INJUSD',
    'FILUSDT' : 'PF_FILUSD',
    'ORDIUSDT' : 'PF_ORDIUSD',
    'ONDOUSDT' : 'PF_ONDOUSD',
}

const tickerForKraken = (ticker) => {
    return krakenTickers[ticker]
}

module.exports.tickerForKraken = tickerForKraken