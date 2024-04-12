(ns rsignals.engine.long
  (:require [rsignals.tools.crosses :as crosses]
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

(def skip-bars 34)

(defn indicators
  [{:keys [tdfi-p rex-p rex-sp tpcoef slcoef risk]} coll]
  (let [closes (mapv :close coll)
        tdfis (ta/tdfi tdfi-p closes)
        rexs (ta/rex-sma rex-p coll)
        rex-sigss (ta/sma rex-sp rexs)
        atrs (ta/atr 14 coll)]
    (mapv
     (fn [d tdfi rex rex-sig atr]
       (merge d {:tdfi tdfi
                 :rex rex
                 :rex-sig rex-sig
                 :atr atr
                 :atrtp (* atr tpcoef)
                 :atrsl (* atr slcoef)
                 :risk risk
                 :ticker (:market d)}))
     coll
     tdfis
     rexs
     rex-sigss
     atrs)))

(defn strategy
  [{:keys [tdfi-level atr-multiple]} coll]
  (map-indexed
   (fn [idx curr]
     (if (< idx skip-bars)
       curr
       (try
         (let [exit-buy (crosses/crossunder0 :rex :rex-sig idx coll)
               tdfi>level (crosses/crossover0 :tdfi tdfi-level idx coll)
               trade-natural? (crosses/trade-natural? atr-multiple idx coll)
               buy (and (> (:rex curr) (:rex-sig curr))
                        trade-natural?
                        tdfi>level)
               sig (cond buy 1 exit-buy -2 :else 0)]
           (merge curr {:buy buy :exit-buy exit-buy :sig sig}))
         (catch Exception _
           #_(prn e (str "Exception d long strategy: " (.getMessage e)))
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
                              (remove #(nil? (:sig %))))]
    ;; (pprint/pprint prepared-signals)
    (prn "Signals long processed" (count prepared-signals))
    prepared-signals))
