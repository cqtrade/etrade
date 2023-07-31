(ns rsignals.engine.signals
  (:require
   [clojure.pprint :as pprint]
   [rsignals.envs :as envs]
   [rsignals.engine.long :as engine.long]
   [rsignals.engine.short :as engine.short]))

(def the-params-short (envs/get-params-short))

(def the-params-long (envs/get-params-long))

(defn get-signals
  []
  (let [sigs-short (engine.short/get-signals the-params-short)
        signals-short (mapv
                       (fn [m]
                         (select-keys
                          m
                          [:ticker :sig :risk :atrsl :atrtp :tdfi :exchange :atr :close]))
                       sigs-short)
        sigs-long (engine.long/get-signals the-params-long)
        signals-long (mapv
                      (fn [m]
                        (select-keys
                         m
                         [:ticker :sig :risk :atrsl :atrtp :tdfi :exchange :atr :close]))
                      sigs-long)]
    (->> [signals-short signals-long]
         flatten)))

(comment
  (let [sigs (get-signals)]
    (pprint/pprint sigs))
  1)

