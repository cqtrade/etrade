(ns rsignals.tickers
  (:require
   [clojure.string :as str]))

(defn get-tickers
  []
  ["BTCUSDT"
   "ETHUSDT"
   "XRPUSDT"
   "BNBUSDT"
   "SOLUSDT"
   "DOGEUSDT"
   "ADAUSDT"
   "LINKUSDT"
   "BCHUSDT"
   "AVAXUSDT"
   "LTCUSDT"
   "UNIUSDT"
   "XLMUSDT"
   "PENGUUSDT"
   "SUIUSDT"
   "HYPEUSDT"
   "ENAUSDT"
   "TRUMPUSDT"
   "PUMPUSDT"
   "AAVEUSDT"
   "FARTCOINUSDT"])



(comment

  (count (get-tickers))

  (clojure.pprint/pprint
   (get-tickers))
  1)
