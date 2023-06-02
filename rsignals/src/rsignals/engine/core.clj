(ns rsignals.engine.core
  (:require [clj-http.client :as client]
            [clojure.core.async :as async]
            [cheshire.core :as json]
            [rsignals.engine.signals :as signals]
            [rsignals.utils :as utils]))

(defn post-signals
  [url body]
  (let [res (client/post
             url
             {:headers {:content-type "application/json"}
              :body (json/generate-string body)
              :throw-entire-message? true})]
    (json/parse-string (:body res) true)))

(def run-engine (atom true))

(defn engine
  []
  (try
    (let [url (if (System/getenv "APP_DOCKER")
                "http://njs:3000/signal"
                "http://0.0.0.0:3000/signal")
          data (signals/get-signals)]
      (post-signals url data))
    (catch Exception e
      (str "Exception engine: " (.getMessage e)))))

(comment

  (let [data (signals/get-signals)]
    (clojure.pprint/pprint data))

  0)

(def the-times #{"235631"
                ;;  "035751"
                ;;  "35751"
                ;;  "075851"
                ;;  "75851"
                ;;  "115851"
                ;;  "155851"
                ;;  "195851"
                 })

(defn start-worker
  []
  (Thread/sleep 1000)
  (let [t (utils/getTimeInUTC)
        c (str (:h t) (:m t) (:s t))
        hour-time? (the-times c)]
    (when hour-time?
      (prn (utils/getTimeInUTC))
      (async/thread (engine))))
  (when @run-engine (recur)))
