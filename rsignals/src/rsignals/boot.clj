(ns rsignals.boot
  (:require [clojure.core.async :as async]
            [rsignals.engine.core :as engine-daily]
            [rsignals.engine.envs :as d-envs]
            [rsignals.engine4.core :as engine-4hourly]
            [rsignals.engine4.envs :as h4-envs]
            [rsignals.tools.discord :as discord]
            [rsignals.utils :as utils]))


(def test-time
  (System/getenv "TEST_TIME"))

(def the-daily-times
  #{"235510"})

(def the-4hourly-times
  #{test-time
    "35613"
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

    (when-not (System/getenv "SKIP_4H")
      (when daily-time?
        (prn "4H SIGNALS START" t)
        (engine-4hourly/engine)
        (prn "4H SIGNALS DONE")
        (Thread/sleep 103))

      (when hourly4-time?
        (prn "4H SIGNALS" t)
        (engine-4hourly/engine)))

    (Thread/sleep 1000)
    (recur)))

(defn start
  []
  (prn "############## START BOOT ##############")
  (d-envs/print-envs)
  (h4-envs/print-envs)
  (async/go (discord/loop-messages))
  (worker))

(comment

  (start)

  (utils/getTimeInUTC)

  1)
