(ns rsignals.boot
  (:require [clojure.core.async :as async]
            [rsignals.engine.core :as engine-daily]
            [rsignals.engine.envs :as envs-daily]
            [rsignals.engine4.core :as engine-four-hourly]
            [rsignals.engine4.envs :as envs-four-hourly]
            [rsignals.tools.discord :as discord]
            [rsignals.utils :as utils]))

(defn worker
  []
  (when (utils/is-time)
    (if (= "4h" (System/getenv "C_INTERVAL"))
      (engine-four-hourly/engine)
      (engine-daily/engine)))
  (Thread/sleep 1000)
  (recur))

(defn start
  []
  (prn "############## START BOOT ##############")
  (if (= "4h" (System/getenv "C_INTERVAL"))
    (do
      (envs-four-hourly/print-envs)
      (envs-four-hourly/get-dynamic-tickers-vol)
      (envs-four-hourly/log-boot-long)
      (envs-four-hourly/log-boot-short))
    (do (envs-daily/print-envs)
        (envs-daily/get-dynamic-tickers-vol)
        (envs-daily/log-boot-long)
        (envs-daily/log-boot-short)))
  (async/go (discord/loop-messages))
  (worker))

(comment

  (start)

  (utils/getTimeInUTC)

  1)
