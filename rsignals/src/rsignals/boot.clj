(ns rsignals.boot
  (:require [rsignals.engine.core :as engine-daily]
            [rsignals.engine4.core :as engine-4hourly]
            [rsignals.engine4.envs :as h4-envs]
            [rsignals.engine.envs :as d-envs]
            [rsignals.utils :as utils]))


(def the-daily-times
  #{"235510"})

(def the-4hourly-times
  #{"142113"
    "035613"
    "35613"
    "075613"
    "75613"
    "115613"
    "155613"
    "195613"})

(defn worker
  []
  (let [t (utils/getTimeInUTC)
        c (str (:h t) (:m t) (:s t))
        daily-time? (the-daily-times c)
        hourly4-time? (the-4hourly-times c)]

    (when daily-time?
      (prn "DAILY SIGNALS START" t)
      (engine-daily/engine)
      (prn "DAILY SIGNALS DONE")
      (Thread/sleep 103))
    (when daily-time?
      (prn "4H SIGNALS START" t)
      (engine-4hourly/engine)
      (prn "4H SIGNALS DONE")
      (Thread/sleep 103))


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

  (start)

  (utils/getTimeInUTC)

  1)
