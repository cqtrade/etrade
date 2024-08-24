(ns rsignals.boot
  (:require [clojure.core.async :as async]
            [rsignals.engine.core :as engine-daily]
            [rsignals.engine.envs :as bybit-envs]
            [rsignals.engine4.core :as engine-four-hourly]
            [rsignals.engine4.envs :as binance-envs]
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
      ; TODO should be binance instead of bybit
      ; will become single engine and single signal set
      ; signal receiver will spread the signals to the right exhanges

      (if (= "4h" (System/getenv "C_INTERVAL"))
        (engine-four-hourly/engine)
        (engine-daily/engine)))
    (Thread/sleep 1000)
    (recur)))

(defn start
  []
  (prn "############## START BOOT ##############")
  (bybit-envs/print-envs)
  (bybit-envs/get-dynamic-tickers-vol)
  (bybit-envs/log-boot-long)
  (bybit-envs/log-boot-short)
  (binance-envs/print-envs)
  (async/go (discord/loop-messages))
  (worker))

(comment

  (start)

  (utils/getTimeInUTC)

  1)
