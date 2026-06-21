# ==========================================
# Stage 1: Build stage
# ==========================================
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Copy pom.xml to download dependencies first (optimizing Docker cache layers)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy the rest of the source code and compile the application
COPY src ./src
RUN mvn clean package -DskipTests

# ==========================================
# Stage 2: Runtime stage
# ==========================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a non-root user and group to run the app securely
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy the built jar file from the build stage (glob pattern ensures it works even if version changes)
COPY --from=build /app/target/*.jar app.jar

# Expose the port defined in application.properties (8080)
EXPOSE 8080

# Run the Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]
