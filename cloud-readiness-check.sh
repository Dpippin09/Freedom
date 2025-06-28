#!/bin/bash

# Freedom Fashion - Cloud Deployment Readiness Check
# Comprehensive validation for cloud deployment capabilities

set -e

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

echo "🚀 Freedom Fashion - Cloud Deployment Readiness Check"
echo "====================================================="

# Check project structure
print_info "Checking project structure..."

# Core application files
if [ -f "server/startup.js" ]; then
    print_status 0 "Core application files present"
else
    print_status 1 "Core application files missing"
fi

# Docker configuration
if [ -f "Dockerfile" ] && [ -f "docker-compose.yml" ]; then
    print_status 0 "Docker configuration present"
else
    print_status 1 "Docker configuration missing"
fi

# Cloud deployment files
print_info "Checking cloud deployment configurations..."

if [ -d "cloud/aws" ] && [ -f "cloud/aws/deploy-aws.sh" ]; then
    print_status 0 "AWS deployment configuration present"
else
    print_status 1 "AWS deployment configuration missing"
fi

if [ -d "cloud/digitalocean" ] && [ -f "cloud/digitalocean/deploy-do.sh" ]; then
    print_status 0 "DigitalOcean deployment configuration present"
else
    print_status 1 "DigitalOcean deployment configuration missing"
fi

if [ -d ".github/workflows" ]; then
    print_status 0 "GitHub Actions workflows present"
else
    print_status 1 "GitHub Actions workflows missing"
fi

# Check environment templates
print_info "Checking environment configuration..."

if [ -f ".env.production.template" ]; then
    print_status 0 "Production environment template present"
else
    print_status 1 "Production environment template missing"
fi

# Check documentation
print_info "Checking documentation..."

if [ -f "CLOUD_DEPLOYMENT_GUIDE.md" ]; then
    print_status 0 "Cloud deployment guide present"
else
    print_status 1 "Cloud deployment guide missing"
fi

# Check Git repository
print_info "Checking Git repository setup..."

if git rev-parse --git-dir > /dev/null 2>&1; then
    print_status 0 "Git repository initialized"
    
    if git remote get-url origin > /dev/null 2>&1; then
        ORIGIN_URL=$(git remote get-url origin)
        print_status 0 "Git remote 'origin' configured: $ORIGIN_URL"
    else
        print_warning "Git remote 'origin' not configured"
        print_info "You'll need to push to GitHub for CI/CD deployment"
    fi
else
    print_status 1 "Git repository not initialized"
fi

# Check package.json scripts
print_info "Checking NPM scripts..."

if grep -q "cloud:deploy" package.json; then
    print_status 0 "Cloud deployment scripts present in package.json"
else
    print_status 1 "Cloud deployment scripts missing from package.json"
fi

# Cloud CLI tools check
print_info "Checking cloud CLI tools (optional for manual deployment)..."

if command -v aws >/dev/null 2>&1; then
    print_status 0 "AWS CLI installed"
    aws --version
else
    print_warning "AWS CLI not installed (required for AWS deployment)"
    print_info "Install: https://aws.amazon.com/cli/"
fi

if command -v doctl >/dev/null 2>&1; then
    print_status 0 "DigitalOcean CLI installed"
    doctl version
else
    print_warning "DigitalOcean CLI not installed (required for DO deployment)"
    print_info "Install: https://docs.digitalocean.com/reference/doctl/"
fi

if command -v gcloud >/dev/null 2>&1; then
    print_status 0 "Google Cloud CLI installed"
    gcloud version --format="value(Google Cloud SDK)"
else
    print_warning "Google Cloud CLI not installed (required for GCP deployment)"
    print_info "Install: https://cloud.google.com/sdk/docs/install"
fi

# Docker check
print_info "Checking Docker (required for local development and testing)..."

if command -v docker >/dev/null 2>&1; then
    print_status 0 "Docker installed"
    docker --version
else
    print_warning "Docker not installed"
    print_info "Install: https://docker.com"
fi

echo
echo "========================================"
print_info "Cloud Deployment Readiness Summary"
echo "========================================"

echo
print_info "✅ Ready for deployment:"
echo "  • Project structure is complete"
echo "  • Docker configuration available"
echo "  • Cloud deployment scripts ready"
echo "  • Documentation provided"

echo
print_info "🚀 Deployment options:"
echo "  1. DigitalOcean App Platform (Easiest)"
echo "     • Install doctl: npm run cloud:check:do"
echo "     • Deploy: npm run cloud:deploy:do"

echo
echo "  2. AWS ECS Fargate (Enterprise)"
echo "     • Install AWS CLI: npm run cloud:check:aws"
echo "     • Deploy: npm run cloud:deploy:aws"

echo
echo "  3. GitHub Actions CI/CD (Automated)"
echo "     • Configure GitHub secrets"
echo "     • Push to main/production branch"

echo
print_info "📚 Next steps:"
echo "  1. Read CLOUD_DEPLOYMENT_GUIDE.md for detailed instructions"
echo "  2. Choose your preferred cloud provider"
echo "  3. Install required CLI tools"
echo "  4. Configure GitHub repository (for CI/CD)"
echo "  5. Deploy to staging environment first"

echo
print_info "🎉 Your Freedom Fashion platform is ready for cloud deployment!"
