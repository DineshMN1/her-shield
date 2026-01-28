#!/bin/bash

echo "🧹 Starting complete clean build process..."

# 1. Stop and remove all Docker containers
echo "📦 Stopping Docker containers..."
cd infra
docker-compose down -v

# 2. Clean Docker completely
echo "🐳 Cleaning Docker system..."
docker system prune -af --volumes
docker builder prune -af

# 3. Remove all node_modules and build artifacts
echo "🗑️  Removing node_modules and build artifacts..."
cd ..

# Remove all node_modules
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +

# Remove all .next directories
find . -name ".next" -type d -prune -exec rm -rf '{}' +

# Remove all dist directories
find . -name "dist" -type d -prune -exec rm -rf '{}' +

# Remove all .turbo cache
find . -name ".turbo" -type d -prune -exec rm -rf '{}' +

# Remove package-lock files
find . -name "package-lock.json" -type f -delete

# 4. Fresh npm install
echo "📥 Installing dependencies from scratch..."
npm install --legacy-peer-deps

# 5. Clean rebuild with Docker
echo "🔨 Building Docker images from scratch..."
cd infra
docker-compose build --no-cache --pull

echo "✅ Clean build complete!"
echo "🚀 To start services, run: cd infra && docker-compose up"
