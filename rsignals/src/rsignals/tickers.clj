(ns rsignals.tickers
  (:require
   [clojure.string :as str]))

(defn get-tickers
  []
  ["BTCUSDT"
   "ETHUSDT"
   "BNBUSDT"
   "SOLUSDT"
   "XRPUSDT"
   "DOGEUSDT"
   "TONUSDT"
   "ADAUSDT"
   "AVAXUSDT"
   "TRXUSDT"
   "1000SHIBUSDT"
   "LINKUSDT"
   "DOTUSDT"
   "BCHUSDT"
   "NEARUSDT"
   "LTCUSDT"
   "SUIUSDT"
   "ICPUSDT"
   "TAOUSDT"
   "UNIUSDT"
   "APTUSDT"
   "FETUSDT"
   "RENDERUSDT"
   "NOTUSDT"
   "1000PEPEUSDT"
   "WIFUSDT"
   "INJUSDT"
   "FILUSDT"
   "ORDIUSDT"
   "ONDOUSDT"])



(comment

  (count (get-tickers))

  (clojure.pprint/pprint
   (get-tickers))
  1)
