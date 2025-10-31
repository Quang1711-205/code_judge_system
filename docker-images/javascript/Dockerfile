FROM node:18-slim

RUN apt-get update && apt-get install -y \
    time \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /code

ENV MEMORY_LIMIT=256m
ENV TIME_LIMIT=5

CMD ["node"]