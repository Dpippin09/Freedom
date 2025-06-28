#!/bin/bash

# Production Deployment Script for Snatched It
# This script helps deploy the application to production environments

set -e

echo "🚀 =================================="
echo "   Snatched It Production Deploy"
echo "🚀 =================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if production environment file exists
if [ ! -f ".env.production" ]; then
    log_error "Production environment file not found!"
    log_info "Please copy .env.production.template to .env.production and configure it"
    log_info "cp .env.production.template .env.production"
    exit 1
fi

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check Node.js version
NODE_VERSION=$(node --version)
log_info "Node.js version: $NODE_VERSION"

# Check if required dependencies are installed
if [ ! -d "node_modules" ]; then
    log_warning "Dependencies not installed. Installing..."
    npm ci --production
    log_success "Dependencies installed"
else
    log_success "Dependencies found"
fi

# Validate production configuration
log_info "Validating production configuration..."
NODE_ENV=production node -e "
    const config = require('./server/config');
    const summary = config.getSummary();
    console.log('✅ Configuration validated');
    console.log('Environment:', summary.environment);
    console.log('Features enabled:', summary.features.join(', '));
    console.log('Security features:', Object.keys(summary.security).filter(k => summary.security[k]).join(', '));
"

# Create necessary directories
log_info "Creating necessary directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p data
mkdir -p temp

# Set proper permissions
chmod 755 logs uploads data temp

# Create basic data files if they don't exist
[ ! -f "data/users.json" ] && echo "[]" > data/users.json
[ ! -f "data/products.json" ] && echo "[]" > data/products.json
[ ! -f "data/analytics.json" ] && echo "[]" > data/analytics.json
[ ! -f "data/notifications.json" ] && echo "[]" > data/notifications.json

log_success "Data files initialized"

# Run health checks
log_info "Running pre-deployment health checks..."
NODE_ENV=production timeout 10s node server/app.js &
SERVER_PID=$!
sleep 3

# Test if server starts correctly
if kill -0 $SERVER_PID 2>/dev/null; then
    log_success "Server starts successfully"
    kill $SERVER_PID
    wait $SERVER_PID 2>/dev/null || true
else
    log_error "Server failed to start"
    exit 1
fi

# Optional: Run tests if they exist
if [ -f "package.json" ] && npm run | grep -q "test"; then
    log_info "Running tests..."
    npm test
    log_success "Tests passed"
fi

# Deployment options
echo
echo "🚀 Ready for deployment!"
echo
echo "Choose deployment method:"
echo "1) Start with PM2 (recommended for production)"
echo "2) Start with forever"
echo "3) Start directly (for testing)"
echo "4) Generate Docker files"
echo "5) Exit without deploying"
echo

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        log_info "Deploying with PM2..."
        if ! command -v pm2 &> /dev/null; then
            log_warning "PM2 not found. Installing..."
            npm install -g pm2
        fi
        
        # Create PM2 ecosystem file
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'snatched-it',
    script: './server/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    max_memory_restart: '500M',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'data'],
    max_restarts: 5,
    min_uptime: '10s'
  }]
};
EOF
        
        pm2 start ecosystem.config.js --env production
        pm2 save
        pm2 startup
        log_success "Application deployed with PM2"
        log_info "Use 'pm2 status' to check status"
        log_info "Use 'pm2 logs snatched-it' to view logs"
        ;;
        
    2)
        log_info "Deploying with forever..."
        if ! command -v forever &> /dev/null; then
            log_warning "Forever not found. Installing..."
            npm install -g forever
        fi
        
        NODE_ENV=production forever start --pidFile=./logs/forever.pid --logFile=./logs/forever.log --errFile=./logs/forever-error.log server/app.js
        log_success "Application deployed with forever"
        log_info "Use 'forever list' to check status"
        ;;
        
    3)
        log_info "Starting directly..."
        NODE_ENV=production node server/app.js
        ;;
        
    4)
        log_info "Generating Docker files..."
        
        # Generate Dockerfile
        cat > Dockerfile << EOF
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S snatched -u 1001

# Copy app source
COPY . .

# Create necessary directories
RUN mkdir -p logs uploads data temp
RUN chown -R snatched:nodejs /usr/src/app

# Switch to non-root user
USER snatched

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "server/app.js"]
EOF

        # Generate docker-compose.yml
        cat > docker-compose.yml << EOF
version: '3.8'

services:
  snatched-it:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
    volumes:
      - ./data:/usr/src/app/data
      - ./logs:/usr/src/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Add nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - snatched-it
    restart: unless-stopped
EOF

        # Generate basic nginx config
        cat > nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    upstream snatched_it {
        server snatched-it:8080;
    }

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://snatched_it;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        location /health {
            proxy_pass http://snatched_it/health;
            access_log off;
        }
    }
}
EOF

        # Generate .dockerignore
        cat > .dockerignore << EOF
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
.env.production
logs/*
temp/*
.dockerignore
Dockerfile
docker-compose.yml
EOF

        log_success "Docker files generated!"
        log_info "Build: docker build -t snatched-it ."
        log_info "Run: docker-compose up -d"
        ;;
        
    5)
        log_info "Deployment cancelled"
        exit 0
        ;;
        
    *)
        log_error "Invalid choice"
        exit 1
        ;;
esac

log_success "Deployment completed!"
echo
echo "🎉 Snatched It is now running in production!"
echo
echo "📍 Application URLs:"
echo "   Health Check: http://localhost:8080/health"
echo "   API Info: http://localhost:8080/api"
echo "   Web App: http://localhost:8080"
echo
echo "📊 Monitoring:"
echo "   Health: curl http://localhost:8080/health"
echo "   Full Health: curl http://localhost:8080/health/full"
echo "   Metrics: Check logs/ directory"
echo
echo "🔧 Management:"
echo "   Logs: tail -f logs/*.log"
echo "   Config: .env.production"
echo "   Data: data/ directory"
