FROM amazoncorretto:21-alpine-jdk
EXPOSE 8080
ADD ./target/gestion-ventas-0.0.1-SNAPSHOT.jar gestion-ventas.jar

ENTRYPOINT ["java", "-jar", "gestion-ventas.jar"]