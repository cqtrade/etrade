(ns rsignals.engine.core
  (:require [io.pedestal.http :as http]
            [io.pedestal.http.route :as route]
            [io.pedestal.http.body-params :as body-params]
            [ring.util.response :as ring-resp]
            [clj-http.client :as client]
            [clojure.core.async :as async]
            [cheshire.core :as json]))


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

(defn engine
  []
  (prn (getTimeInUTC))
  (let [url (if (System/getenv "APP_DOCKER")
              "http://njs:3000/signal"
              "http://0.0.0.0:3000/signal")]
    (post-request-with-body-json
     url
     {:data "test data"})))

(defn start-worker
  []
  (Thread/sleep 5000)
  (async/thread (engine))
  (when @run-engine (recur)))

(comment

  (async/thread (start-worker))





  (reset! run-engine false)

  (prn @run-engine)

  (TimeZone/getTimeZone "GMT")

  (System/currentTimeMillis)
  (quot (System/currentTimeMillis) 1000)

  (.format (java.text.SimpleDateFormat. "MM/dd/yyyy hh") (new java.util.Date))

  (getTimeInUTC)


  1)


