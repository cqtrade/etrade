(ns rsignals.engine4.envs
  (:require [clojure.pprint :as pprint]
            [clojure.string :as str]
            [rsignals.tools.discord :as discord]))

(defn get-tickers
  []
  (let [tickers-str (or #_"FILUSDT,NOTUSDT,TIAUSDT,ENAUSDT"
                     (System/getenv "TICKERS_D_BB")
                        "BTCUSDT,ETHUSDT,XRPUSDT,LTCUSDT,ADAUSDT,XLMUSDT,BNBUSDT,FTMUSDT,LINKUSDT,MATICUSDT,DOGEUSDT,COMPUSDT,BCHUSDT,HBARUSDT,SOLUSDT,AAVEUSDT,MKRUSDT,AVAXUSDT,INJUSDT,UNIUSDT,DOTUSDT,SANDUSDT,RUNEUSDT,1000PEPEUSDT,WIFUSDT,1000BONKUSDT,TONUSDT,WLDUSDT,NEARUSDT,ORDIUSDT,FILUSDT,NOTUSDT,ONDOUSDT,ARBUSDT,TIAUSDT,ENAUSDT"
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
        tickers-main (vec (distinct (str/split tickers-str #",")))]
    tickers-main))

(defn get-params-long
  []
  (let [tdfi-p (if (System/getenv "FL_TDFI_P")
                 (Integer/parseInt (System/getenv "FL_TDFI_P"))
                 9)
        tdfi-level (if (System/getenv "FL_TDFI_LEVEL")
                     (Double/parseDouble (System/getenv "FL_TDFI_LEVEL"))
                     0.9)

        tdfi-cross (if (System/getenv "FL_TDFI_CROSS")
                     (Integer/parseInt (System/getenv "FL_TDFI_CROSS"))
                     4)

        rex-p (if (System/getenv "FL_REX_P")
                (Integer/parseInt (System/getenv "FL_REX_P"))
                5)

        rex-sp (if (System/getenv "FL_REX_SP")
                 (Integer/parseInt (System/getenv "FL_REX_SP"))
                 5)

        atr-multiple (if (System/getenv "FL_ATR_MULTIPLE")
                       (Integer/parseInt (System/getenv "FL_ATR_MULTIPLE"))
                       10)

        baseline-p (if (System/getenv "FL_BASELINE_P")
                     (Integer/parseInt (System/getenv "FL_BASELINE_P"))
                     20)
        baseline-type (if (System/getenv "FL_BASELINE_TYPE")
                        (System/getenv "FL_BASELINE_TYPE")
                        "sma")
        baseline-cross (if (System/getenv "FL_BASELINE_CROSS")
                         (Integer/parseInt (System/getenv "FL_BASELINE_CROSS"))
                         0)
        tpcoef (if (System/getenv "FL_TPCOEF")
                 (Double/parseDouble (System/getenv "FL_TPCOEF"))
                 1.0)
        slcoef (if (System/getenv "FL_SLCOEF")
                 (Double/parseDouble (System/getenv "FL_SLCOEF"))
                 1.0)
        risk (if (System/getenv "FL_RISK")
               (Double/parseDouble (System/getenv "FL_RISK"))
               1.0)]
    {:tdfi-p tdfi-p
     :tdfi-level tdfi-level
     :tdfi-cross tdfi-cross
     :rex-p rex-p
     :rex-sp rex-sp
     :atr-multiple atr-multiple
     :baseline-p baseline-p
     :baseline-type baseline-type
     :baseline-cross baseline-cross
     :tpcoef tpcoef
     :slcoef slcoef
     :risk risk}))

(defn get-params-short
  []
  (let [tdfi-p (if (System/getenv "FS_TDFI_P")
                 (Integer/parseInt (System/getenv "FS_TDFI_P"))
                 9)
        tdfi-level (if (System/getenv "FS_TDFI_LEVEL")
                     (Double/parseDouble (System/getenv "FS_TDFI_LEVEL"))
                     0.9)

        tdfi-cross (if (System/getenv "FS_TDFI_CROSS")
                     (Integer/parseInt (System/getenv "FS_TDFI_CROSS"))
                     4)

        rex-p (if (System/getenv "FS_REX_P")
                (Integer/parseInt (System/getenv "FS_REX_P"))
                5)

        rex-sp (if (System/getenv "FS_REX_SP")
                 (Integer/parseInt (System/getenv "FS_REX_SP"))
                 5)

        atr-multiple (if (System/getenv "FS_ATR_MULTIPLE")
                       (Integer/parseInt (System/getenv "FS_ATR_MULTIPLE"))
                       10)

        baseline-p (if (System/getenv "FS_BASELINE_P")
                     (Integer/parseInt (System/getenv "FS_BASELINE_P"))
                     20)
        baseline-type (if (System/getenv "FS_BASELINE_TYPE")
                        (System/getenv "FS_BASELINE_TYPE")
                        "sma")
        baseline-cross (if (System/getenv "FS_BASELINE_CROSS")
                         (Integer/parseInt (System/getenv "FS_BASELINE_CROSS"))
                         0)
        tpcoef (if (System/getenv "FS_TPCOEF")
                 (Double/parseDouble (System/getenv "FS_TPCOEF"))
                 1.0)
        slcoef (if (System/getenv "FS_SLCOEF")
                 (Double/parseDouble (System/getenv "FS_SLCOEF"))
                 1.0)
        risk (if (System/getenv "FS_RISK")
               (Double/parseDouble (System/getenv "FS_RISK"))
               1.0)]
    {:tdfi-p tdfi-p
     :tdfi-level tdfi-level
     :tdfi-cross tdfi-cross
     :rex-p rex-p
     :rex-sp rex-sp
     :atr-multiple atr-multiple
     :baseline-p baseline-p
     :baseline-type baseline-type
     :baseline-cross baseline-cross
     :tpcoef tpcoef
     :slcoef slcoef
     :risk risk}))

(defn get-dynamic-tickers-vol
  []
  (let [tickrs (get-tickers)]
    (try
      (discord/log (with-out-str
                     (pprint/print-table
                      (map-indexed
                       (fn [idx x]
                         {:idx (inc idx)
                          :symbol x})
                       tickrs))))
      (catch Exception e
        (prn (str "EXCEPTION dynamic tickers vol: " (.getMessage e)))))))

(defn print-envs
  []
  (prn "########### 4H ###########")
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

  (print-envs)

  1)
