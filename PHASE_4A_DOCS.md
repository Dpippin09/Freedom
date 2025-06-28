# Phase 4A: Environment & Configuration Implementation Guide

## 📋 Overview

Phase 4A implements a production-ready environment and configuration management system for the Snatched It fashion price comparison platform. This phase establishes the foundation for secure, scalable deployment with proper configuration management, security hardening, and health monitoring.

## 🎯 Completed Features

### ✅ Configuration Management System
- **Layered Configuration**: Base `.env` → Environment-specific `.env.{NODE_ENV}` → Local overrides `.env.local`
- **Type-Safe Configuration**: Automatic type conversion (string, int, float, boolean, array)
- **Environment Detection**: Development, production, and test environment handling
- **Feature Flags**: Enable/disable features without code changes
- **Validation**: Required configuration validation with helpful error messages

### ✅ Security Hardening
- **Helmet Integration**: Comprehensive security headers (CSP, HSTS, XSS protection)
- **Rate Limiting**: Multi-tier rate limiting (general, authentication, scraping)
- **CORS Configuration**: Flexible CORS policy with environment-aware origins
- **Input Validation**: Built-in validation and sanitization utilities
- **Progressive Slowdown**: Anti-abuse protection with increasing delays

### ✅ Health Check System
- **Quick Health Check** (`/health`): Basic liveness probe for load balancers
- **Full Health Check** (`/health/full`): Comprehensive system diagnostics
- **Readiness Check** (`/health/ready`): Service readiness verification
- **Liveness Check** (`/health/live`): Process health verification
- **Modular Checks**: System, memory, disk, database, dependencies, security

### ✅ Production Environment Template
- **Complete `.env.production.template`**: All production variables with documentation
- **Security Guidelines**: JWT secrets, database credentials, API keys
- **Performance Settings**: Compression, caching, clustering options
- **Monitoring Integration**: APM, logging, alerting configuration

### ✅ Enhanced Express Application
- **Graceful Shutdown**: SIGTERM/SIGINT handling
- **Request Logging**: Performance monitoring and debugging
- **Error Handling**: Production-safe error responses with request IDs
- **Compression**: Gzip compression for better performance
- **Static File Optimization**: Caching headers and ETags

## 📁 File Structure

```
server/
├── config/
│   └── index.js                 # Configuration management system
├── middleware/
│   ├── security.js             # Security hardening middleware
│   └── health.js               # Health check system
├── app.js                      # Enhanced Express application
└── ...

.env                            # Development configuration
.env.production.template        # Production configuration template
deploy.sh                       # Production deployment script
package.json                   # Updated with new dependencies
```

## 🚀 Getting Started

### Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Check health
curl http://localhost:3000/health
```

### Production Deployment
```bash
# 1. Copy and configure production environment
cp .env.production.template .env.production
# Edit .env.production with your production values

# 2. Run deployment script
chmod +x deploy.sh
./deploy.sh

# 3. Choose deployment method (PM2 recommended)
```

## 🔧 Configuration

### Environment Variables

#### Core Settings
```env
NODE_ENV=production                    # Environment mode
PORT=8080                             # Server port
HOST=0.0.0.0                          # Server host
APP_NAME="Snatched It"                # Application name
APP_VERSION=1.0.0                     # Application version
```

#### Security Settings
```env
JWT_SECRET=your_64_byte_hex_string    # JWT signing secret
JWT_EXPIRES_IN=7d                     # JWT expiration
SESSION_SECRET=your_session_secret    # Session secret
HELMET_ENABLED=true                   # Security headers
FORCE_HTTPS=true                      # Redirect to HTTPS
```

#### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000          # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100          # Max requests per window
RATE_LIMIT_AUTH_MAX_REQUESTS=5       # Auth attempts per window
```

#### Feature Flags
```env
ENABLE_ANALYTICS=true                # Analytics tracking
ENABLE_PRICE_ALERTS=true             # Price alert system
ENABLE_USER_REGISTRATION=true        # User registration
ENABLE_SOCIAL_FEATURES=false         # Social features
MAINTENANCE_MODE=false               # Maintenance mode
```

### Configuration API

```javascript
const config = require('./server/config');

// Get configuration values
const port = config.get('server.port');
const isProduction = config.isProduction();
const features = config.get('features');

// Check feature flags
if (config.isFeatureEnabled('analytics')) {
    // Analytics code
}

// Environment checks
if (config.isDevelopment()) {
    // Development-only code
}
```

## 🛡️ Security Features

### Rate Limiting Tiers
- **General API**: 100 requests/15 minutes
- **Authentication**: 5 attempts/15 minutes
- **Scraping**: 10 requests/minute
- **Progressive Slowdown**: Increasing delays for repeated requests

### Security Headers
- **Content Security Policy**: Prevents XSS attacks
- **HSTS**: Forces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Referrer Policy**: Controls referrer information

