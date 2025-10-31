# FROM openjdk:17-slim

# RUN apt-get update && apt-get install -y \
#     time \
#     && rm -rf /var/lib/apt/lists/*

# WORKDIR /code

# ENV MEMORY_LIMIT=512m
# ENV TIME_LIMIT=10

# CMD ["java"]


FROM eclipse-temurin:17-jdk-alpine

RUN apk add --no-cache \
    time \
    bash

WORKDIR /code

ENV MEMORY_LIMIT=512m
ENV TIME_LIMIT=10

CMD ["java"]