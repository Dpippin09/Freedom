#!/bin/bash

# Freedom Fashion - DigitalOcean Deployment Script
# This script automates the deployment of the Freedom Fashion platform to DigitalOcean App Platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="freedom-fashion"
ENVIRONMENT="${ENVIRONMENT:-production}"
DO_REGION="${DO_REGION:-nyc1}"

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

# Function to print section header
print_header() {
    echo
    echo "======================================"
    echo "🚀 $1"
    echo "======================================"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check doctl (DigitalOcean CLI)
    if command -v doctl >/dev/null 2>&1; then
        print_status 0 "DigitalOcean CLI (doctl) is installed"
        doctl version
    else
        print_status 1 "DigitalOcean CLI (doctl) is not installed"
        echo "Please install doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/"
        echo "Then authenticate with: doctl auth init"
        exit 1
    fi
    
    # Check doctl authentication
    if doctl account get >/dev/null 2>&1; then
        print_status 0 "DigitalOcean authentication configured"
        ACCOUNT_EMAIL=$(doctl account get --format Email --no-header)
        print_info "Account: $ACCOUNT_EMAIL"
    else
        print_status 1 "DigitalOcean authentication not configured"
        echo "Please run: doctl auth init"
        exit 1
    fi
    
    # Check Git repository
    if git remote get-url origin >/dev/null 2>&1; then
        REPO_URL=$(git remote get-url origin)
        print_status 0 "Git repository configured"
        print_info "Repository: $REPO_URL"
    else
        print_warning "Git remote 'origin' not configured"
        print_info "You'll need to configure GitHub repository for App Platform"
    fi
}

# Get deployment parameters
get_parameters() {
    print_header "Deployment Configuration"
    
    echo "Current configuration:"
    echo "  App Name: $APP_NAME"
    echo "  Environment: $ENVIRONMENT"
    echo "  Region: $DO_REGION"
    echo
    
    # Get GitHub repository
    if [ -z "$GITHUB_REPO" ]; then
        echo -n "Enter GitHub repository (username/repo-name): "
        read GITHUB_REPO
        
        if [ -z "$GITHUB_REPO" ]; then
            print_status 1 "GitHub repository is required"
            exit 1
        fi
    fi
    
    # Get domain name (optional)
    if [ -z "$DOMAIN_NAME" ]; then
        echo -n "Enter domain name (optional, press Enter to skip): "
        read DOMAIN_NAME
    fi
    
    # Generate secrets
    JWT_SECRET=$(openssl rand -hex 32)
    SESSION_SECRET=$(openssl rand -hex 32)
    
    print_status 0 "Configuration collected"
}

# Create app specification with user inputs
create_app_spec() {
    print_header "Creating App Specification"
    
    cd "$(dirname "$0")"
    
    # Update app-spec.yml with user inputs
    cat > app-spec-configured.yml << EOF
name: $APP_NAME
region: $DO_REGION

services:
- name: ${APP_NAME}-app
  source_dir: /
  github:
    repo: $GITHUB_REPO
    branch: main
    deploy_on_push: true
  
  build_command: npm ci --only=production
  run_command: npm start
  
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  
  envs:
  - key: NODE_ENV
    value: production
  - key: SERVER_HOST
    value: 0.0.0.0
  - key: SERVER_PORT
    value: "3000"
  
  # Database connection
  - key: DATABASE_HOST
    value: \${${APP_NAME}-db.HOSTNAME}
  - key: DATABASE_PORT
    value: \${${APP_NAME}-db.PORT}
  - key: DATABASE_NAME
    value: \${${APP_NAME}-db.DATABASE}
  - key: DATABASE_USER
    value: \${${APP_NAME}-db.USERNAME}
  - key: DATABASE_PASSWORD
    value: \${${APP_NAME}-db.PASSWORD}
  - key: DATABASE_SSL
    value: "true"
  
  # Redis connection
  - key: REDIS_HOST
    value: \${${APP_NAME}-redis.HOSTNAME}
  - key: REDIS_PORT
    value: \${${APP_NAME}-redis.PORT}
  - key: REDIS_PASSWORD
    value: \${${APP_NAME}-redis.PASSWORD}
  
  # Security secrets
  - key: JWT_SECRET
    value: $JWT_SECRET
  - key: SESSION_SECRET
    value: $SESSION_SECRET
  
  # Features
  - key: ENABLE_SCRAPING
    value: "true"
  - key: ENABLE_ANALYTICS
    value: "true"
  - key: ENABLE_NOTIFICATIONS
    value: "true"
  - key: ENABLE_PRICE_ALERTS
    value: "true"
  - key: ENABLE_SSL
    value: "true"
  
  health_check:
    http_path: /health/quick
    initial_delay_seconds: 60
    period_seconds: 30
    timeout_seconds: 10
    success_threshold: 1
    failure_threshold: 3
  
  http_port: 3000
  
  routes:
  - path: /

databases:
- name: ${APP_NAME}-db
  engine: PG
  version: "15"
  size: db-s-1vcpu-1gb
  num_nodes: 1

- name: ${APP_NAME}-redis
  engine: REDIS
  version: "7"
  size: db-s-1vcpu-1gb
  num_nodes: 1
EOF

    if [ -n "$DOMAIN_NAME" ]; then
        cat >> app-spec-configured.yml << EOF

domains:
- domain: $DOMAIN_NAME
  type: PRIMARY
  wildcard: false
EOF
    fi

    print_status 0 "App specification created"
}