### Input Validation
```javascript
const security = new SecurityManager();
const validator = security.configureInputValidation();

// Validate and sanitize inputs
const isValidEmail = validator.isValidEmail(email);
const sanitizedQuery = validator.sanitizeSearchQuery(userInput);
```

## 💚 Health Monitoring

### Health Check Endpoints

#### Quick Health Check (`/health`)
```json
{
  "status": "healthy",
  "timestamp": "2025-06-28T16:10:04.909Z",
  "responseTime": 0,
  "memory": {
    "used": 17,
    "total": 19
  }
}
```

#### Full Health Check (`/health/full`)
Comprehensive system diagnostics including:
- System metrics (CPU, memory, uptime)
- Memory usage analysis
- Disk space and file accessibility
- Configuration validation
- Dependency availability
- Database connectivity
- Security configuration status

#### Readiness Check (`/health/ready`)
Service readiness for load balancer integration:
```json
{
  "ready": true,
  "timestamp": "2025-06-28T16:10:04.909Z",
  "checks": ["database", "cache", "dependencies"]
}
```

#### Liveness Check (`/health/live`)
Process health verification:
```json
{
  "alive": true,
  "timestamp": "2025-06-28T16:10:04.909Z",
  "uptime": 3600,
  "memory": {
    "heapUsed": 45,
    "heapTotal": 67
  }
}
```

## 🚢 Deployment Options

### 1. PM2 (Recommended)
```bash
# Install PM2
npm install -g pm2

# Deploy with cluster mode
./deploy.sh
# Choose option 1

# Management commands
pm2 status
pm2 logs snatched-it
pm2 restart snatched-it
pm2 stop snatched-it
```

### 2. Docker
```bash
# Generate Docker files
./deploy.sh
# Choose option 4

# Build and run
docker build -t snatched-it .
docker-compose up -d

# With nginx reverse proxy
docker-compose up -d
```

### 3. Forever
```bash
# Install forever
npm install -g forever

# Deploy
./deploy.sh
# Choose option 2

# Management
forever list
forever stop server/app.js
```

## 📊 Monitoring & Logging

### Application Logs
```bash
# PM2 logs
pm2 logs snatched-it

# File logs
tail -f logs/pm2-combined.log
tail -f logs/forever.log

# Error logs
tail -f logs/pm2-error.log
```

### Health Monitoring
```bash
# Quick health check
curl http://localhost:8080/health

# Full system diagnostics
curl http://localhost:8080/health/full | jq

# Monitor continuously
watch -n 5 'curl -s http://localhost:8080/health | jq'
```

### Performance Metrics
- Request response times logged
- Memory usage tracking
- Error rate monitoring
- Health check response times

## 🔍 Troubleshooting

### Common Issues

#### 1. Configuration Errors
```bash
# Validate configuration
NODE_ENV=production node -e "require('./server/config')"

# Check missing variables
grep "REPLACE_WITH" .env.production
```

#### 2. Health Check Failures
```bash
# Check specific health component
curl http://localhost:8080/health/full | jq '.checks.database'

# View detailed error logs
tail -f logs/*.log | grep ERROR
```

#### 3. Rate Limiting Issues
```bash
# Check rate limit headers
curl -I http://localhost:8080/api/products

# Adjust rate limits in .env
RATE_LIMIT_MAX_REQUESTS=200
```

#### 4. Memory Issues
```bash
# Monitor memory usage
curl http://localhost:8080/health | jq '.memory'

# Restart if memory usage high
pm2 restart snatched-it
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* NODE_ENV=development npm start

# Health check debug
curl http://localhost:3000/health/full | jq '.checks'
```

## 🔄 Next Steps (Phase 4B-4E)

### Phase 4B: Database Configuration
- PostgreSQL production setup
- Connection pooling
- Database migrations
- Backup strategies

### Phase 4C: Docker & Containerization
- Multi-stage Docker builds
- Container orchestration
- Volume management
- Container security

### Phase 4D: Cloud Deployment
- AWS/GCP/Azure deployment
- Load balancer configuration
- Auto-scaling setup
- CDN integration

### Phase 4E: Monitoring & Observability
- Application Performance Monitoring
- Error tracking (Sentry)
- Log aggregation
- Alerting and notifications

## 📝 Notes

- All sensitive configuration is externalized to environment variables
- Security middleware is environment-aware (stricter in production)
- Health checks are designed for container orchestration compatibility
- Configuration system supports hot-reloading in development
- Rate limiting is tuned for fashion e-commerce traffic patterns

## 🤝 Contributing

When adding new configuration:
1. Add to the configuration schema in `server/config/index.js`
2. Document in `.env.production.template`
3. Add validation if required
4. Update this documentation

## 📋 Checklist

- ✅ Configuration management system
- ✅ Security hardening middleware  
- ✅ Health check system
- ✅ Production environment template
- ✅ Enhanced Express application
- ✅ Deployment automation script
- ✅ Documentation and troubleshooting guide
- ✅ Testing and validation

Phase 4A is complete and ready for production deployment!
