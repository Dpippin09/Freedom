#!/bin/bash
# Docker development setup script

set -e

echo "🐳 Freedom Fashion - Docker Development Setup"
echo "=============================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

echo "✅ Docker is running"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.production.template .env
    echo "⚠️  Please edit .env file with your configuration before continuing"
    echo "   You can continue with default values for development"
    read -p "Press Enter to continue..."
fi

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose -f docker-compose.dev.yml build

echo "🚀 Starting development services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
docker-compose -f docker-compose.dev.yml ps

# Run database migrations
echo "📊 Running database migrations..."
docker-compose -f docker-compose.dev.yml exec app npm run db:migrate

# Seed database if empty
echo "🌱 Seeding database..."
docker-compose -f docker-compose.dev.yml exec app npm run db:seed

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "📋 Service URLs:"
echo "   Application: http://localhost:3000"
echo "   PostgreSQL:  localhost:5433"
echo "   Redis:       localhost:6380"
echo ""
echo "🛠️  Useful commands:"
echo "   View logs:           docker-compose -f docker-compose.dev.yml logs -f"
echo "   Stop services:       docker-compose -f docker-compose.dev.yml down"
echo "   Restart app:         docker-compose -f docker-compose.dev.yml restart app"
echo "   Database CLI:        docker-compose -f docker-compose.dev.yml exec app npm run db"
echo "   App shell:           docker-compose -f docker-compose.dev.yml exec app sh"
echo "   Database shell:      docker-compose -f docker-compose.dev.yml exec postgres psql -U freedom_dev -d freedom_fashion_dev"
echo ""
