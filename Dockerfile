# Etapa 1: Compilación (Build)
FROM maven:3.9.6-amazoncorretto-21 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Etapa 2: Ejecución (Runtime)
FROM amazoncorretto:21-alpine-jdk
WORKDIR /app
COPY --from=build /app/target/gestion-ventas-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]