(ns rsignals.engine.signals
  (:require
   [clojure.pprint :as pprint]
   [rsignals.engine.envs :as envs]
   [rsignals.engine.long :as engine.long]
   [rsignals.engine.short :as engine.short]
   [rsignals.tools.ohlc :as ohlc]))

(def the-params-short (envs/get-params-short))

(def the-params-long (envs/get-params-long))

(defn get-quotas
  [interval tickers]
  (->> tickers
       (mapv
        (fn [ticker]
          (Thread/sleep 133)
          (try
            (ohlc/ohcl-bybit-v5 interval ticker)
            (catch Exception e
              (println "error" ticker (-> e .getMessage))
              (flush)
              (Thread/sleep 1000)
              []))))
       (remove empty?)))

(defn get-data
  []
  (let [interval "D"
        tickers (->> ["BTCUSDT"
                      "ETHUSDT"
                      "XRPUSDT"
                      "LTCUSDT"
                      "ADAUSDT"
                      "XLMUSDT"
                      "BNBUSDT"
                
                                     ; < x 1500
                      "FTMUSDT"
                      "LINKUSDT"
                      "MATICUSDT"
                      "DOGEUSDT"
                      "COMPUSDT"
                      "BCHUSDT"
                      "HBARUSDT"
                
                                      ; < x 1000
                      "SOLUSDT"
                      "AAVEUSDT"
                      "MKRUSDT"
                      "AVAXUSDT"
                      "INJUSDT"
                      "UNIUSDT"
                      "DOTUSDT"
                      "SANDUSDT"
                      "RUNEUSDT"]
                     set
                     vec)
        xss (get-quotas interval tickers)]
    (prn "Quotas D received" (count xss))
    xss))

(defn get-signals
  []
  (let [xss (get-data)]
    (flatten [(->> xss
                   (engine.short/get-signals the-params-short)
                   (mapv #(select-keys % [:ticker :sig :risk :atrsl :atrtp
                                          :tdfi :exchange :atr :close :time])))
              (->> xss
                   (engine.long/get-signals the-params-long)
                   (mapv #(select-keys % [:ticker :sig :risk :atrsl :atrtp
                                          :tdfi :exchange :atr :close :time])))])))

(comment
  (let [sigs (get-signals)]
    (pprint/pprint sigs))
  1)

