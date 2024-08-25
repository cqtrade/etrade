(ns rsignals.boot
  (:require [clojure.core.async :as async]
            [rsignals.engine.core :as engine-daily]
            [rsignals.engine.envs :as envs-daily]
            [rsignals.engine4.core :as engine-four-hourly]
            [rsignals.engine4.envs :as envs-four-hourly]
            [rsignals.tools.discord :as discord]
            [rsignals.utils :as utils]))

(def the-daily-times
  #{"0011"}) ; 11 seconds past midnight https://www.studytonight.com/post/set-time-to-start-of-day-or-midnight-in-java


(def the-4hourly-times
  #{"0011"
    "4011"
    "8011"
    "12011"
    "16011"
    "20011"})

(defn worker
  []
  (let [time-map (utils/getTimeInUTC)
        time-string (str (:h time-map) (:m time-map) (:s time-map))
        the-time? (if (= "4h" (System/getenv "C_INTERVAL"))
                    (the-4hourly-times time-string)
                    (the-daily-times time-string))]
    (when the-time?
      ; TODO currently one set of signals but different engines
      ; should be able to have on engine and based on envs the
      ; strategies with env vars should be different

      (if (= "4h" (System/getenv "C_INTERVAL"))
        (engine-four-hourly/engine)
        (engine-daily/engine)))
    (Thread/sleep 1000)
    (recur)))

(defn start
  []
  (prn "############## START BOOT ##############")
  (envs-daily/print-envs)
  (envs-daily/get-dynamic-tickers-vol)
  (envs-daily/log-boot-long)
  (envs-daily/log-boot-short)
  (envs-four-hourly/print-envs)
  (async/go (discord/loop-messages))
  (worker))

(comment

  (start)

  (utils/getTimeInUTC)

  1)
