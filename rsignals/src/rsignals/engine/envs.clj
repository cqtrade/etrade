(ns rsignals.engine.envs
  (:require [clojure.pprint :as pprint]
            [clojure.string :as str]))

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

(defn get-tickers
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
                                       "RUNEUSDT"]))]
    (vec (set (str/split tickers-str #",")))))


(defn print-envs
  []
  (prn "########### Daily ###########")
  (pprint/pprint (get-tickers))
  (pprint/pprint (get-params-long))
  (pprint/pprint (get-params-short))
  (prn "######################"))

(comment
  (print-envs)

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
