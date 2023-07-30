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
  (let [signals-short (mapv
                       (fn [m]
                         (select-keys
                          m
                          [:ticker :sig :risk :atrsl :atrtp :tdfi :exchange :atr :close]))
                       (engine.short/get-signals the-params-short))
        signals-long (mapv
                      (fn [m]
                        (select-keys
                         m
                         [:ticker :sig :risk :atrsl :atrtp :tdfi :exchange :atr :close]))
                      (engine.long/get-signals the-params-long))
        all-sigs [signals-short signals-long]]
    (pprint/pprint all-sigs)
    (->> all-sigs
         flatten)))

(comment
  (let [sigs (get-signals)]
    (pprint/pprint sigs))
  1)

