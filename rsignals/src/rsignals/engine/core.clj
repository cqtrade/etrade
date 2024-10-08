(ns rsignals.engine.core
  (:require [cheshire.core :as json]
            [clj-http.client :as client]
            [rsignals.engine.signals :as signals]
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
                "http://njs:3000/signal"
                "http://0.0.0.0:3000/signal")
          interval (if (= "4h" (System/getenv "C_INTERVAL"))
                     "4h"
                     "1d")
          data (->> (signals/get-signals interval)
                    (mapv #(merge % {:interval interval})))]
      (post-signals url data)
      (discord/log-signals interval data))
    (catch Exception e
      (prn (str "Exception engine signals:" (.getMessage e))))))

(comment

  (time
   (let [interval (if (= "4h" (System/getenv "C_INTERVAL"))
                    "4h"
                    "1d")
         data (->> (signals/get-signals interval)
                   (mapv #(merge % {:interval interval})))]
     (clojure.pprint/pprint data)))

  (System/getenv "C_INTERVAL")

  1)
