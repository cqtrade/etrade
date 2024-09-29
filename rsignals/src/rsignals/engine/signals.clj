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
            (ohlc/binance-futures interval ticker)
            (catch Exception e
              (println "error" ticker (-> e .getMessage))
              (flush)
              (Thread/sleep 1000)
              []))))
       (remove empty?)))

(defn get-data
  [interval]
  (let [xss (get-quotas interval (envs/get-tickers))]
    (prn "Quotas" interval (count xss))
    xss))

(comment
  (get-data "1d")

  1)

(defn get-signals
  [interval]
  (let [xss (get-data interval)]
    (flatten [(->> xss
                   (filter #(> (count %) 50))
                   (engine.short/get-signals the-params-short)
                   (mapv #(select-keys % [:ticker :sig :risk :atrsl :atrtp
                                          :tdfi :exchange :atr :close
                                          :time :startTime :endTime])))
              (->> xss
                   (filter #(> (count %) 50))
                   (engine.long/get-signals the-params-long)
                   (mapv #(select-keys % [:ticker :sig :risk :atrsl :atrtp
                                          :tdfi :exchange :atr :close
                                          :time :startTime :endTime])))])))

(comment

  (let [sigs (get-signals "1d")]
    (pprint/pprint (->> sigs
                        #_(map #(-> [(:ticker %) (:sig %)]))))
    (pprint/pprint (->> sigs
                        (map #(-> [(:ticker %) (:sig %) (:startTime %)])))))

  (let [sigs (get-signals "1d")]
    (pprint/pprint sigs)
    (count sigs))

  1)
