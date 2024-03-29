(ns rsignals.engine.envs
  (:require [clojure.pprint :as pprint]
            [clojure.string :as str]
            [rsignals.tools.ohlc :as ohlc]
            [rsignals.tools.discord :as discord]))

(defn get-params-long
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
        tpcoef (if (System/getenv "TPCOEF")
                 (Double/parseDouble (System/getenv "TPCOEF"))
                 1.0)
        slcoef (if (System/getenv "SLCOEF")
                 (Double/parseDouble (System/getenv "SLCOEF"))
                 1.0)
        atr-multiple (if (System/getenv "ATR_MULTIPLE")
                       (Integer/parseInt (System/getenv "ATR_MULTIPLE"))
                       -1)
        risk (if (System/getenv "RISK")
               (Double/parseDouble (System/getenv "RISK"))
               1.0)]
    {:tdfi-p tdfi-p
     :tdfi-level tdfi-level
     :rex-p rex-p
     :rex-sp rex-sp
     :atr-multiple atr-multiple
     :tpcoef tpcoef
     :slcoef slcoef
     :risk risk}))

(defn get-params-short
  []
  (let [tdfi-p (if (System/getenv "S_TDFI_P")
                 (Integer/parseInt (System/getenv "S_TDFI_P"))
                 10)
        tdfi-level (if (System/getenv "S_TDFI_LEVEL")
                     (Double/parseDouble (System/getenv "S_TDFI_LEVEL"))
                     -0.45)
        rex-p (if (System/getenv "S_REX_P")
                (Integer/parseInt (System/getenv "S_REX_P"))
                5)
        rex-sp (if (System/getenv "S_REX_SP")
                 (Integer/parseInt (System/getenv "S_REX_SP"))
                 5)
        conf-p (if (System/getenv "S_CONF_P")
                 (Integer/parseInt (System/getenv "S_CONF_P"))
                 10)
        conf-cross (if (System/getenv "S_CONF_CROSS")
                     (Integer/parseInt (System/getenv "S_CONF_CROSS"))
                     -1)
        tpcoef (if (System/getenv "S_TPCOEF")
                 (Double/parseDouble (System/getenv "S_TPCOEF"))
                 1.0)
        slcoef (if (System/getenv "S_SLCOEF")
                 (Double/parseDouble (System/getenv "S_SLCOEF"))
                 1.0)
        risk (if (System/getenv "S_RISK")
               (Double/parseDouble (System/getenv "S_RISK"))
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

(defn get-tickers*
  []
  (let [tickers-str (or (System/getenv "TICKERS_D_BB")
                        (str/join "," ["BTCUSDT"
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
        tickers-main (vec (set (str/split tickers-str #",")))]
    (try
      (let [api-key (System/getenv "API_KEY")
            api-secret (System/getenv "API_SECRET")
            tickers-pos (ohlc/current-positions api-key api-secret)]
        (distinct (concat tickers-pos tickers-main)))
      (catch Exception e
        (discord/log
         (str "EXCEPTION dynamic tickers: " (.getMessage e)))
        tickers-main))))

(defn get-dynamic-tickers-vol
  []
  (let [length (if (System/getenv "DYNAMIC_TICKERS_LENGTH")
                 (Integer/parseInt
                  (System/getenv "DYNAMIC_TICKERS_LENGTH"))
                 30)
        tickers-vol-ms (ohlc/get-tickers-by-vol-desc length)]
    (try
      (discord/log (with-out-str
                     (pprint/print-table
                      (map-indexed
                       (fn [idx x]
                         {:idx (inc idx)
                          :symbol (:symbol x)})
                       tickers-vol-ms))))
      (catch Exception e
        (prn (str "EXCEPTION dynamic tickers vol: " (.getMessage e)))))
    (map :symbol
         tickers-vol-ms)))

(defn get-dynamic-tickers
  []
  (let [api-key (System/getenv "API_KEY")
        api-secret (System/getenv "API_SECRET")
        tickers-pos (ohlc/current-positions api-key api-secret)
        tickers-vol (get-dynamic-tickers-vol)]
    (distinct (concat tickers-pos tickers-vol))))

(comment
  (clojure.pprint/pprint (count (get-dynamic-tickers)))
  (clojure.pprint/pprint (get-dynamic-tickers))
  1)

(defn get-tickers
  []
  (if (System/getenv "DYNAMIC_TICKERS_D_BB")
    (try
      (get-dynamic-tickers)
      (catch Exception e
        (discord/log
         (str "EXCEPTION dynamic tickers: " (.getMessage e)))
        (get-tickers*)))
    (get-tickers*)))

(defn print-envs
  []
  (prn "########### Daily ###########")
  (pprint/pprint (get-tickers))
  (pprint/pprint (get-params-long))
  (pprint/pprint (get-params-short))
  (prn "######################"))

(defn log-boot-long
  []
  (discord/log ["LONG" (get-params-long)]))

(defn log-boot-short
  []
  (discord/log ["SHORT" (get-params-short)]))

(comment
  (clojure.pprint/pprint (get-tickers))

  (print-envs)
  (discord/log (log-boot-long))
  (discord/loop-messages*)

  (str/join "," ["BTCUSDT"
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
                 "RUNEUSDT"])
  1)
