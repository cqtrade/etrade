(ns rsignals.engine.long
  (:require
   [rsignals.engine.ohlc :as ohlc]
   [rsignals.engine.ta :as ta]))

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

(def skip-bars 75)

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
       (let [conf0 (-> coll (nth idx) :conf)
             conf1 (-> coll (nth (- idx 1)) :conf)
             conf2 (-> coll (nth (- idx 2)) :conf)
             conf3 (-> coll (nth (- idx 3)) :conf)
             conf4 (-> coll (nth (- idx 4)) :conf)
             conf5 (-> coll (nth (- idx 5)) :conf)
             conf6 (-> coll (nth (- idx 6)) :conf)
             conf7 (-> coll (nth (- idx 7)) :conf)
             conf8 (-> coll (nth (- idx 8)) :conf)
             conf9 (-> coll (nth (- idx 9)) :conf)
             conf10 (-> coll (nth (- idx 10)) :conf)

             cross0 (and (== conf0 1.0) (< conf1 1.0))
             cross1 (and
                     (and (== conf0 1.0) (== conf1 1.0))
                     (and (== conf1 1.0) (< conf2 1.0)))
             cross2 (and
                     (and (== conf0 1.0) (== conf1 1.0))
                     (and (== conf1 1.0) (== conf2 1.0))
                     (and (== conf2 1.0) (< conf3 1.0)))
             cross3 (and
                     (and (== conf0 1.0) (== conf1 1.0))
                     (and (== conf1 1.0) (== conf2 1.0))
                     (and (== conf2 1.0) (== conf3 1.0))
                     (and (== conf3 1.0) (< conf4 1.0)))
             cross4 (and
                     (and (== conf0 1.0) (== conf1 1.0))
                     (and (== conf1 1.0) (== conf2 1.0))
                     (and (== conf2 1.0) (== conf3 1.0))
                     (and (== conf3 1.0) (== conf4 1.0))
                     (and (== conf4 1.0) (< conf5 1.0)))
             cross5 (and
                     (and (== conf0 1.0) (== conf1 1.0))
                     (and (== conf1 1.0) (== conf2 1.0))
                     (and (== conf2 1.0) (== conf3 1.0))
                     (and (== conf3 1.0) (== conf4 1.0))
                     (and (== conf4 1.0) (== conf5 1.0))
                     (and (== conf5 1.0) (< conf6 1.0)))
             cross6 (and
                     (and (== conf0 1.0) (== conf1 1.0))
                     (and (== conf1 1.0) (== conf2 1.0))
                     (and (== conf2 1.0) (== conf3 1.0))
                     (and (== conf3 1.0) (== conf4 1.0))
                     (and (== conf4 1.0) (== conf5 1.0))
                     (and (== conf5 1.0) (== conf6 1.0))
                     (and (== conf6 1.0) (< conf7 1.0)))
             cross7 (and
                     (and (== conf0 1.0) (== conf1 1.0))
                     (and (== conf1 1.0) (== conf2 1.0))
                     (and (== conf2 1.0) (== conf3 1.0))
                     (and (== conf3 1.0) (== conf4 1.0))
                     (and (== conf4 1.0) (== conf5 1.0))
                     (and (== conf5 1.0) (== conf6 1.0))
                     (and (== conf6 1.0) (== conf7 1.0))
                     (and (== conf7 1.0) (< conf8 1.0)))
             cross8 (and
                     (and (== conf0 1.0) (== conf1 1.0))
                     (and (== conf1 1.0) (== conf2 1.0))
                     (and (== conf2 1.0) (== conf3 1.0))
                     (and (== conf3 1.0) (== conf4 1.0))
                     (and (== conf4 1.0) (== conf5 1.0))
                     (and (== conf5 1.0) (== conf6 1.0))
                     (and (== conf6 1.0) (== conf7 1.0))
                     (and (== conf7 1.0) (== conf8 1.0))
                     (and (== conf8 1.0) (< conf9 1.0)))
             cross9 (and
                     (and (== conf0 1.0) (== conf1 1.0))
                     (and (== conf1 1.0) (== conf2 1.0))
                     (and (== conf2 1.0) (== conf3 1.0))
                     (and (== conf3 1.0) (== conf4 1.0))
                     (and (== conf4 1.0) (== conf5 1.0))
                     (and (== conf5 1.0) (== conf6 1.0))
                     (and (== conf6 1.0) (== conf7 1.0))
                     (and (== conf7 1.0) (== conf8 1.0))
                     (and (== conf8 1.0) (== conf9 1.0))
                     (and (== conf9 1.0) (< conf10 1.0)))

             conf-buy (case conf-cross
                        -1 true
                        0 cross0
                        1 (or cross0 cross1)
                        2 (or cross0 cross1 cross2)
                        3 (or cross0 cross1 cross2 cross3)
                        4 (or cross0 cross1 cross2 cross3 cross4)
                        5 (or cross0 cross1 cross2 cross3 cross4 cross5)
                        6 (or cross0 cross1 cross2 cross3 cross4 cross5 cross6)
                        7 (or cross0 cross1 cross2 cross3 cross4 cross5 cross6 cross7)
                        8 (or cross0 cross1 cross2 cross3 cross4 cross5 cross6 cross7 cross8)
                        9 (or cross0 cross1 cross2 cross3 cross4 cross5 cross6 cross7 cross8 cross9))

             tdfi0 (-> coll (nth idx) :tdfi)
             tdfi1 (-> coll (nth (- idx 1)) :tdfi)

             buy (and
                  (>= tdfi0 tdfi-level)
                  (< tdfi1 tdfi-level)
                  conf-buy)

             rex0 (-> coll (nth idx) :rex)
             rex-sig0 (-> coll (nth idx) :rex-sig)
             rex1 (-> coll (nth (- idx 1)) :rex)
             rex-sig1 (-> coll (nth (- idx 1)) :rex-sig)

             exit-buy (and
                       (< rex0 rex-sig0)
                       (> rex1 rex-sig1))
             sig (cond
                   buy 1
                   exit-buy -2
                   :else 0)]
         (merge curr {:buy buy
                      :exit-buy exit-buy
                      :sig sig}))))
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
  (let [xss-prepped (prep-datasets xss)]
    (doall (pmap #(e-indies % xss-prepped) [t-args]))))

(defn get-signals
  [t-args]
  (let [xss [(ohlc/ohcl-bybit-v5 "BTCUSDT" "240")
             (ohlc/ohcl-bybit-v5 "ETHUSDT" "240")
             (ohlc/ohcl-bybit-v5 "SOLUSDT" "240")
             (ohlc/ohcl-bybit-v5 "DOGEUSDT" "240")
             (ohlc/ohcl-bybit-v5 "ADAUSDT" "240")
             (ohlc/ohcl-bybit-v5 "BNBUSDT" "240")
             (ohlc/ohcl-bybit-v5 "XRPUSDT" "240")
             (ohlc/ohcl-bybit-v5 "LTCUSDT" "240")]]
    (->> xss
         (signals t-args)
         (mapv (fn [x] (mapv last x)))
         flatten)))
