#!/bin/bash

# Freedom Fashion - AWS Deployment Script
# This script automates the complete deployment of the Freedom Fashion platform to AWS

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
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${APP_NAME}-${ENVIRONMENT}"

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
    
    # Check AWS CLI
    if command -v aws >/dev/null 2>&1; then
        print_status 0 "AWS CLI is installed"
        aws --version
    else
        print_status 1 "AWS CLI is not installed"
        echo "Please install AWS CLI: https://aws.amazon.com/cli/"
        exit 1
    fi
    
    # Check Docker
    if command -v docker >/dev/null 2>&1; then
        print_status 0 "Docker is installed"
        docker --version
    else
        print_status 1 "Docker is not installed"
        echo "Please install Docker: https://docker.com"
        exit 1
    fi
    
    # Check AWS credentials
    if aws sts get-caller-identity >/dev/null 2>&1; then
        print_status 0 "AWS credentials configured"
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        print_info "AWS Account ID: $ACCOUNT_ID"
    else
        print_status 1 "AWS credentials not configured"
        echo "Please run: aws configure"
        exit 1
    fi
    
    # Check if logged into Docker (for ECR)
    print_info "Logging into AWS ECR..."
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    print_status 0 "Logged into AWS ECR"
}

# Get deployment parameters
get_parameters() {
    print_header "Deployment Configuration"
    
    echo "Current configuration:"
    echo "  App Name: $APP_NAME"
    echo "  Environment: $ENVIRONMENT"
    echo "  AWS Region: $AWS_REGION"
    echo "  Stack Name: $STACK_NAME"
    echo
    
    # Get database password
    if [ -z "$DB_PASSWORD" ]; then
        echo -n "Enter database password (minimum 8 characters): "
        read -s DB_PASSWORD
        echo
        
        if [ ${#DB_PASSWORD} -lt 8 ]; then
            print_status 1 "Password must be at least 8 characters"
            exit 1
        fi
    fi
    
    # Get domain name (optional)
    if [ -z "$DOMAIN_NAME" ]; then
        echo -n "Enter domain name (optional, press Enter to skip): "
        read DOMAIN_NAME
    fi
    
    print_status 0 "Configuration collected"
}

# Build and push Docker image
build_and_push_image() {
    print_header "Building and Pushing Docker Image"
    
    # Ensure we're in the project root
    cd "$(dirname "$0")/../.."
    
    ECR_REPO_URI="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$APP_NAME"
    
    print_info "Building Docker image..."
    docker build -t $APP_NAME:latest .
    print_status 0 "Docker image built"
    
    print_info "Tagging image for ECR..."
    docker tag $APP_NAME:latest $ECR_REPO_URI:latest
    docker tag $APP_NAME:latest $ECR_REPO_URI:$ENVIRONMENT-$(date +%Y%m%d-%H%M%S)
    print_status 0 "Image tagged"
    
    print_info "Pushing image to ECR..."
    # Note: ECR repository will be created by CloudFormation
    docker push $ECR_REPO_URI:latest
    print_status 0 "Image pushed to ECR"
    
    echo "Image URI: $ECR_REPO_URI:latest"
}

# Deploy CloudFormation stack
deploy_infrastructure() {
    print_header "Deploying Infrastructure"
    
    cd "$(dirname "$0")"
    
    # Prepare CloudFormation parameters
    PARAMETERS="ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
    PARAMETERS="$PARAMETERS ParameterKey=AppName,ParameterValue=$APP_NAME"
    PARAMETERS="$PARAMETERS ParameterKey=DBPassword,ParameterValue=$DB_PASSWORD"
    
    if [ -n "$DOMAIN_NAME" ]; then
        PARAMETERS="$PARAMETERS ParameterKey=DomainName,ParameterValue=$DOMAIN_NAME"
    fi
    
    print_info "Deploying CloudFormation stack: $STACK_NAME"
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION >/dev/null 2>&1; then
        print_info "Updating existing stack..."
        aws cloudformation update-stack \
            --stack-name $STACK_NAME \
            --template-body file://cloudformation.yml \
            --parameters $PARAMETERS \
            --capabilities CAPABILITY_IAM \
            --region $AWS_REGION
        
        OPERATION="update"
    else
        print_info "Creating new stack..."
        aws cloudformation create-stack \
            --stack-name $STACK_NAME \
            --template-body file://cloudformation.yml \
            --parameters $PARAMETERS \
            --capabilities CAPABILITY_IAM \
            --region $AWS_REGION
        
        OPERATION="create"
    fi
    
    print_info "Waiting for stack $OPERATION to complete..."
    aws cloudformation wait stack-${OPERATION}-complete \
        --stack-name $STACK_NAME \
        --region $AWS_REGION
    
    print_status 0 "Infrastructure deployment completed"
}

# Get stack outputs
get_stack_outputs() {
    print_header "Retrieving Deployment Information"
    
    OUTPUTS=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs' \
        --output json)
    
    LOAD_BALANCER_URL=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="LoadBalancerURL") | .OutputValue')
    DATABASE_ENDPOINT=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="DatabaseEndpoint") | .OutputValue')
    REDIS_ENDPOINT=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="RedisEndpoint") | .OutputValue')
    S3_BUCKET=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="S3BucketName") | .OutputValue')
    ECR_URI=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="ECRRepositoryURI") | .OutputValue')
    
    echo "Deployment Information:"
    echo "========================"
    echo "Application URL: $LOAD_BALANCER_URL"
    echo "Database Endpoint: $DATABASE_ENDPOINT"
    echo "Redis Endpoint: $REDIS_ENDPOINT"
    echo "S3 Bucket: $S3_BUCKET"
    echo "ECR Repository: $ECR_URI"
    echo
}

