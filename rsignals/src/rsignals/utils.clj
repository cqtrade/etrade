(ns rsignals.utils
  (:require
   [java-time.api :as jt]))

(def the-daily-times
  #{"000011"
    "240011"
    "120011"})


(def the-4hourly-times
  #{"000011"
    "120011"
    "040011"
    "080011"
    #_"120011"
    "160011"
    "200011"
    "240011"})

(defn is-time
  []
  (let [now-utc (jt/local-date-time (jt/system-clock "UTC"))
        t-str (str (jt/format "hh" now-utc)
                   (jt/format "mm" now-utc)
                   (jt/format "ss" now-utc))]
    (if (= "4h" (System/getenv "C_INTERVAL"))
      (the-4hourly-times t-str)
      (the-daily-times t-str))))

(comment
  (the-4hourly-times "000012")
  (is-time)

  (let [now-utc (jt/local-date-time (jt/system-clock "UTC"))
        t-str (str (jt/format "hh" now-utc)
                   (jt/format "mm" now-utc)
                   (jt/format "ss" now-utc))]
    (prn t-str))

  (jt/local-date-time
   (jt/offset-date-time 2024 8 26 1 0 1 0))

  (let [t (jt/local-date-time
           (jt/offset-date-time 2024 8 26 16 00 11 0))
        t-str (str (jt/format "hh" t)
                   (jt/format "mm" t)
                   (jt/format "ss" t))]
    (prn t)
    (prn t-str))


  1)
