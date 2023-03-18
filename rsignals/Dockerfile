# See https://gist.github.com/n2o/bf1f26d922b29f1f08746188519c4f91
FROM clojure:openjdk-11-lein-slim-buster AS BUILD
COPY . /code
WORKDIR /code
RUN lein uberjar

FROM openjdk:11-jre-slim

# See https://practical.li/blog/posts/build-and-run-clojure-with-multistage-dockerfile/
ENV JDK_JAVA_OPTIONS "-XshowSettings:system -XX:+UseContainerSupport -XX:MaxRAMPercentage=85"

WORKDIR /app
COPY --from=BUILD /code/target/*-standalone.jar ./app.jar
CMD ["java", "-jar", "app.jar"]

# FROM openjdk:8-alpine

# ADD target/rsignals-0.0.1-SNAPSHOT-standalone.jar /rsignals/app.jar

# EXPOSE 8080

# CMD ["java", "-jar", "/rsignals/app.jar"]