# Initialize database
initialize_database() {
    print_header "Database Initialization"
    
    print_info "Database initialization will be handled by the application on first startup"
    print_info "The application includes automatic migration and seeding capabilities"
    print_status 0 "Database initialization configured"
}

# Update ECS service to force deployment
update_ecs_service() {
    print_header "Updating ECS Service"
    
    print_info "Forcing ECS service update to deploy new image..."
    aws ecs update-service \
        --cluster "${APP_NAME}-cluster" \
        --service "${APP_NAME}-service" \
        --force-new-deployment \
        --region $AWS_REGION >/dev/null
    
    print_info "Waiting for ECS service to stabilize..."
    aws ecs wait services-stable \
        --cluster "${APP_NAME}-cluster" \
        --services "${APP_NAME}-service" \
        --region $AWS_REGION
    
    print_status 0 "ECS service updated successfully"
}

# Health check
health_check() {
    print_header "Health Check"
    
    print_info "Waiting for application to be ready..."
    sleep 30
    
    if curl -s -f "$LOAD_BALANCER_URL/health/quick" >/dev/null; then
        print_status 0 "Application health check passed"
        curl -s "$LOAD_BALANCER_URL/health/detailed" | jq .
    else
        print_warning "Application health check failed"
        print_info "This may be normal during initial deployment"
        print_info "Check ECS service logs in AWS Console"
    fi
}

# Main deployment function
deploy() {
    print_header "AWS Deployment - Freedom Fashion Platform"
    
    check_prerequisites
    get_parameters
    
    # Deploy in order
    deploy_infrastructure
    build_and_push_image
    get_stack_outputs
    initialize_database
    update_ecs_service
    health_check
    
    print_header "Deployment Complete!"
    
    echo "🎉 Freedom Fashion Platform has been deployed to AWS!"
    echo
    echo "📝 Deployment Summary:"
    echo "======================"
    echo "✅ Infrastructure: CloudFormation stack deployed"
    echo "✅ Application: Docker image built and deployed"
    echo "✅ Database: PostgreSQL RDS instance ready"
    echo "✅ Cache: ElastiCache Redis ready"
    echo "✅ Load Balancer: Application Load Balancer configured"
    echo "✅ Security: Security groups and IAM roles configured"
    echo
    echo "🌐 Access your application:"
    echo "   URL: $LOAD_BALANCER_URL"
    if [ -n "$DOMAIN_NAME" ]; then
        echo "   Custom Domain: https://$DOMAIN_NAME (configure DNS)"
    fi
    echo
    echo "📊 Monitor your deployment:"
    echo "   CloudWatch: https://console.aws.amazon.com/cloudwatch/"
    echo "   ECS Console: https://console.aws.amazon.com/ecs/"
    echo "   RDS Console: https://console.aws.amazon.com/rds/"
    echo
    echo "🛠️  Next steps:"
    echo "   1. Configure custom domain DNS (if using)"
    echo "   2. Set up SSL certificate for HTTPS"
    echo "   3. Configure monitoring and alerting"
    echo "   4. Set up CI/CD pipeline for automated deployments"
}

# Cleanup function
cleanup() {
    print_header "Cleanup AWS Resources"
    
    print_warning "This will delete ALL AWS resources created for this deployment"
    echo -n "Are you sure you want to continue? (yes/no): "
    read -r CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        print_info "Cleanup cancelled"
        exit 0
    fi
    
    print_info "Deleting CloudFormation stack: $STACK_NAME"
    aws cloudformation delete-stack \
        --stack-name $STACK_NAME \
        --region $AWS_REGION
    
    print_info "Waiting for stack deletion to complete..."
    aws cloudformation wait stack-delete-complete \
        --stack-name $STACK_NAME \
        --region $AWS_REGION
    
    print_status 0 "AWS resources cleaned up"
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
    "help"|"-h"|"--help")
        echo "Usage: $0 [deploy|cleanup|check|help]"
        echo
        echo "Commands:"
        echo "  deploy   - Deploy the Freedom Fashion platform to AWS (default)"
        echo "  cleanup  - Delete all AWS resources"
        echo "  check    - Check prerequisites and configuration"
        echo "  help     - Show this help message"
        echo
        echo "Environment Variables:"
        echo "  ENVIRONMENT  - Deployment environment (default: production)"
        echo "  AWS_REGION   - AWS region (default: us-east-1)"
        echo "  DB_PASSWORD  - Database password (will prompt if not set)"
        echo "  DOMAIN_NAME  - Custom domain name (optional)"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
