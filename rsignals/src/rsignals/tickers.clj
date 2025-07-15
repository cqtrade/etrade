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
   "ADAUSDT"
   "AVAXUSDT"
   "TRXUSDT"
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
   "1000PEPEUSDT"
   "WIFUSDT"
   "INJUSDT"
   "FILUSDT"
   "ORDIUSDT"
   "XLMUSDT"
   "HBARUSDT"
   "PENGUUSDT"
   "ONDOUSDT"])



(comment

  (count (get-tickers))

  (clojure.pprint/pprint
   (get-tickers))
  1)
