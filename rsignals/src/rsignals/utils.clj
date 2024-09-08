(ns rsignals.utils
  (:require
   [java-time.api :as jt]))

(defn getTimeInUTC
  []
  (let [date (java.util.Date.)
        tz (java.util.TimeZone/getTimeZone "UTC")
        cal (java.util.Calendar/getInstance tz)]
    (.setTime cal date)
    {:h (.get cal java.util.Calendar/HOUR_OF_DAY)
     :m (.get cal java.util.Calendar/MINUTE)
     :s (.get cal java.util.Calendar/SECOND)}))

(comment

  (let [time-map (getTimeInUTC)
        time-string (str (:h time-map) (:m time-map) (:s time-map))]
    time-string)
  1)


(def the-daily-times
  #{"0011"})

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
  (let [time-map (getTimeInUTC)
        time-string (str (:h time-map) (:m time-map) (:s time-map))
        now-utc (jt/local-date-time (jt/system-clock "UTC"))
        t-str (str (jt/format "hh" now-utc)
                   (jt/format "mm" now-utc)
                   (jt/format "ss" now-utc))]
    (if (= "4h" (System/getenv "C_INTERVAL"))
      (the-4hourly-times t-str)
      (the-daily-times time-string))))

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
           (jt/offset-date-time 2024 8 26 00 00 11 0))
        t-str (str (jt/format "h" t)
                   (jt/format "mm" t)
                   (jt/format "ss" t))]
    (prn t)
    (prn t-str))


  1)
