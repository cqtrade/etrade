(ns rsignals.boot
  (:require [clojure.core.async :as async]
            [rsignals.engine.core :as engine-bybit]
            [rsignals.engine.envs :as bybit-envs]
            [rsignals.engine4.core :as engine-binance]
            [rsignals.engine4.envs :as binance-envs]
            [rsignals.tools.discord :as discord]
            [rsignals.utils :as utils]))

(def the-daily-times
  #{"235510"})

(def the-4hourly-times
  #{"235801"
    "35613"
    "75613"
    "115613"
    "155613"
    "195613"})

(defn worker
  []
  (let [time-map (utils/getTimeInUTC)
        time-string (str (:h time-map) (:m time-map) (:s time-map))
        daily-time? (the-daily-times time-string)
        hourly4-time? (the-4hourly-times time-string)]

    (when (System/getenv "API_ENABLED")
      (when daily-time?
        (prn "BYBIT SIGNALS START" time-map)
        (engine-bybit/engine)
        (prn "BYBIT SIGNALS DONE")
        (Thread/sleep 103)))

    (when (System/getenv "BN_API_ENABLED")
      (when hourly4-time?
        (prn "BINANCE SIGNALS START" time-map)
        (engine-binance/engine)
        (prn "BINANCE SIGNALS DONE")
        (Thread/sleep 103)))

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
