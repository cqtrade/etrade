

(defproject rsignals "0.0.1-SNAPSHOT"
  :description "Signals"
  :url "http://example.com/FIXME"
  :license {:name "Eclipse Public License"
            :url "http://www.eclipse.org/legal/epl-v10.html"}
  :dependencies [[org.clojure/clojure "1.11.1"]
                 [io.pedestal/pedestal.service "0.5.11-beta-1"]

                 ;; Remove this line and uncomment one of the next lines to
                 ;; use Immutant or Tomcat instead of Jetty:
                 [io.pedestal/pedestal.jetty "0.5.11-beta-1"]
                 ;; [io.pedestal/pedestal.immutant "0.5.11-beta-1"]
                 ;; [io.pedestal/pedestal.tomcat "0.5.11-beta-1"]
                 
                 [clojure.java-time/clojure.java-time "1.3.0"]
                 
                 [org.apache.logging.log4j/log4j-api "2.11.0"]
                 [org.apache.logging.log4j/log4j-core "2.11.0"]
                 [org.apache.logging.log4j/log4j-1.2-api "2.11.0"]
                 
                 [ch.qos.logback/logback-classic "1.2.10" :exclusions [org.slf4j/slf4j-api]]
                 [org.slf4j/jul-to-slf4j "1.7.35"]
                 [org.slf4j/jcl-over-slf4j "1.7.35"]
                 [org.slf4j/log4j-over-slf4j "1.7.35"]
                 [clj-http "2.3.0"]
                 [cheshire "5.10.2"]
                 [incanter/incanter "1.5.7"]
                 [org.clojure/core.async "1.5.648"]]
  :min-lein-version "2.0.0"
  :resource-paths ["config", "resources"]
  ;; If you use HTTP/2 or ALPN, use the java-agent to pull in the correct alpn-boot dependency
  ;:java-agents [[org.mortbay.jetty.alpn/jetty-alpn-agent "2.0.5"]]
  :profiles {:dev {:aliases {"run-dev" ["trampoline" "run" "-m" "rsignals.server/run-dev"]}
                   :dependencies [[io.pedestal/pedestal.service-tools "0.5.11-beta-1"]]}
             :uberjar {:aot [rsignals.server]}}
  :main ^{:skip-aot true} rsignals.server)
