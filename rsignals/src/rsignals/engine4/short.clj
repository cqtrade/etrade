(ns rsignals.engine4.short
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

(def skip-bars 200)

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
  [{:keys [tdfi-level baseline-cross atr-multiple tdfi-cross]} coll]
  (map-indexed
   (fn [idx curr]
     (if (< idx skip-bars)
       curr
       (try
         (let [exit-sell (or (crosses/crossover0 :rex :rex-sig idx coll)
                             (crosses/crossover0 :close :baseline idx coll))
               close<baseline (crosses/crossunder :close :baseline baseline-cross idx coll)
               tdfi<level (crosses/crossunder :tdfi tdfi-level tdfi-cross idx coll)
               trade-natural? (crosses/trade-natural? atr-multiple idx coll)
               sell (and (not exit-sell)
                         trade-natural?
                         tdfi<level
                         close<baseline)
               sig (cond sell -1 exit-sell 2 :else 0)]
           (merge curr {:sell sell :exit-sell exit-sell :sig sig}))
         (catch Exception e
           (prn e (str "Exception 4 short strategy: " (.getMessage e)))
           curr))))
   coll))

(defn e-indies [t-args xs-prepped]
  (let [xs-indicators (doall (map #(indicators t-args %) xs-prepped))]
    (doall
     (mapv
      #(let [xs (strategy t-args %)]
         xs)
      xs-indicators))))

(defn signals
  [t-args xss]
  (let [xss-prepped (->> xss
                         (filter #(> (count %) 70))
                         prep-datasets)]
    (mapv #(e-indies % xss-prepped) [t-args])))

(defn get-signals
  [t-args xss]
  (let [prepared-signals  (try
                            (->> xss
                                 (signals t-args)
                                 (mapv (fn [x] (mapv last x)))
                                 flatten
                                 (remove #(nil? (:sig %))))
                            (catch Exception e
                              (prn e (str "Exception sigs: " (.getMessage e)))
                              []))]
    (pprint/pprint prepared-signals)
    (prn "Signals short processed" (count prepared-signals))
    prepared-signals))
