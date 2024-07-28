(ns rsignals.engine.short
  (:require [rsignals.tools.crosses :as crosses]
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

(def skip-bars 47)

(defn indicators
  [{:keys [tdfi-p rex-p rex-sp conf-p tpcoef slcoef risk]} coll]
  (let [closes (mapv :close coll)
        tdfis (ta/tdfi tdfi-p closes)
        rexs (ta/rex-sma rex-p coll)
        rex-sigss (ta/sma rex-sp rexs)
        confs (ta/ssl*-ema conf-p coll)
        atrs (ta/atr 14 coll)]
    (mapv
     (fn [d tdfi rex rex-sig conf atr]
       (merge d {:tdfi tdfi
                 :rex rex
                 :rex-sig rex-sig
                 :conf conf
                 :atr atr
                 :atrtp (* atr tpcoef)
                 :atrsl (* atr slcoef)
                 :risk risk
                 :ticker (:market d)}))
     coll
     tdfis
     rexs
     rex-sigss
     confs
     atrs)))

(defn strategy
  [{:keys [tdfi-level conf-cross]} coll]
  (map-indexed
   (fn [idx curr]
     (if (< idx skip-bars)
       curr
       (try
         (let [conf<0 (crosses/crossunder :conf 0 conf-cross idx coll)
               tdfi<level (crosses/crossunder0 :tdfi tdfi-level idx coll)
               rex0 (-> coll (nth idx) :rex)
               rex1 (-> coll (nth (- idx 1)) :rex)
               rex-sell (< rex0 rex1)
               sell (and tdfi<level rex-sell conf<0)
               exit-sell (crosses/crossover0 :rex :rex-sig idx coll)
               sig (cond sell -1 exit-sell 2 :else 0)]
           (merge curr {:sell sell :exit-sell exit-sell :sig sig}))
         (catch Exception _
           #_(prn e (str "Exception D short strategy: " (.getMessage e)))
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
                         (filter #(> (count %) 30))
                         prep-datasets)]
    (doall (pmap #(e-indies % xss-prepped) [t-args]))))

(defn get-signals
  [t-args xss]
  (let [prepared-signals (->> xss
                              (signals t-args)
                              (mapv (fn [x] (mapv last x)))
                              flatten
                              #_(map ohlc/validated-dates)
                              (remove #(nil? (:sig %))))]
    (prn "Signals short processed" (count prepared-signals))
    prepared-signals))
