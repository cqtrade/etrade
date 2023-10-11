(ns rsignals.boot
  (:require [rsignals.engine.core :as engine-daily]
            [rsignals.engine4.core :as engine-4hourly]
            [rsignals.engine4.envs :as h4-envs]
            [rsignals.engine.envs :as d-envs]
            [rsignals.utils :as utils]))

(def the-daily-times
  #{"235503"})

(def the-4hourly-times
  #{"035633"
    "35633"
    "075633"
    "75633"
    "115633"
    "155633"
    "195633"})

(defn worker
  []
  (let [t (utils/getTimeInUTC)
        c (str (:h t) (:m t) (:s t))
        daily-time? (the-daily-times c)
        hourly4-time? (the-4hourly-times c)]
    (when daily-time?
      (prn "DAILY & 4H SIGNALS" t)
      (engine-daily/engine)
      (engine-4hourly/engine))
    (when hourly4-time?
      (prn "4H SIGNALS" t)
      (engine-4hourly/engine))
    (Thread/sleep 1000)
    (recur)))

(defn start
  []
  (prn "############## START BOOT ##############")
  (d-envs/print-envs)
  (h4-envs/print-envs)
  (worker))

(comment
  (engine-4hourly/engine)
  
  1
  )
