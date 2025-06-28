#!/bin/bash
# Docker production deployment script

set -e

echo "🐳 Freedom Fashion - Production Deployment"
echo "=========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if we're in production mode
if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  NODE_ENV is not set to 'production'"
    read -p "Continue anyway? (y/N): " confirm
    if [[ $confirm != [yY] ]]; then
        exit 1
    fi
fi

# Create .env file check
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it from .env.production.template"
    exit 1
fi

# Security check for production secrets
echo "🔒 Checking production configuration..."
if grep -q "change_in_production\|your_secure\|dev_\|development" .env; then
    echo "❌ Found development/placeholder values in .env file!"
    echo "   Please update all placeholder values before deploying to production."
    exit 1
fi

echo "✅ Configuration looks good"

# Build production images
echo "🏗️  Building production Docker images..."
docker-compose build --no-cache

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Start production services
echo "🚀 Starting production services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check service health
echo "🔍 Checking service health..."
docker-compose ps

# Ensure database is ready and migrated
echo "📊 Running database migrations..."
docker-compose exec app npm run db:migrate

# Run health check
echo "💚 Running health check..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ Application is healthy"
else
    echo "❌ Health check failed"
    echo "📋 Checking logs..."
    docker-compose logs app
    exit 1
fi

echo ""
echo "✅ Production deployment completed successfully!"
echo ""
echo "📋 Service URLs:"
echo "   Application: http://localhost (or your domain)"
echo "   Health Check: http://localhost/health"
echo ""
echo "🛠️  Management commands:"
echo "   View logs:           docker-compose logs -f"
echo "   Stop services:       docker-compose down"
echo "   Restart app:         docker-compose restart app"
echo "   Database backup:     docker-compose exec postgres pg_dump -U freedom_user freedom_fashion > backup.sql"
echo "   Scale app:           docker-compose up -d --scale app=3"
echo ""
echo "🔍 Monitor the application:"
echo "   docker-compose logs -f app"
echo ""
