(ns rsignals.tools.ohlc
  (:require [cheshire.core :as json]
            [rsignals.tools.discord :as discord]
            [clj-http.client :as client]
            [clojure.string :as str])
  (:import (javax.crypto Mac)
           (javax.crypto.spec SecretKeySpec)
           (org.apache.logging.log4j Level LogManager)))


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

(defn bytes->hex
  [bytes]
  (apply str (map #(format "%02x" %) bytes)))

(defn bytes->hex* [bytes]
  (apply str (map #(format "%x" %) bytes)))

(defn secretKeyInst [key mac]
  (SecretKeySpec. (.getBytes key) (.getAlgorithm mac)))

(defn hmac-sha256 [key string]
  (let [mac (Mac/getInstance "HMACSHA256")
        secretKey (secretKeyInst key mac)]
    (-> (doto mac
          (.init secretKey)
          (.update (.getBytes string)))
        .doFinal)))


; https://bybit-exchange.github.io/docs/v3/intro
;; # rule:
;; timestamp+api_key+recv_window+queryString

;; # param_str
;; "1658384314791XXXXXXXXXX5000category=option&symbol=BTC-29JUL22-25000-C"

;; # parse
;; timestamp = "1658384314791"
;; api_key = "XXXXXXXXXX"
;; recv_window = "5000"
;; queryString = "category=option&symbol=BTC-29JUL22-25000-C"
;; GET /unified/v3/private/order/list?category=option&symbol=BTC-29JUL22-25000-C HTTP/1.1
;; GET /contract/v3/private/position/list?category=linear HTTP/1.1
;; Host: api-testnet.bybit.com
;; X-BAPI-SIGN: XXXXX
;; X-BAPI-API-KEY: XXXXX
;; X-BAPI-TIMESTAMP: 1673421074950
;; X-BAPI-RECV-WINDOW: 5000
;; Content-Type: application/json

(defn get-bb-positions
  [api-key api-secret]
  (let [timestamp (System/currentTimeMillis)
        recv-window 5000
        query-string "category=linear&settleCoin=USDT"
        message (str timestamp api-key recv-window query-string)
        res (client/get
             (str "https://api.bybit.com/v5/position/list?"
                  query-string)
             {:headers {:content-type "application/json"
                        "X-BAPI-SIGN" (->> message
                                           (hmac-sha256 api-secret)
                                           bytes->hex)
                        "X-BAPI-API-KEY" api-key
                        "X-BAPI-RECV-WINDOW" recv-window
                        "X-BAPI-TIMESTAMP" timestamp}
              :throw-entire-message? true})]
    (json/parse-string (:body res) true)))

(defn handled-positions
  [res]
  (if (-> res :retCode zero?)
    (->> res
         :result
         :list
         (map :symbol))
    (throw (Exception. (str "Error: " (:retMsg res))))))

(defn current-positions
  [api-key api-secret]
  (handled-positions (get-bb-positions api-key api-secret)))


(defn get-tickers-by-vol-desc
  [length]
  (->> "https://api.bybit.com/v5/market/tickers?category=linear"
       get-request
       :result
       :list
       (mapv
        (fn [{:keys [volume24h turnover24h] :as m}]
          (merge m {:volume24hDouble (Double/parseDouble volume24h)
                    :turnover24hDouble (Double/parseDouble turnover24h)})))
       (filter #(str/ends-with? (:symbol %) "USDT"))
       (sort-by :turnover24hDouble >)
       (take length)))

(comment
  (clojure.pprint/pprint
   (map :symbol (get-tickers-by-vol-desc 55)))

  (let [api-key (System/getenv "API_KEY")
        api-secret (System/getenv "API_SECRET")
        xs (current-positions api-key api-secret)]
    (clojure.pprint/pprint xs))

  (bytes->hex
   (hmac-sha256
    "key"
    "The quick brown fox jumps over the lazy dog"))

  (bytes->hex*
   (hmac-sha256
    "key"
    "The quick brown fox jumps over the lazy dog"))

  (println (hmac-sha256
            "key"
            "The quick brown fox jumps over the lazy dog"))

  1)


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
           :endTime (str (java.util.Date. end))
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
             "https://api.bybit.com/v5/market/kline?category=linear&symbol=%s&interval=%s&limit=200"
             ticker
             interval)
        data (get-request url)
        coll (->> data
                  :result
                  :list
                  (sort-by first)
                  (mapv
                   (fn [[start open high low close volume #_turnover]]
                     {:time (Long/valueOf start)
                      :startTime (str (java.util.Date. (Long/valueOf start)))
                      :open (Double/parseDouble open)
                      :high (Double/parseDouble high)
                      :low (Double/parseDouble low)
                      :close (Double/parseDouble close)
                      :volume (Double/parseDouble volume)
                      ;; :end end
                      ;; :endTime (str (java.util.Date. end))
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
      (discord/log ["Date is not today" (:symbol x) today ts])
      #_(prn "Date is not today" (:symbol x) today ts)

      #_(throw (Exception. "Date is not today")))))

#_(defn binance-spot* [interval ticker]
    (let [url (format
               "https://api.binance.com/api/v3/klines?limit=300&symbol=%s&interval=%s"
               ticker
               interval)
          data (get-request url)]
      (fin-data ticker interval data)))

(defn binance-spot [interval ticker]
  (let [url (format
             "https://fapi.binance.com/fapi/v1/klines?limit=300&symbol=%s&interval=%s"
             ticker
             interval)
        data (get-request url)]
    (fin-data ticker interval data)))

(comment
  (quot (System/currentTimeMillis) 1000)

  (let [today (manual-ds (java.util.Date.))
        ts (manual-ds (java.util.Date. (Long/valueOf 1690761600000)))]
    (validated-dates {:time 1690675200000}))

  (let [interval "240"
        ticker "XRPUSDT"]
    (clojure.pprint/pprint
     (take-last 2 (ohcl-bybit-v5 interval ticker))))


  (let [interval "4h"
        #_#_ticker "XRPUSDT"]
    #_(clojure.pprint/pprint
       (take-last 1 (binance-spot interval ticker)))



    (map
     (fn [ticker]
       (let [res (binance-spot interval ticker)]
         (prn (count res))
         (clojure.pprint/pprint
          (take-last 1 res))))
     ["BTCUSDT"
      "ETHUSDT"
      "XRPUSDT"
      "LTCUSDT"
      "ADAUSDT"
      "XLMUSDT"
      "BNBUSDT"

      "FTMUSDT"
      "LINKUSDT"
      "MATICUSDT"
      "DOGEUSDT"
      "COMPUSDT"
      "BCHUSDT"
      "HBARUSDT"

      "SOLUSDT"
      "AAVEUSDT"
      "MKRUSDT"
      "AVAXUSDT"
      "INJUSDT"
      "UNIUSDT"
      "DOTUSDT"
      "SANDUSDT"
      "RUNEUSDT"]))



  1)

(comment
  (let [xs ["BTCUSDT"
            "ETHUSDT"
            "XRPUSDT"
            "LTCUSDT"
            "ADAUSDT"
            "XLMUSDT"
            "BNBUSDT"

            "FTMUSDT"
            "LINKUSDT"
            "MATICUSDT"
            "DOGEUSDT"
            "COMPUSDT"
            "BCHUSDT"
            "HBARUSDT"

            "SOLUSDT"
            "AAVEUSDT"
            "MKRUSDT"
            "AVAXUSDT"
            "INJUSDT"
            "UNIUSDT"
            "DOTUSDT"
            "SANDUSDT"
            "RUNEUSDT"

                            ; https://www.coinglass.com/FundingRateHeatMap
            ;; "BTCUSDT"
            ;; "ETHUSDT"
            ;; "BNBUSDT"
            ;; "SOLUSDT"
            ;; "XRPUSDT"
            ;; "DOGEUSDT"
            ;; "TONUSDT"
            ;; "ADAUSDT"
            ;; "TRXUSDT"
            ;; "AVAXUSDT"
            ;; "1000SHIBUSDT"
            ;; "DOTUSDT"
            ;; "LINKUSDT"
            ;; "BCHUSDT"
            ;; "NEARUSDT"
            ;; "LTCUSDT"
            ;; "MATICUSDT"
            ;; "1000PEPEUSDT"
            ;; "UNIUSDT"
            ;; "ICPUSDT"
            ;; "KASUSDT"
            ;; "ETCUSDT"
            ;; "FETUSDT"
            ;; "APTUSDT"
            ;; "XMRUSDT"

                            ; OI

            "BTCUSDT"
            "ETHUSDT"
            "SOLUSDT"
            "XRPUSDT"
            "DOGEUSDT"
            "BNBUSDT"
            "1000PEPEUSDT"
            "WIFUSDT"
            "1000BONKUSDT"
            "AVAXUSDT"
            "DOTUSDT"
            "TONUSDT"
            "WLDUSDT"
            "BCHUSDT"
            "LTCUSDT"
            "ADAUSDT"
            "LINKUSDT"
            "NEARUSDT"
            "ORDIUSDT"
            "FILUSDT"
            "MATICUSDT"
            "NOTUSDT"
            "ONDOUSDT"
            "MKRUSDT"
            "ARBUSDT"
            "TIAUSDT"
            "ENAUSDT"
            "INJUSDT"
            "FTMUSDT"]

        ys (distinct xs)
        tikcrs-str (str/join "," ys)]
    (prn (count ys))
    tikcrs-str)

  (map
   (fn [ticker]
     (let [res (ohcl-bybit-v5 "D" ticker)]
       (prn (count res))
       (clojure.pprint/pprint
        (take-last 1 res))))
   ["BTCUSDT"
    "ETHUSDT"
    "XRPUSDT"
    "LTCUSDT"
    "ADAUSDT"
    "XLMUSDT"
    "BNBUSDT"

    "FTMUSDT"
    "LINKUSDT"
    "MATICUSDT"
    "DOGEUSDT"
    "COMPUSDT"
    "BCHUSDT"
    "HBARUSDT"

    "SOLUSDT"
    "AAVEUSDT"
    "MKRUSDT"
    "AVAXUSDT"
    "INJUSDT"
    "UNIUSDT"
    "DOTUSDT"
    "SANDUSDT"
    "RUNEUSDT"

                             ; https://www.coinglass.com/FundingRateHeatMap
             ;; "BTCUSDT"
             ;; "ETHUSDT"
             ;; "BNBUSDT"
             ;; "SOLUSDT"
             ;; "XRPUSDT"
             ;; "DOGEUSDT"
             ;; "TONUSDT"
             ;; "ADAUSDT"
             ;; "TRXUSDT"
             ;; "AVAXUSDT"
             ;; "1000SHIBUSDT"
             ;; "DOTUSDT"
             ;; "LINKUSDT"
             ;; "BCHUSDT"
             ;; "NEARUSDT"
             ;; "LTCUSDT"
             ;; "MATICUSDT"
             ;; "1000PEPEUSDT"
             ;; "UNIUSDT"
             ;; "ICPUSDT"
             ;; "KASUSDT"
             ;; "ETCUSDT"
             ;; "FETUSDT"
             ;; "APTUSDT"
             ;; "XMRUSDT"

                             ; OI

    "BTCUSDT"
    "ETHUSDT"
    "SOLUSDT"
    "XRPUSDT"
    "DOGEUSDT"
    "BNBUSDT"
    "1000PEPEUSDT"
    "WIFUSDT"
    "1000BONKUSDT"
    "AVAXUSDT"
    "DOTUSDT"
    "TONUSDT"
    "WLDUSDT"
    "BCHUSDT"
    "LTCUSDT"
    "ADAUSDT"
    "LINKUSDT"
    "NEARUSDT"
    "ORDIUSDT"
    "FILUSDT"
    "MATICUSDT"
    "NOTUSDT"
    "ONDOUSDT"
    "MKRUSDT"
    "ARBUSDT"
    "TIAUSDT"
    "ENAUSDT"
    "INJUSDT"
    "FTMUSDT"])


  1)
