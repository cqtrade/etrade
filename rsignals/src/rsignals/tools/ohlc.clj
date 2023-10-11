(ns rsignals.tools.ohlc
  (:require
   [clj-http.client :as client]
   [cheshire.core :as json])
  (:import (org.apache.logging.log4j Level
                                     LogManager)))
;; https://github.com/dakrone/clj-http#logging
(defn change-log-level! [logger-name level]
  (let [ctx (LogManager/getContext false)
        config (.getConfiguration ctx)
        logger-config (.getLoggerConfig config logger-name)]
    (.setLevel logger-config level)
    (.updateLoggers ctx)))

(change-log-level! LogManager/ROOT_LOGGER_NAME Level/INFO)

(def bound-values {"1h" 37
                   "4h" 10
                   "1d" 3})

(defn get-request
  [url]
  (let [res (client/get
             url
             {:headers {:content-type "application/json"}
              :throw-entire-message? true})]
    (json/parse-string (:body res) true)))

(defn prep-data
  [ticker interval coll]
  (->> coll
       (mapv
        (fn [[start open high low close volume end]]
          {:time start
           :startTime (str (java.util.Date. start))
           :open (Double/parseDouble open)
           :high (Double/parseDouble high)
           :low (Double/parseDouble low)
           :close (Double/parseDouble close)
           :volume (Double/parseDouble volume)
           :end end
           :end* (str (java.util.Date. end))
           :market ticker
           :resolution interval
           :exchange "B"}))
       (group-by :time)
       vals
       (mapv first)
       (sort-by :time)))

(defn fin-data
  [ticker interval coll]
  (->> coll
       (prep-data ticker interval)))

(defn paginate-spot [ticker interval i bound-v endtime coll]
  (if (< i bound-v)
    (do
      (when (> i 1) (Thread/sleep 333))
      (let [url (if (nil? endtime)
                  (format
                   "https://api.binance.com/api/v3/klines?limit=1000&symbol=%s&interval=%s"
                   ticker
                   interval)
                  (format
                   "https://api.binance.com/api/v3/klines?limit=1000&symbol=%s&interval=%s&endTime=%d"
                   ticker
                   interval
                   endtime))
            data (get-request url)
            coll (concat data coll)
            endtime (if (-> data count zero?)
                      false
                      (->> data
                           (mapv #(first %))
                           (apply min)
                           dec))]
        (prn url)
        (if endtime
          (recur ticker interval (inc i) bound-v endtime coll)
          (fin-data ticker interval coll))))
    (fin-data ticker interval coll)))

(defn write-results-edn
  [f-name xs]
  (spit (str "resources/db/data/" f-name ".edn") (pr-str xs)))

(defn save-data
  [interval tickers]
  (let [bound-v (get bound-values interval)]
    (doall
     (map
      (fn [ticker]
        (let [res (paginate-spot ticker interval 1 bound-v nil [])]
          (prn ticker interval (count res))
          (write-results-edn
           (str ticker "_spot" "_" interval)
           res)))
      tickers))))

(defn read-results-edn
  [f-name]
  (read-string (slurp (str "resources/db/data/" f-name ".edn"))))



(comment

  (save-data
   "4h"
   ["BTCUSDT"
    "ETHUSDT"
    "ADAUSDT"
    "BNBUSDT"])

  (read-results-edn "BTCUSDT_spot_4h")

  (let [res (paginate-spot "BTCUSDT" "4h" 1 2 nil [])]
    (clojure.pprint/pprint res)
    (count res))


  1)

(defn ohcl-bybit-v5
  "Kline interval. 1,3,5,15,30,60,120,240,360,720,D,M,W"
  [interval ticker]
  (let [url (format
             "https://api.bybit.com/v5/market/kline?category=linear&symbol=%s&interval=%s&limit=500"
             ticker
             interval)
        data (get-request url)
        coll (->> data
                  :result
                  :list
                  (sort-by first)
                  (mapv
                   (fn [[start open high low close volume]]
                     {:time (Long/valueOf start)
                      :startTime (str (java.util.Date. (Long/valueOf start)))
                      :open (Double/parseDouble open)
                      :high (Double/parseDouble high)
                      :low (Double/parseDouble low)
                      :close (Double/parseDouble close)
                      :volume (Double/parseDouble volume)
                      :market ticker
                      :resolution interval
                      :exchange "BB"})))]
    coll))

(defn time-mappings
  [ts]
  (let [{:keys [date month year time]} (bean ts)]
    {:dt date
     :mnth (inc month)
     :yr (+ year 1900)
     :unix-timestamp time}))

(defn- manual-ds
  [ts]
  (let [o (time-mappings ts)
        d (if (< (:dt o) 10)
            (str "0" (:dt o))
            (:dt o))
        m (if (< (:mnth o) 10)
            (str "0" (:mnth o))
            (:mnth o))]
    (str (:yr o) "-" m "-" d)))

(defn validated-dates
  [x]
  (let [today (manual-ds (java.util.Date.))
        ts (manual-ds (java.util.Date. (Long/valueOf (:time x))))]
    (if (= today ts)
      x
      ; TODO log to DISCORD
      (throw (Exception. "Date is not today")))))

(defn binance-spot [interval ticker]
  (let [url (format
             "https://api.binance.com/api/v3/klines?limit=300&symbol=%s&interval=%s"
             ticker
             interval)
        data (get-request url)]
    (fin-data ticker interval data)))

(comment
  (quot (System/currentTimeMillis) 1000)

  (let [today (manual-ds (java.util.Date.))
        ts (manual-ds (java.util.Date. (Long/valueOf 1690761600000)))]
    (validated-dates 1690675200000))

  (let [interval "240"
        ticker "XRPUSDT"]
    (clojure.pprint/pprint
     (take-last 2 (ohcl-bybit-v5 interval ticker))))


  (let [interval "4h"
        ticker "XRPUSDT"]
    (clojure.pprint/pprint
     (take-last 2 (binance-spot interval ticker))))

  1)
