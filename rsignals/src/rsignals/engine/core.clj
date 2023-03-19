(ns rsignals.engine.core
  (:require [io.pedestal.http :as http]
            [io.pedestal.http.route :as route]
            [io.pedestal.http.body-params :as body-params]
            [ring.util.response :as ring-resp]
            [clj-http.client :as client]
            [clojure.core.async :as async]
            [cheshire.core :as json]
            [rsignals.engine.long :as engine.long]))


(defn post-request-with-body-json
  [url body]
  (let [res (client/post
             url
             {:headers {:content-type "application/json"}
              :body (json/generate-string body)
              :throw-entire-message? true})]
    (json/parse-string (:body res) true)))

(defn getTimeInUTC
  []
  (let [date (java.util.Date.)
        tz (java.util.TimeZone/getTimeZone "UTC")
        cal (java.util.Calendar/getInstance tz)]
    (.setTime cal date)
    {:h (.get cal java.util.Calendar/HOUR_OF_DAY)
     :m (.get cal java.util.Calendar/MINUTE)
     :s (.get cal java.util.Calendar/SECOND)}))

(def run-engine (atom true))

(defn get-params
  []
  (let [tdfi-p (if (System/getenv "TDFI_P")
                 (Integer/parseInt (System/getenv "TDFI_P"))
                 9)
        tdfi-level (if (System/getenv "TDFI_LEVEL")
                     (Double/parseDouble (System/getenv "TDFI_LEVEL"))
                     0.9)
        rex-p (if (System/getenv "REX_P")
                (Integer/parseInt (System/getenv "REX_P"))
                5)
        rex-sp (if (System/getenv "REX_SP")
                 (Integer/parseInt (System/getenv "REX_SP"))
                 5)
        conf-p (if (System/getenv "CONF_P")
                 (Integer/parseInt (System/getenv "CONF_P"))
                 10)
        conf-cross (if (System/getenv "CONF_CROSS")
                     (Integer/parseInt (System/getenv "CONF_CROSS"))
                     -1)
        tpcoef (if (System/getenv "TPCOEF")
                 (Double/parseDouble (System/getenv "TPCOEF"))
                 1.0)
        slcoef (if (System/getenv "SLCOEF")
                 (Double/parseDouble (System/getenv "SLCOEF"))
                 1.0)
        risk (if (System/getenv "RISK")
               (Integer/parseInt (System/getenv "RISK"))
               1.0)]
    {:tdfi-p tdfi-p
     :tdfi-level tdfi-level
     :rex-p rex-p
     :rex-sp rex-sp
     :conf-p conf-p
     :conf-cross conf-cross
     :tpcoef tpcoef
     :slcoef slcoef
     :risk risk}))

(def the-params (get-params))

(defn engine
  []
  (try
    (let [url (if (System/getenv "APP_DOCKER")
                "http://njs:3000/signal"
                "http://0.0.0.0:3000/signal")
          t-args the-params
          data (engine.long/get-signals t-args)]
      (post-request-with-body-json
       url
       data))
    (catch Exception e
      (str "Exception engine: " (.getMessage e)))))

(def the-times #{"235851"
                 "035851"
                 "35851"
                 "075851"
                 "75851"
                 "115851"
                 "155851"
                 "195851"})

(defn start-worker
  []
  (Thread/sleep 1000)
  (let [t (getTimeInUTC)
        c (str (:h t) (:m t) (:s t))
        hour-time? (the-times c)]
    (when (or true hour-time?)
      (prn (getTimeInUTC))
      (prn the-params)
      (async/thread (engine))))
  (when @run-engine (recur)))

(comment

  (the-times "154141")
  (let [t (getTimeInUTC)
        c (str (:h t) (:m t) (:s t))
        hour? (the-times c)]
    hour?)

  (getTimeInUTC)
  (async/thread (engine))
  (async/thread (start-worker))
  (reset! run-engine false)
  (prn @run-engine)
  (System/currentTimeMillis)
  (quot (System/currentTimeMillis) 1000)
  (.format (java.text.SimpleDateFormat. "MM/dd/yyyy hh") (new java.util.Date))

  1)


