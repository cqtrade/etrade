(ns rsignals.engine.short
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
       (let [conf<0 (crosses/crossunder :conf 0 conf-cross idx coll)
             tdfi<level (crosses/crossunder0 :tdfi tdfi-level idx coll)
             rex0 (-> coll (nth idx) :rex)
             rex1 (-> coll (nth (- idx 1)) :rex)
             rex-sell (< rex0 rex1)
             sell (and tdfi<level rex-sell conf<0)
             exit-sell (crosses/crossover0 :rex :rex-sig idx coll)
             sig (cond sell -1 exit-sell 2 :else 0)]
         (merge curr {:sell sell :exit-sell exit-sell :sig sig}))))
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
    (doall (pmap #(e-indies % xss-prepped) [t-args]))))

(defn get-quotas
  [interval tickers]
  (->> tickers
       (mapv
        (fn [ticker]
          (Thread/sleep 133)
          (try
            (ohlc/ohcl-bybit-v5 interval ticker)
            (catch Exception e
              (println "error" ticker (-> e .getMessage))
              (flush)
              (Thread/sleep 1000)
              []))))
       (remove empty?)))

(comment
  (let [interval "D"
        tickers ["BTCUSDT"
                 "ETHUSDT"
                 "SOLUSDT"
                 "DOGEUSDT"
                 "ADAUSDT"
                 "BNBUSDT"
                 "XRPUSDT"
                 "LTCUSDT"
                 "MATICUSDT"
                 "DOTUSDT"
                 "ATOMUSDT"]]
    (get-quotas interval tickers))
  1)

(defn get-signals
  [t-args]
  (let [interval "D"
        tickers (->> ["BTCUSDT"
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
        prepared-signals (->> xss
                              (signals t-args)
                              (mapv (fn [x] (mapv last x)))
                              flatten
                              (map ohlc/validated-dates)
                              (remove #(nil? (:sig %))))]
    (pprint/pprint prepared-signals)
    (prn "Signals short processed" (count prepared-signals))
    prepared-signals))
