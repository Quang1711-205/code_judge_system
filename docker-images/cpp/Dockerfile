FROM gcc:11.2

# Cài đặt các công cụ cần thiết
RUN apt-get update && apt-get install -y \
    time \
    && rm -rf /var/lib/apt/lists/*

# Tạo thư mục làm việc
WORKDIR /code

# Set limits
ENV MEMORY_LIMIT=256m
ENV TIME_LIMIT=5

# Default command
CMD ["bash"]