(ns rsignals.boot
   (:require [clojure.core.async :as async]
            ; rsignals.engine.core Bybit
             [rsignals.engine.core :as engine-bybit]
             [rsignals.engine.envs :as bybit-envs]
            ; rsignals.engine4.core Binance 
             [rsignals.engine4.core :as engine-binance]
             [rsignals.engine4.envs :as binance-envs]
             [rsignals.tools.discord :as discord]
             [rsignals.utils :as utils]))


 #_(def test-time
     (System/getenv "TEST_TIME"))

 (def the-daily-times
   #{"235510"})

 #_(def the-4hourly-times
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
         #_#_hourly4-time? (the-4hourly-times c)]

     (when (System/getenv "API_ENABLED")
       (when daily-time?
         (prn "BYBIT SIGNALS START" t)
         (engine-bybit/engine)
         (prn "BYBIT SIGNALS DONE")
         (Thread/sleep 103))))

   (when (System/getenv "BN_API_ENABLED")
     (when daily-time?
       (prn "BINANCE SIGNALS START" t)
       (engine-binance/engine)
       (prn "BINANCE SIGNALS DONE")
       (Thread/sleep 103))

     #_(when hourly4-time?
         (prn "BINANCE SIGNALS" t)
         (engine-binance/engine)))

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
