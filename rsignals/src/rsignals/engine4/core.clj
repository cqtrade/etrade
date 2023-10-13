(ns rsignals.engine4.core
  (:require [cheshire.core :as json]
            [clj-http.client :as client]
            [rsignals.engine4.signals :as signals]
            [rsignals.tools.discord :as discord]))

(defn post-signals
  [url body]
  (let [res (client/post
             url
             {:headers {:content-type "application/json"}
              :body (json/generate-string body)
              :throw-entire-message? true})]
    (json/parse-string (:body res) true)))

(defn engine
  []
  (try
    (let [url (if (System/getenv "APP_DOCKER")
                "http://njs:3000/signal4"
                "http://0.0.0.0:3000/signal4")
          data (signals/get-signals)]
      (post-signals url data)
      (discord/log-signals "4h" data))
    (catch Exception e
      (prn (str "Exception engine 4h: " (.getMessage e))))))

(comment

  (time
   (let [data (signals/get-signals)]
     (clojure.pprint/pprint data))) ; ~ 2 min

  1)
