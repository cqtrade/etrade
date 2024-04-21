(ns rsignals.engine4.signals
  (:require
   [clojure.pprint :as pprint]
   [rsignals.engine4.envs :as envs]
   [rsignals.tools.ohlc :as ohlc]
   [rsignals.engine4.long :as engine4.long]
   [rsignals.engine4.short :as engine4.short]))

(def the-params-short (envs/get-params-short))

(def the-params-long (envs/get-params-long))

(defn get-quotas
  [interval tickers]
  (->> tickers
       (mapv
        (fn [ticker]
          (Thread/sleep 133)
          (try
            (ohlc/binance-spot interval ticker)
            (catch Exception e
              (println "error" ticker (-> e .getMessage))
              (flush)
              (Thread/sleep 1000)
              []))))
       (remove empty?)))

(defn get-data
  []
  (let [interval "1d" ; TODO get from env
        xss (get-quotas interval (envs/get-tickers))]
    (prn "Quotas Binance received" (count xss))
    xss))

(comment

  (get-data)

  1)

(defn get-signals
  []
  (let [xss (get-data)]
    (flatten [(->> xss
                   (engine4.short/get-signals the-params-short)
                   (mapv #(select-keys % [:ticker :sig :risk :atrsl :atrtp
                                          :tdfi :exchange :atr :close :time])))
              (->> xss
                   (engine4.long/get-signals the-params-long)
                   (mapv #(select-keys % [:ticker :sig :risk :atrsl :atrtp
                                          :tdfi :exchange :atr :close :time])))])))

(comment
  (envs/get-tickers)
  (let [sigs (get-signals)]
    (pprint/pprint sigs))
  1)
