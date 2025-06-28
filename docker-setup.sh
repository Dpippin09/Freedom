#!/bin/bash

# Freedom Fashion - Docker Quick Setup Script
# Automates Docker environment setup and testing

echo "🐳 Freedom Fashion - Docker Quick Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if Docker is installed
check_docker() {
    if command -v docker >/dev/null 2>&1; then
        print_status 0 "Docker is installed"
        docker --version
    else
        print_status 1 "Docker is not installed"
        echo
        print_info "Please install Docker first:"
        echo "  • Windows/macOS: https://www.docker.com/products/docker-desktop/"
        echo "  • Linux: https://docs.docker.com/engine/install/"
        exit 1
    fi
}

# Check if Docker Compose is available
check_docker_compose() {
    if command -v docker-compose >/dev/null 2>&1; then
        print_status 0 "Docker Compose is available"
        docker-compose --version
    else
        print_status 1 "Docker Compose not found"
        echo
        print_info "Docker Compose is required. It should come with Docker Desktop."
        echo "  • For standalone installation: https://docs.docker.com/compose/install/"
        exit 1
    fi
}

# Create .env file for development if it doesn't exist
create_env_file() {
    if [ ! -f ".env" ]; then
        print_info "Creating development .env file..."
        cat > .env << 'EOF'
# Freedom Fashion - Development Environment Configuration
NODE_ENV=development

# Server Configuration
SERVER_HOST=localhost
SERVER_PORT=3000

# Database Configuration (Docker)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=freedom_fashion
DATABASE_USER=freedom_user
DATABASE_PASSWORD=freedom_secure_password_2024
DATABASE_SSL=false

# Redis Configuration (Docker)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_secure_password_2024

# Security (Development - change in production)
JWT_SECRET=dev_jwt_secret_change_in_production
SESSION_SECRET=dev_session_secret_change_in_production

# Features
ENABLE_SCRAPING=true
ENABLE_ANALYTICS=true
ENABLE_NOTIFICATIONS=true
ENABLE_PRICE_ALERTS=true

# Development Settings
LOG_LEVEL=debug
ENABLE_CORS=true
EOF
        print_status 0 "Created .env file for development"
    else
        print_status 0 ".env file already exists"
    fi
}

# Function to setup development environment
setup_dev() {
    print_info "Setting up development environment..."
    
    # Create .env file
    create_env_file
    
    # Pull base images
    print_info "Pulling base Docker images..."
    docker pull node:18-alpine
    docker pull postgres:15-alpine
    docker pull redis:7-alpine
    docker pull nginx:alpine
    
    # Build and start development environment
    print_info "Building and starting development environment..."
    if docker-compose -f docker-compose.dev.yml up --build -d; then
        print_status 0 "Development environment started"
    else
        print_status 1 "Failed to start development environment"
        return 1
    fi
    
    # Wait for services to be healthy
    print_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check container status
    echo
    print_info "Container status:"
    docker-compose -f docker-compose.dev.yml ps
    
    # Test endpoints
    echo
    print_info "Testing application endpoints..."
    
    # Test direct app access
    if curl -s http://localhost:3000/health/quick >/dev/null; then
        print_status 0 "Application health check passed (direct)"
    else
        print_status 1 "Application health check failed (direct)"
    fi
    
    # Test via Nginx
    if curl -s http://localhost:8080/health/quick >/dev/null; then
        print_status 0 "Application health check passed (via Nginx)"
    else
        print_status 1 "Application health check failed (via Nginx)"
    fi
    
    echo
    print_info "Development environment is ready!"
    echo "  • Application: http://localhost:3000"
    echo "  • Via Nginx: http://localhost:8080"
    echo "  • PostgreSQL: localhost:5432"
    echo "  • Redis: localhost:6379"
    echo
    print_info "To view logs: docker-compose -f docker-compose.dev.yml logs -f"
    print_info "To stop: npm run docker:dev:down"
}

# Function to setup production environment
setup_prod() {
    print_info "Setting up production environment..."
    
    # Build and start production environment
    print_info "Building and starting production environment..."
    if docker-compose up --build -d; then
        print_status 0 "Production environment started"
    else
        print_status 1 "Failed to start production environment"
        return 1
    fi
    
    # Wait for services to be healthy
    print_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check container status
    echo
    print_info "Container status:"
    docker-compose ps
    
    # Test endpoints
    echo
    print_info "Testing production endpoints..."
    
    # Test via Nginx (port 80)
    if curl -s http://localhost/health/quick >/dev/null; then
        print_status 0 "Production health check passed"
    else
        print_status 1 "Production health check failed"
    fi
    
    echo
    print_info "Production environment is ready!"
    echo "  • Application: http://localhost"
    echo "  • HTTPS: https://localhost (if SSL configured)"
    echo
    print_info "To view logs: docker-compose logs -f"
    print_info "To stop: npm run docker:prod:down"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [dev|prod|status|logs|stop|clean]"
    echo
    echo "Commands:"
    echo "  dev     - Setup and start development environment"
    echo "  prod    - Setup and start production environment"
    echo "  status  - Show status of running containers"
    echo "  logs    - Show logs from all containers"
    echo "  stop    - Stop all containers"
    echo "  clean   - Clean up Docker resources"
    echo
    echo "Examples:"
    echo "  $0 dev      # Start development environment"
    echo "  $0 status   # Check container status"
    echo "  $0 logs     # View logs"
    echo "  $0 stop     # Stop all containers"
}

# Function to show container status
show_status() {
    print_info "Development environment status:"
    if docker-compose -f docker-compose.dev.yml ps 2>/dev/null | grep -q "Up"; then
        docker-compose -f docker-compose.dev.yml ps
    else
        echo "Development environment is not running"
    fi
    
    echo
    print_info "Production environment status:"
    if docker-compose ps 2>/dev/null | grep -q "Up"; then
        docker-compose ps
    else
        echo "Production environment is not running"
    fi
}

# Function to show logs
show_logs() {
    print_info "Recent logs from development environment:"
    if docker-compose -f docker-compose.dev.yml ps 2>/dev/null | grep -q "Up"; then
        docker-compose -f docker-compose.dev.yml logs --tail=20
    else
        echo "Development environment is not running"
    fi
    
    echo
    print_info "Recent logs from production environment:"
    if docker-compose ps 2>/dev/null | grep -q "Up"; then
        docker-compose logs --tail=20
    else
        echo "Production environment is not running"
    fi
}

# Function to stop all containers
stop_all() {
    print_info "Stopping development environment..."
    docker-compose -f docker-compose.dev.yml down 2>/dev/null
    
    print_info "Stopping production environment..."
    docker-compose down 2>/dev/null
    
    print_status 0 "All containers stopped"
}

# Function to clean up Docker resources
clean_docker() {
    print_info "Cleaning up Docker resources..."
    
    # Stop all containers
    stop_all
    
    # Remove unused images, containers, and networks
    docker system prune -f
    
    # Remove unused volumes (optional - uncomment if needed)
    # docker volume prune -f
    
    print_status 0 "Docker cleanup completed"
}

# Main script logic
main() {
    # Check prerequisites
    check_docker
    check_docker_compose
    
    # Handle command line arguments
    case "${1:-dev}" in
        "dev")
            setup_dev
            ;;
        "prod")
            setup_prod
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "stop")
            stop_all
            ;;
        "clean")
            clean_docker
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            echo "Unknown command: $1"
            echo
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
