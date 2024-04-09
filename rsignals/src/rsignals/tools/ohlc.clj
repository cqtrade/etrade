(ns rsignals.tools.ohlc
  (:require [cheshire.core :as json]
            [clj-http.client :as client]
            [clojure.string :as str])
  (:import (javax.crypto Mac)
           [java.security MessageDigest]
           (javax.crypto.spec SecretKeySpec)
           (org.apache.logging.log4j Level LogManager))
  (:import java.util.Base64
           java.nio.charset.StandardCharsets))


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



#_(defn str->base64
    [s]
    (let [encoder (.withoutPadding (Base64/getUrlEncoder))]
      (String. (.encode encoder (.getBytes s)))))

#_(defn hexdigest
    "Returns the hex digest of an object. Expects a string as input."
    ([input] (hexdigest input "SHA-256"))
    ([input hash-algo]
     (if (string? input)
       (let [hash (MessageDigest/getInstance hash-algo)]
         (. hash update (.getBytes input))
         (.digest hash)
         #_(let [digest (.digest hash)]
             (apply str (map #(format "%02x" (bit-and % 0xff)) digest))))
       (do
         (println "Invalid input! Expected string, got" (type input))
         nil))))

#_(defn hmac-sha512 [key input]
    (let [mac (Mac/getInstance "HMACSHA512")
          secretKey (secretKeyInst key mac)]
      (-> (doto mac
            (.init secretKey)
            (.update input))
          .doFinal)))

#_(defn sign-request11 [endpoint nonce postData apiPrivateKey]
    (let [message (str postData nonce endpoint)
          hash (-> (MessageDigest/getInstance "SHA-256")
                   (.digest (.getBytes message StandardCharsets/UTF_8)))
          secretDecoded (.decode (Base64/getDecoder) apiPrivateKey)
          hmacsha512 (Mac/getInstance "HmacSHA512")]
    ;; (.init hmacsha512 (SecretKeySpec. secretDecoded "HmacSHA512"))
      (let [;; hash2 (.doFinal hmacsha512 hash)
            hash2 (hmac-sha512 secretDecoded hash)
            encoded-hash (Base64/getEncoder)
          ;; encoder (.withoutPadding (Base64/getUrlEncoder))
            encoded-hash (.encodeToString hash2)
          ;; encoded-hash (String. (.encode encoder hash2))
            ]
        encoded-hash)))

#_(defn base64->string
    [b64]
    (String. (.decode (Base64/getUrlDecoder) b64)))

(defn sign-message [endpoint nonce post-data api-private-key]
  ; https://github.com/CryptoFacilities/REST-v3-Java/blob/master/Java/cfRestAPIv3/src/com/cryptofacilities/REST/v3/CfApiMethods.java#L82
  ; https://github.com/CryptoFacilities/REST-v3-NodeJs/blob/master/cfRestApiV3.js#L545
  (let [;; Step 1: concatenate postData, nonce + endpoint
        message (str post-data nonce endpoint)
        ;; Step 2: hash the result of step 1 with SHA256
        msg (-> message (.getBytes "UTF-8"))
        hash (MessageDigest/getInstance "SHA-256")
        _ (. hash update msg)
        hash (.digest hash)
        ;; step 3: base64 decode apiPrivateKey
        secret-decoded (.decode (Base64/getDecoder) (.getBytes api-private-key "UTF-8"))
        ;; step 4: use result of step 3 to hash the result of step 2 with HMAC-SHA512
        hmac-sha512 (javax.crypto.Mac/getInstance "HmacSHA512")
        _ (.init hmac-sha512 (javax.crypto.spec.SecretKeySpec. secret-decoded "HmacSHA512"))
        hash2 (.doFinal hmac-sha512 hash)
        ;; step 5: base64 encode the result of step 4 and return
        result (.encodeToString (java.util.Base64/getEncoder)  hash2)]
    result))

(defn get-open-positions-krakem
  []
  (let [p (System/getenv "API_KEY_KRAKEN")
        s (System/getenv "API_SECRET_KRAKEN")
        url "https://futures.kraken.com/derivatives/api/v3/openpositions"
        endpoint "/api/v3/openpositions"
        post-data ""
        nonce (str (System/currentTimeMillis))
        res (client/get
             url
             {:headers {:content-type "application/json"
                        "APIKey" p
                        "Authent" (sign-message endpoint nonce post-data s)
                        "Nonce" nonce}
              :throw-entire-message? true})]
    (json/parse-string (:body res) true)))
;; SEE https://docs.futures.kraken.com/#http-api-trading-v3-api-order-management-send-order
(comment


  {:result "success",
   :openPositions [{:side "long",
                    :symbol "PF_FILUSD",
                    :price 10.834, :fillTime "2024-03-03T21:54:27.672Z",
                    :size 1,
                    :unrealizedFunding -5.936982239961012E-6,
                    :pnlCurrency "USD"}],
   :serverTime "2024-03-03T21:54:27.672Z"}


  1)


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



