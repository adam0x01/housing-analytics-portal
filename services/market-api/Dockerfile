FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY services/market-api/pom.xml ./pom.xml
RUN mvn -B -q dependency:go-offline
COPY services/market-api/src ./src
COPY services/market-api/HealthCheck.java ./HealthCheck.java
COPY data/house-prices.csv /data/house-prices.csv
RUN mvn -B -q verify -Dmarket.dataset-path=/data/house-prices.csv && javac --release 21 HealthCheck.java

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid app --no-create-home app
COPY --from=build /build/target/market-api-0.1.0.jar /app/market-api.jar
COPY --from=build /build/HealthCheck.class /app/HealthCheck.class
COPY data/house-prices.csv /app/data/house-prices.csv
ENV DATASET_PATH=/app/data/house-prices.csv PORT=8002
USER 10001:10001
EXPOSE 8002
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=4 \
    CMD ["java", "-cp", "/app", "HealthCheck"]
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/market-api.jar"]
