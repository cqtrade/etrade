(ns rsignals.utils)

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

  (prn (getTimeInUTC))

  1)
