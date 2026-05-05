# ── Build stage ──────────────────────────────────────────────
FROM gradle:8.13-jdk21 AS build

WORKDIR /app

# Copy the shared OpenAPI spec (needed for code generation)
COPY shared/api-contracts/openapi.yaml /shared/api-contracts/openapi.yaml

# Copy only build files first for better layer caching
COPY backend/build.gradle.kts backend/settings.gradle.kts ./
COPY backend/gradle ./gradle

# Download dependencies (cached unless build files change)
RUN gradle dependencies --no-daemon

# Copy source and build
COPY backend/src ./src
RUN gradle bootJar --no-daemon

# ── Runtime stage ────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the built JAR from the build stage
COPY --from=build /app/build/libs/*.jar app.jar

# Spring Boot default port
EXPOSE 8080

# JVM tuning for containers
ENV JAVA_OPTS="-Xms256m -Xmx512m"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
