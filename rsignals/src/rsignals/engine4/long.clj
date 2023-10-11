(ns rsignals.engine4.long
  (:require [clojure.pprint :as pprint]
            [rsignals.tools.crosses :as crosses]
            [rsignals.tools.ohlc :as ohlc]
            [rsignals.tools.ta :as ta]))

(defn prep-datasets
  [xs]
  (let [length (count xs)]
    (->> xs
         flatten
         (group-by :time)
         vals
         (remove #(< (count %) length))
         flatten
         (group-by :market)
         vals
         (mapv #(vec (sort-by :time %))))))

(def skip-bars 50)

(defn indicators
  [{:keys [tdfi-p rex-p rex-sp baseline-p baseline-type
           tpcoef slcoef risk]} coll]
  (let [closes (mapv :close coll)
        tdfis (ta/tdfi tdfi-p closes)
        rexs (ta/rex-sma rex-p coll)
        rex-sigss (ta/sma rex-sp rexs)
        baselines (case baseline-type
                    "sma" (ta/sma baseline-p closes)
                    "ema" (ta/ema baseline-p closes)
                    "hull" (ta/hull baseline-p closes)
                    "donchian" (ta/donchian baseline-p coll)
                    "tenkan" (ta/tenkan baseline-p closes)
                    "vwma" (ta/vwma baseline-p :close coll)
                    (throw (Exception. "unknown baseline-type")))
        atrs (ta/atr 14 coll)]
    (mapv
     (fn [d tdfi rex rex-sig baseline atr]
       (merge d {:tdfi tdfi
                 :rex rex
                 :rex-sig rex-sig
                 :baseline baseline
                 :atr atr
                 :atrtp (* atr tpcoef)
                 :atrsl (* atr slcoef)
                 :risk risk
                 :ticker (:market d)}))
     coll
     tdfis
     rexs
     rex-sigss
     baselines
     atrs)))

(defn strategy
  [{:keys [tdfi-level baseline-cross tdfi-cross atr-multiple]} coll]
  (map-indexed
   (fn [idx curr]
     (if (< idx skip-bars)
       curr
       (try
         (let [exit-buy (or (crosses/crossunder0 :rex :rex-sig idx coll)
                            (crosses/crossunder0 :close :baseline idx coll))
               close>baseline (crosses/crossover :close :baseline baseline-cross idx coll)
               tdfi>level (crosses/crossover :tdfi tdfi-level tdfi-cross idx coll)
               trade-natural? (crosses/trade-natural? atr-multiple idx coll)
               buy (and (not exit-buy)
                        trade-natural?
                        tdfi>level
                        close>baseline)
               sig (cond buy 1 exit-buy -2 :else 0)]
           (merge curr {:buy buy :exit-buy exit-buy :sig sig}))
         (catch Exception e
           (prn e (str "Exception 4 long strategy: " (.getMessage e)))
           curr))))
   coll))

(defn e-indies [t-args xs-prepped]
  (let [xs-indicators (doall (map #(indicators t-args %) xs-prepped))]
    (doall
     (map
      #(let [xs (strategy t-args %)]
         xs)
      xs-indicators))))

(defn signals
  [t-args xss]
  (let [xss-prepped (->> xss
                         (filter #(> (count %) 70))
                         prep-datasets)]
    (mapv #(e-indies % xss-prepped) [t-args])))

(defn get-quotas
  [interval tickers]
  (->> tickers
       (mapv
        (fn [ticker]
          (Thread/sleep 133)
          (try
            (ohlc/binance-spot interval ticker)
            (catch Exception e
              (println "error" ticker (-> e .getMessage))
              (flush)
              (Thread/sleep 1000)
              []))))
       (remove empty?)))

(comment
  (let [interval "4h"
        tickers ["ARBUSDT"]]
    (get-quotas interval tickers))
  1)

(defn get-signals
  [t-args]
  (let [interval "4h"
        tickers (->> ["ARBUSDT"
                      "CRVUSDT"

                      "THETAUSDT"
                      "IMXUSDT"
                      "FLMUSDT"
                      "STMXUSDT"
                      "TRBUSDT"
                      "KNCUSDT"
                      "FRONTUSDT"
                      "BLZUSDT"

                      "BTCUSDT"
                      "ETHUSDT"
                      "XRPUSDT"
                      "LTCUSDT"
                      "ADAUSDT"
                      "XLMUSDT"
                      "BNBUSDT"

                     ; < x 1500
                      "FTMUSDT"
                      "LINKUSDT"
                      "MATICUSDT"
                      "DOGEUSDT"
                      "COMPUSDT"
                      "BCHUSDT"
                      "HBARUSDT"

                      ; < x 1000
                      "SOLUSDT"
                      "AAVEUSDT"
                      "MKRUSDT"
                      "AVAXUSDT"
                      "INJUSDT"
                      "UNIUSDT"
                      "DOTUSDT"
                      "SANDUSDT"
                      "RUNEUSDT"]
                     set
                     vec)
        xss (get-quotas interval tickers)
        _ (prn "Quotas long received" (count xss))
        prepared-signals (try
                           (->> xss
                                (signals t-args)
                                (mapv (fn [x] (mapv last x)))
                                flatten
                                (map ohlc/validated-dates)
                                (remove #(nil? (:sig %))))
                           (catch Exception e
                             (prn e
                                  (str "Exception sigs: " (.getMessage e)))
                             []))]
    (pprint/pprint prepared-signals)
    (prn "Signals long processed" (count prepared-signals))
    prepared-signals))
