(ns rsignals.tools.crosses)

(defn cross
  [kw1 k2 crossx curr-idx coll]
  (if-not (and (> curr-idx 0)
               (> curr-idx crossx))
    nil
    (let [coll (if (vector? coll) coll (vec coll))
          start-idx (- curr-idx (inc crossx))
          end-idx (inc curr-idx)
          subcoll (subvec coll
                          start-idx
                          end-idx)]
      (->> subcoll
           (map-indexed
            (fn [i _]
              (if (zero? i)
                nil
                (let [a1 (-> subcoll (nth (dec i)) (get kw1))
                      a0 (-> subcoll (nth i) (get kw1))
                      [b0 b1] (if (number? k2)
                                [k2 k2]
                                [(-> subcoll (nth i) (get k2))
                                 (-> subcoll (nth (dec i)) (get k2))])]
                  (or (and (<= a1 b1) (> a0 b0))
                      (and (>= a1 b1) (< a0 b0)))))))
           (some true?)
           boolean))))

(defn crossunder
  [kw1 k2 crossx curr-idx coll]
  (if (== crossx -1)
    true
    (if-not (and (> curr-idx 0)
                 (> curr-idx crossx))
      nil
      (let [coll (if (vector? coll) coll (vec coll))
            start-idx (- curr-idx (inc crossx))
            end-idx (inc curr-idx)
            subcoll (subvec coll
                            start-idx
                            end-idx)]
        (->> subcoll
             (map-indexed
              (fn [i _]
                (if (zero? i)
                  nil
                  (let [a1 (-> subcoll (nth (dec i)) (get kw1))
                        a0 (-> subcoll (nth i) (get kw1))
                        [b0 b1] (if (number? k2)
                                  [k2 k2]
                                  [(-> subcoll (nth i) (get k2))
                                   (-> subcoll (nth (dec i)) (get k2))])]
                    (and (>= a1 b1) (< a0 b0))))))
             (some true?)
             boolean)))))

(defn crossover
  [kw1 k2 crossx curr-idx coll]
  (if (== crossx -1)
    true
    (if-not (and (> curr-idx 0)
                 (> curr-idx crossx))
      nil
      (let [coll (if (vector? coll) coll (vec coll))
            start-idx (- curr-idx (inc crossx))
            end-idx (inc curr-idx)
            subcoll (subvec coll
                            start-idx
                            end-idx)]
        (->> subcoll
             (map-indexed
              (fn [i _]
                (if (zero? i)
                  nil
                  (let [a0 (-> subcoll (nth i) (get kw1))
                        a1 (-> subcoll (nth (dec i)) (get kw1))
                        [b0 b1] (if (number? k2)
                                  [k2 k2]
                                  [(-> subcoll (nth i) (get k2))
                                   (-> subcoll (nth (dec i)) (get k2))])]
                    (and (<= a1 b1) (> a0 b0))))))
             (some true?)
             boolean)))))

(comment
  (number? [2])
  (let [curr-idx 7
        crossx 6
        k1 :fast
        k2 7 ;:slow
        coll [{:fast 0
               :slow 2}
              {:fast 1
               :slow 2}
              {:fast 2
               :slow 2}
              {:fast 3
               :slow 1}
              {:fast 4
               :slow 1}
              {:fast 5
               :slow 1}
              {:fast 6
               :slow 2}
              {:fast 7
               :slow 3}]]
    (crossover curr-idx crossx k1 k2 coll))


  (let [curr-idx 7
        crossx 1
        k1 :fast
        k2 :slow
        coll [{:fast 0
               :slow 2}
              {:fast 1
               :slow 2}
              {:fast 2
               :slow 2}
              {:fast 3
               :slow 1}
              {:fast 4
               :slow 1}
              {:fast 5
               :slow 1}
              {:fast 6
               :slow 3}
              {:fast 6
               :slow 7}]]
    (crossunder curr-idx crossx k1 k2 coll))

  (let [curr-idx 7
        crossx 1
        k1 :fast
        k2 :slow
        coll [{:fast 0
               :slow 2}
              {:fast 1
               :slow 2}
              {:fast 2
               :slow 2}
              {:fast 3
               :slow 1}
              {:fast 4
               :slow 1}
              {:fast 5
               :slow 1}
              {:fast 6
               :slow 3}
              {:fast 6
               :slow 7}]]
    (cross curr-idx crossx k1 k2 coll))


  (boolean (some true? '(nil false false "true" 1)))

  (subvec  (vec (list 1 2 3 4)) 0 1)

  1)

(defn crossover0
  [kw1 k2 curr-idx coll]
  (let [a0 (-> coll (nth curr-idx) (get kw1))
        a1 (-> coll (nth (- curr-idx 1)) (get kw1))
        [b0 b1] (if (number? k2)
                  [k2 k2]
                  [(-> coll (nth curr-idx) (get k2))
                   (-> coll (nth (- curr-idx 1)) (get k2))])]
    (and
     (> a0 b0)
     (<= a1 b1))))

(defn crossunder0
  [kw1 k2 curr-idx coll]
  (let [a0 (-> coll (nth curr-idx) (get kw1))
        a1 (-> coll (nth (- curr-idx 1)) (get kw1))
        [b0 b1] (if (number? k2)
                  [k2 k2]
                  [(-> coll (nth curr-idx) (get k2))
                   (-> coll (nth (- curr-idx 1)) (get k2))])]
    (and
     (< a0 b0)
     (>= a1 b1))))

(defn buy-natural?
  [atr-multiple idx coll]
  (let [close0 (-> coll (nth idx) :close)
        close1 (-> coll (nth (- idx 1)) :close)
        close-diff (- close0 close1)
        atr0 (-> coll (nth idx) :atr)]
    (if (= atr-multiple -1)
      true
      (< close-diff (* atr-multiple atr0)))))

(defn trade-natural?
  [atr-multiple idx coll]
  (let [close0 (-> coll (nth idx) :close)
        close1 (-> coll (nth (- idx 1)) :close)
        close-diff (if (> close0 close1)
                     (- close0 close1)
                     (- close1 close0))
        atr0 (-> coll (nth idx) :atr)]
    (if (= atr-multiple -1)
      true
      (< close-diff (* atr-multiple atr0)))))

(comment

  (let [atr-multiple 4
        idx 1
        coll [{:close 10
               :atr 1}
              {:close 13
               :atr 1}]]
    (trade-natural? atr-multiple idx coll))

  (let [atr-multiple 4
        idx 1
        coll [{:close 15
               :atr 1}
              {:close 10
               :atr 1}]]
    (trade-natural? atr-multiple idx coll))

  (let [atr-multiple 4
        idx 1
        coll [{:close 14
               :atr 1}
              {:close 10
               :atr 1}]]
    (trade-natural? atr-multiple idx coll))

  (let [atr-multiple 4
        idx 1
        coll [{:close 13
               :atr 1}
              {:close 10
               :atr 1}]]
    (trade-natural? atr-multiple idx coll))

  1)
