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
        xss (get-quotas interval (envs/get-tickers))]
    (prn "Quotas D received" (count xss))
    xss))

(comment
  (get-data)

  1)

(defn get-signals
  []
  (let [xss (get-data)]
    (flatten [(->> xss
                   (filter #(> (count %) 50))
                   (engine.short/get-signals the-params-short)
                   (mapv #(select-keys % [:ticker :sig :risk :atrsl :atrtp
                                          :tdfi :exchange :atr :close :time :startTime])))
              (->> xss
                   (filter #(> (count %) 50))
                   (engine.long/get-signals the-params-long)
                   (mapv #(select-keys % [:ticker :sig :risk :atrsl :atrtp
                                          :tdfi :exchange :atr :close :time :startTime])))])))

(comment

  (let [sigs (get-signals)]
    (pprint/pprint (->> sigs
                        #_(map #(-> [(:ticker %) (:sig %)]))))
    (pprint/pprint (->> sigs
                        (map #(-> [(:ticker %) (:sig %) (:startTime %)])))))

  1)
