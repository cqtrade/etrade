(ns rsignals.tools.discord
  (:require [cheshire.core :as json]
            [clj-http.client :as client]
            [clojure.core.async :as async]
            [clojure.pprint :as pp]))

(def the-queue (atom []))

(defn- push-to-last
  "Adds an item to the end of the queue."
  [queue item]
  (swap! queue conj item))

(defn- pop-the-first
  "Removes and returns the first item in the queue."
  [queue]
  (let [item (first @queue)]
    (swap! queue rest)
    item))

(defn- unshift-to-first
  "Adds an item to the beginning of the queue."
  [queue item]
  (swap! queue #(cons item %)))

(defn- shift-the-last
  "Removes and returns the last item in the queue."
  [queue]
  (let [item (last @queue)]
    (swap! queue #(subvec % 0 (dec (count %))))
    item))

(defn- post-to-discord
  [webhook-url message]
  (let [res (client/post
             webhook-url
             {:headers {:content-type "application/json"}
              :body (json/generate-string {:content (str "```" message "```")})
              :throw-entire-message? true})]
    (json/parse-string (:body res) true)))

(defn loop-messages
  "Loops through the queue and posts the messages to discord."
  []
  (async/go
    (try
      (let [webhook (System/getenv "DISCORD_WEBHOOK_URL")
            message (pop-the-first the-queue)]
        (if (and message webhook)
          (post-to-discord webhook message)
          (pp/pprint message)))
      (catch Exception e
        (pp/pprint
         (str "caught exception loop-messages : " (.getMessage e))))
      (finally (Thread/sleep 5000)
               (loop-messages)))))

(defn log
  "Adds a message to the end of the queue."
  [message]
  (push-to-last the-queue message))

(defn remove-last-four [s]
  (subs s 0 (- (count s) 4)))

(defn log-signals [tf signals]
  ; todo add some more stats based on the signals
  (log
   (str tf " signals\n"
        (with-out-str
          (clojure.pprint/print-table
           ["Buy" "Sell" "Ex B" "Ex S"]
           (->> signals
                (map #(-> {(case (:sig %)
                             1 "Buy"
                             -1 "Sell"
                             -2 "Ex B"
                             2 "Ex S"
                             "Neutral")
                           (remove-last-four
                            (:ticker %))}))))))))

(comment


  [{:ticker "DOT" :sig -1}
   {:ticker "BTC" :sig 1} {:ticker "ETH" :sig 1} {:ticker "XLM" :sig -1}
   {:ticker "THETA" :sig 0}]

  (log-signals "4h" [])

  (loop-messages)
  (-> @the-queue)

  (post-to-discord
   (System/getenv "DISCORD_WEBHOOK_URL")
   (with-out-str
     (clojure.pprint/print-table [:a] [{:a 11} {:a 12}])))

  (str (clojure.pprint/print-table [:a] [{:a 11} {:a 12}]))
  1)


