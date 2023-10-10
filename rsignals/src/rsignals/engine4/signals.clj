(ns rsignals.engine4.signals
  (:require
   [clojure.pprint :as pprint]
   [rsignals.engine4.envs :as envs]
   [rsignals.engine4.long :as engine4.long]
   [rsignals.engine4.short :as engine4.short]))

(def the-params-short (envs/get-params-short))

(def the-params-long (envs/get-params-long))

(defn get-signals
  []
  (let [sigs-short (engine4.short/get-signals the-params-short)
        signals-short (mapv
                       (fn [m]
                         (select-keys
                          m
                          [:ticker :sig :risk :atrsl :atrtp :tdfi :exchange :atr :close]))
                       sigs-short)
        sigs-long (engine4.long/get-signals the-params-long)
        signals-long (mapv
                      (fn [m]
                        (select-keys
                         m
                         [:ticker :sig :risk :atrsl :atrtp :tdfi :exchange :atr :close]))
                      sigs-long)
        ]
    (->> [signals-short signals-long]
         flatten)))

(comment
  (let [sigs (get-signals)]
    (pprint/pprint sigs))
  1)

