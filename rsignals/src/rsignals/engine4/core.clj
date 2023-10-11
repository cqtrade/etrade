(ns rsignals.engine4.core
  (:require [cheshire.core :as json]
            [clj-http.client :as client]
            [clojure.core.async :as async]
            [rsignals.engine4.signals :as signals]
            [rsignals.engine4.envs :as envs]
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
                "http://njs:3000/signal4"
                "http://0.0.0.0:3000/signal4")
          data (signals/get-signals)]
      (post-signals url data))
    (catch Exception e
      (str "Exception engine: " (.getMessage e)))))

(comment

  (time
   (let [data (signals/get-signals)]
     (clojure.pprint/pprint data))) ; ~ 2 min

  1)