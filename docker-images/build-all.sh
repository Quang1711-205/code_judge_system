#!/bin/bash

echo "🔨 Building Docker images for Code Judge System..."
echo "================================================"

# Màu sắc cho output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Build C++ image
echo -e "\n${GREEN}[1/4] Building C++ compiler image...${NC}"
docker build -t code-judge-cpp:latest ./cpp
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ C++ image built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build C++ image${NC}"
    exit 1
fi

# Build Python image
echo -e "\n${GREEN}[2/4] Building Python compiler image...${NC}"
docker build -t code-judge-python:latest ./python
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Python image built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build Python image${NC}"
    exit 1
fi

# Build Java image
echo -e "\n${GREEN}[3/4] Building Java compiler image...${NC}"
docker build -t code-judge-java:latest ./java
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Java image built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build Java image${NC}"
    exit 1
fi

# Build JavaScript image
echo -e "\n${GREEN}[4/4] Building JavaScript runtime image...${NC}"
docker build -t code-judge-js:latest ./javascript
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ JavaScript image built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build JavaScript image${NC}"
    exit 1
fi

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}✓ All images built successfully!${NC}"
echo -e "\n📦 Available images:"
docker images | grep code-judge

echo -e "\n💡 Usage:"
echo "   docker run --rm -v \"\$(pwd):/code\" code-judge-cpp:latest g++ -o program main.cpp"
echo "   docker run --rm -v \"\$(pwd):/code\" code-judge-python:latest python3 main.py"