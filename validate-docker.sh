#!/bin/bash

# Docker Configuration Validation Script
# Tests Docker files for syntax and configuration correctness

echo "🐳 Freedom Fashion - Docker Configuration Validator"
echo "================================================="

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

echo
print_info "Checking Docker configuration files..."

# Check if Docker files exist
DOCKER_FILES=(
    "Dockerfile"
    "Dockerfile.dev"
    ".dockerignore"
    "docker-compose.yml"
    "docker-compose.dev.yml"
    "health-check.js"
)

echo
print_info "Validating Docker file presence:"
for file in "${DOCKER_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "$file exists"
    else
        print_status 1 "$file missing"
    fi
done

# Check required directories
REQUIRED_DIRS=(
    "docker/nginx"
    "docker/scripts"
    "server/config"
    "server/database"
)

echo
print_info "Validating required directories:"
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_status 0 "$dir exists"
    else
        print_status 1 "$dir missing"
    fi
done

# Check Nginx configuration files
NGINX_FILES=(
    "docker/nginx/nginx.conf"
    "docker/nginx/default.conf"
)

echo
print_info "Validating Nginx configuration files:"
for file in "${NGINX_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "$file exists"
    else
        print_status 1 "$file missing"
    fi
done

# Check Docker scripts
DOCKER_SCRIPTS=(
    "docker/scripts/dev-setup.sh"
    "docker/scripts/prod-deploy.sh"
)

echo
print_info "Validating Docker management scripts:"
for script in "${DOCKER_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            print_status 0 "$script exists and is executable"
        else
            print_warning "$script exists but is not executable"
        fi
    else
        print_status 1 "$script missing"
    fi
done

# Validate Docker Compose syntax (if Docker is available)
echo
print_info "Checking for Docker installation:"
if command -v docker >/dev/null 2>&1; then
    print_status 0 "Docker is installed"
    
    echo
    print_info "Validating Docker Compose syntax:"
    
    # Validate production compose file
    if docker-compose -f docker-compose.yml config >/dev/null 2>&1; then
        print_status 0 "docker-compose.yml syntax is valid"
    else
        print_status 1 "docker-compose.yml syntax error"
    fi
    
    # Validate development compose file
    if docker-compose -f docker-compose.dev.yml config >/dev/null 2>&1; then
        print_status 0 "docker-compose.dev.yml syntax is valid"
    else
        print_status 1 "docker-compose.dev.yml syntax error"
    fi
    
else
    print_warning "Docker is not installed - skipping syntax validation"
    print_info "To install Docker:"
    echo "  • Windows: Download Docker Desktop from https://docker.com"
    echo "  • macOS: Download Docker Desktop from https://docker.com"
    echo "  • Linux: Follow instructions at https://docs.docker.com/engine/install/"
fi

# Check environment template files
ENV_FILES=(
    ".env.production.template"
    ".env.database.template"
)

echo
print_info "Validating environment template files:"
for file in "${ENV_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "$file exists"
    else
        print_status 1 "$file missing"
    fi
done

# Check package.json for Docker scripts
echo
print_info "Validating package.json Docker scripts:"
if grep -q "docker:dev" package.json; then
    print_status 0 "Docker scripts are present in package.json"
else
    print_status 1 "Docker scripts missing from package.json"
fi

# Validate critical application files
CRITICAL_FILES=(
    "server/startup.js"
    "server/app.js"
    "server/config/index.js"
    "server/database/connection.js"
)

echo
print_info "Validating critical application files:"
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "$file exists"
    else
        print_status 1 "$file missing"
    fi
done

echo
echo "================================================="
print_info "Docker Configuration Validation Complete!"

if command -v docker >/dev/null 2>&1; then
    echo
    print_info "Next steps to test Docker setup:"
    echo "  1. Start development environment:"
    echo "     npm run docker:dev"
    echo ""
    echo "  2. Check container status:"
    echo "     docker-compose -f docker-compose.dev.yml ps"
    echo ""
    echo "  3. View logs:"
    echo "     docker-compose -f docker-compose.dev.yml logs -f"
    echo ""
    echo "  4. Test application:"
    echo "     curl http://localhost:3000/health/quick"
    echo ""
    echo "  5. Stop environment:"
    echo "     npm run docker:dev:down"
else
    echo
    print_warning "Docker is not installed. Please install Docker first:"
    echo ""
    echo "  Windows/macOS:"
    echo "    • Download and install Docker Desktop"
    echo "    • https://www.docker.com/products/docker-desktop/"
    echo ""
    echo "  Linux:"
    echo "    • Follow the official installation guide"
    echo "    • https://docs.docker.com/engine/install/"
    echo ""
    echo "  After installation, restart your terminal and run:"
    echo "    ./validate-docker.sh"
fi

echo
