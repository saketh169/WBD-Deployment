#!/bin/bash

# ==========================================
# Redis & MongoDB Benchmark - Quick Setup
# ==========================================

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║      REDIS & MONGODB BENCHMARK - SETUP HELPER             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

echo "📦 Checking dependencies..."

# Check Docker
if docker ps &> /dev/null; then
    echo "✅ Docker is available"
else
    echo "⚠️  Docker daemon not running. Start Docker first."
    exit 1
fi

# Offer options
echo ""
echo "Select benchmark scenario:"
echo "1) Local Redis only (Docker)"
echo "2) Local Redis + Redis Cloud"
echo "3) All three (Local Redis + Redis Cloud + MongoDB Atlas)"
echo "4) Just run benchmark (assuming .env is configured)"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting Local Redis (Docker)..."
        
        # Check if redis container already exists
        if docker ps -a | grep -q redis-bench; then
            echo "   Removing existing redis-bench container..."
            docker stop redis-bench 2>/dev/null
            docker rm redis-bench 2>/dev/null
        fi
        
        # Start Redis
        docker run -d \
            --name redis-bench \
            -p 6379:6379 \
            redis:7-alpine
        
        echo "✅ Redis started on localhost:6379"
        echo ""
        echo "Running benchmark..."
        npm run benchmark:redis
        
        echo ""
        echo "🧹 Cleaning up..."
        docker stop redis-bench
        docker rm redis-bench
        ;;
        
    2)
        echo ""
        echo "⚠️  Make sure you have updated .env with REDIS_CLOUD_URL"
        read -p "Press Enter to continue..."
        
        echo "🚀 Starting Local Redis (Docker)..."
        if docker ps -a | grep -q redis-bench; then
            docker stop redis-bench 2>/dev/null
            docker rm redis-bench 2>/dev/null
        fi
        
        docker run -d \
            --name redis-bench \
            -p 6379:6379 \
            redis:7-alpine
        
        echo "✅ Redis started on localhost:6379"
        echo ""
        echo "Running benchmark..."
        npm run benchmark:redis
        
        echo ""
        echo "🧹 Cleaning up..."
        docker stop redis-bench
        docker rm redis-bench
        ;;
        
    3)
        echo ""
        echo "⚠️  Make sure you have updated .env with ALL:"
        echo "   - REDIS_LOCAL_HOST and REDIS_LOCAL_PORT"
        echo "   - REDIS_CLOUD_URL"
        echo "   - MONGODB_URL or MONGODB_ATLAS_URL"
        read -p "Press Enter to continue..."
        
        echo "🚀 Starting Local Redis (Docker)..."
        if docker ps -a | grep -q redis-bench; then
            docker stop redis-bench 2>/dev/null
            docker rm redis-bench 2>/dev/null
        fi
        
        docker run -d \
            --name redis-bench \
            -p 6379:6379 \
            redis:7-alpine
        
        echo "✅ Redis started on localhost:6379"
        echo ""
        echo "Running benchmark..."
        npm run benchmark:redis
        
        echo ""
        echo "🧹 Cleaning up..."
        docker stop redis-bench
        docker rm redis-bench
        ;;
        
    4)
        echo ""
        echo "Running benchmark..."
        npm run benchmark:redis
        ;;
        
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Done! Check logs/ folder for detailed reports."