# Deploy to DigitalOcean App Platform
deploy_app() {
    print_header "Deploying to DigitalOcean App Platform"
    
    print_info "Creating app on DigitalOcean App Platform..."
    
    # Create the app
    APP_ID=$(doctl apps create app-spec-configured.yml --format ID --no-header)
    
    if [ -n "$APP_ID" ]; then
        print_status 0 "App created with ID: $APP_ID"
    else
        print_status 1 "Failed to create app"
        exit 1
    fi
    
    print_info "Waiting for deployment to complete..."
    
    # Wait for deployment
    while true; do
        PHASE=$(doctl apps get $APP_ID --format Phase --no-header)
        
        case $PHASE in
            "ACTIVE")
                print_status 0 "Deployment completed successfully"
                break
                ;;
            "ERROR"|"SUPERSEDED")
                print_status 1 "Deployment failed with phase: $PHASE"
                exit 1
                ;;
            *)
                print_info "Deployment in progress... (Phase: $PHASE)"
                sleep 30
                ;;
        esac
    done
    
    # Get app URL
    APP_URL=$(doctl apps get $APP_ID --format DefaultIngress --no-header)
    echo "App URL: https://$APP_URL"
}

# Get deployment information
get_deployment_info() {
    print_header "Retrieving Deployment Information"
    
    # Get app details
    APP_DETAILS=$(doctl apps get $APP_ID --format ID,DefaultIngress,Phase,CreatedAt --no-header)
    
    echo "Deployment Information:"
    echo "======================"
    echo "App ID: $APP_ID"
    echo "App URL: https://$APP_URL"
    echo "Phase: $(echo $APP_DETAILS | awk '{print $3}')"
    echo "Created: $(echo $APP_DETAILS | awk '{print $4}')"
    
    # Get database information
    print_info "Database Information:"
    doctl databases list --format Name,Engine,Status,Size,Region
    
    echo
}

# Health check
health_check() {
    print_header "Health Check"
    
    print_info "Waiting for application to be ready..."
    sleep 30
    
    if curl -s -f "https://$APP_URL/health/quick" >/dev/null; then
        print_status 0 "Application health check passed"
        curl -s "https://$APP_URL/health/detailed" | jq . || echo "Health check response received"
    else
        print_warning "Application health check failed"
        print_info "This may be normal during initial deployment"
        print_info "Check app logs: doctl apps logs $APP_ID"
    fi
}

# Main deployment function
deploy() {
    print_header "DigitalOcean Deployment - Freedom Fashion Platform"
    
    check_prerequisites
    get_parameters
    create_app_spec
    deploy_app
    get_deployment_info
    health_check
    
    print_header "Deployment Complete!"
    
    echo "🎉 Freedom Fashion Platform has been deployed to DigitalOcean!"
    echo
    echo "📝 Deployment Summary:"
    echo "======================"
    echo "✅ Application: Deployed to App Platform"
    echo "✅ Database: PostgreSQL managed database"
    echo "✅ Cache: Redis managed database"
    echo "✅ SSL: Automatic HTTPS certificate"
    echo "✅ Domain: App Platform subdomain"
    echo
    echo "🌐 Access your application:"
    echo "   URL: https://$APP_URL"
    if [ -n "$DOMAIN_NAME" ]; then
        echo "   Custom Domain: https://$DOMAIN_NAME"
    fi
    echo
    echo "📊 Monitor your deployment:"
    echo "   App Console: https://cloud.digitalocean.com/apps/$APP_ID"
    echo "   Database Console: https://cloud.digitalocean.com/databases"
    echo "   View Logs: doctl apps logs $APP_ID"
    echo
    echo "🛠️  Next steps:"
    echo "   1. Configure custom domain DNS (if using)"
    echo "   2. Set up monitoring and alerting"
    echo "   3. Configure backup schedules"
    echo "   4. Set up CI/CD with GitHub Actions"
    
    # Save deployment info
    cat > deployment-info.txt << EOF
Freedom Fashion - DigitalOcean Deployment
========================================
App ID: $APP_ID
App URL: https://$APP_URL
Domain: ${DOMAIN_NAME:-"Not configured"}
GitHub Repo: $GITHUB_REPO
Region: $DO_REGION
Deployed: $(date)
EOF
    
    print_status 0 "Deployment information saved to deployment-info.txt"
}

# Cleanup function
cleanup() {
    print_header "Cleanup DigitalOcean Resources"
    
    if [ -z "$APP_ID" ]; then
        echo -n "Enter App ID to delete: "
        read APP_ID
    fi
    
    print_warning "This will delete the app and associated resources"
    echo -n "Are you sure you want to continue? (yes/no): "
    read -r CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        print_info "Cleanup cancelled"
        exit 0
    fi
    
    print_info "Deleting app: $APP_ID"
    doctl apps delete $APP_ID --force
    
    print_status 0 "App deleted successfully"
    print_warning "Databases may need to be deleted separately if not configured for cascade deletion"
}

# Show logs
show_logs() {
    if [ -z "$APP_ID" ]; then
        echo -n "Enter App ID: "
        read APP_ID
    fi
    
    print_info "Showing recent logs for app: $APP_ID"
    doctl apps logs $APP_ID --type run
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "cleanup")
        cleanup
        ;;
    "check")
        check_prerequisites
        ;;
    "logs")
        show_logs
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [deploy|cleanup|check|logs|help]"
        echo
        echo "Commands:"
        echo "  deploy   - Deploy the Freedom Fashion platform to DigitalOcean (default)"
        echo "  cleanup  - Delete the app and resources"
        echo "  check    - Check prerequisites and configuration"
        echo "  logs     - Show application logs"
        echo "  help     - Show this help message"
        echo
        echo "Environment Variables:"
        echo "  ENVIRONMENT   - Deployment environment (default: production)"
        echo "  DO_REGION     - DigitalOcean region (default: nyc1)"
        echo "  GITHUB_REPO   - GitHub repository (will prompt if not set)"
        echo "  DOMAIN_NAME   - Custom domain name (optional)"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
