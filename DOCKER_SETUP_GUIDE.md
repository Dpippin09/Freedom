# 🐳 Docker Installation & Testing Guide

## Phase 4C: Docker & Containerization - Complete Setup

This guide will help you install Docker and test the containerized Freedom Fashion platform.

## 📋 Prerequisites

### System Requirements
- **Windows 10/11** (Pro, Enterprise, or Education with Hyper-V)
- **macOS 10.14+** 
- **Linux** (Ubuntu 18.04+, CentOS 7+, or equivalent)
- **8GB RAM minimum** (16GB recommended)
- **20GB free disk space**

## 🚀 Docker Installation

### Windows
1. **Download Docker Desktop**
   ```
   https://www.docker.com/products/docker-desktop/
   ```

2. **Run the installer**
   - Double-click the downloaded `.exe` file
   - Follow the installation wizard
   - **Enable WSL 2** when prompted

3. **Start Docker Desktop**
   - Launch from Start menu
   - Wait for Docker to start (whale icon in system tray)

4. **Verify installation**
   ```bash
   docker --version
   docker-compose --version
   ```

### macOS
1. **Download Docker Desktop**
   ```
   https://www.docker.com/products/docker-desktop/
   ```

2. **Install the application**
   - Open the downloaded `.dmg` file
   - Drag Docker to Applications folder
   - Launch Docker from Applications

3. **Verify installation**
   ```bash
   docker --version
   docker-compose --version
   ```

### Linux (Ubuntu/Debian)
```bash
# Update package index
sudo apt-get update

# Install required packages
sudo apt-get install apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up stable repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Verify installation
docker --version
docker compose version
```

## 🧪 Testing Docker Configuration

### Step 1: Validate Configuration
```bash
# Run configuration validation
./validate-docker.sh
```

This script checks:
- ✅ All Docker files are present
- ✅ Directory structure is correct
- ✅ Nginx configuration exists
- ✅ Environment templates are available
- ✅ Package.json scripts are configured

### Step 2: Test Development Environment

#### Start Development Stack
```bash
# Start all services (app, database, redis, nginx)
npm run docker:dev

# Or use Docker Compose directly
docker-compose -f docker-compose.dev.yml up --build
```

#### Check Container Status
```bash
# View running containers
docker-compose -f docker-compose.dev.yml ps

# Expected output:
# NAME                COMMAND                  SERVICE             STATUS              PORTS
# freedom-app-dev     "npm run dev"            app                 running (healthy)   0.0.0.0:3000->3000/tcp
# freedom-nginx-dev   "/docker-entrypoint.…"   nginx               running (healthy)   0.0.0.0:8080->80/tcp
# freedom-postgres    "docker-entrypoint.s…"   postgres            running (healthy)   0.0.0.0:5432->5432/tcp
# freedom-redis       "docker-entrypoint.s…"   redis               running (healthy)   0.0.0.0:6379->6379/tcp
```

#### Test Application Endpoints
```bash
# Test application health
curl http://localhost:3000/health/quick

# Test via Nginx proxy
curl http://localhost:8080/health/quick

# Test database connection
curl http://localhost:3000/health/detailed
```

#### View Logs
```bash
# View all service logs
docker-compose -f docker-compose.dev.yml logs -f

# View specific service logs
docker-compose -f docker-compose.dev.yml logs -f app
docker-compose -f docker-compose.dev.yml logs -f postgres
docker-compose -f docker-compose.dev.yml logs -f redis
docker-compose -f docker-compose.dev.yml logs -f nginx
```

#### Stop Development Environment
```bash
# Stop all services
npm run docker:dev:down

# Or use Docker Compose directly
docker-compose -f docker-compose.dev.yml down
```

### Step 3: Test Production Environment

#### Start Production Stack
```bash
# Start production environment
npm run docker:prod

# Or use Docker Compose directly
docker-compose up --build
```

#### Test Production Endpoints
```bash
# Test via Nginx (production uses port 80)
curl http://localhost/health/quick

# Test HTTPS (if SSL certificates are configured)
curl https://localhost/health/quick
```

#### Stop Production Environment
```bash
npm run docker:prod:down
```

## 🔧 Development Workflow

### Daily Development with Docker

#### 1. Start Development Environment
```bash
npm run docker:dev
```

#### 2. Make Code Changes
- Edit files in your IDE
- Changes are automatically reflected (volume mounted)
- Nodemon restarts the app on changes

#### 3. View Changes
- Open http://localhost:3000 (direct app access)
- Open http://localhost:8080 (via Nginx proxy)

#### 4. Debug Issues
```bash
# Check logs
docker-compose -f docker-compose.dev.yml logs -f app

# Access container shell
docker-compose -f docker-compose.dev.yml exec app sh

# Check database
docker-compose -f docker-compose.dev.yml exec postgres psql -U freedom_user -d freedom_fashion
```

#### 5. Clean Up
```bash
# Stop services
npm run docker:dev:down

# Clean up resources (optional)
npm run docker:clean
```

## 🗄️ Database Operations in Docker

### Access PostgreSQL
```bash
# Connect to database
docker-compose -f docker-compose.dev.yml exec postgres psql -U freedom_user -d freedom_fashion

# Run SQL commands
\dt  # List tables
\q   # Quit
```

### Run Database Migrations
```bash
# Access app container
docker-compose -f docker-compose.dev.yml exec app sh

# Inside container, run migrations
npm run db:migrate
npm run db:seed
npm run db:status
```

### Access Redis
```bash
# Connect to Redis
docker-compose -f docker-compose.dev.yml exec redis redis-cli -a redis_secure_password_2024

# Test Redis
SET test "Hello Docker"
GET test
```

## 🐛 Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check detailed logs
docker-compose -f docker-compose.dev.yml logs [service-name]

# Check container status
docker-compose -f docker-compose.dev.yml ps

# Restart specific service
docker-compose -f docker-compose.dev.yml restart [service-name]
```

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process or change port in docker-compose file
```

#### Database Connection Issues
```bash
# Check PostgreSQL container logs
docker-compose -f docker-compose.dev.yml logs postgres

# Test database connectivity
docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U freedom_user -d freedom_fashion
```

#### Application Health Check Failures
```bash
# Check app logs
docker-compose -f docker-compose.dev.yml logs app

# Manual health check
docker-compose -f docker-compose.dev.yml exec app node health-check.js

# Check if app is listening on correct port
docker-compose -f docker-compose.dev.yml exec app netstat -tulpn | grep :3000
```

### Reset Everything
```bash
# Stop all containers and remove volumes
docker-compose -f docker-compose.dev.yml down -v

# Remove all unused Docker resources
docker system prune -a -f
docker volume prune -f

# Restart Docker Desktop (if on Windows/macOS)
```

## 📊 Performance Monitoring

### Check Resource Usage
```bash
# View container resource usage
docker stats

# Check disk usage
docker system df
```

### Database Performance
```bash
# PostgreSQL stats
docker-compose exec postgres psql -U freedom_user -d freedom_fashion -c "SELECT * FROM pg_stat_activity;"

# Redis stats
docker-compose exec redis redis-cli -a redis_secure_password_2024 info stats
```

## 🚀 Ready for Production

Once Docker testing is complete:

1. **✅ All containers start successfully**
2. **✅ Health checks pass**
3. **✅ Database operations work**
4. **✅ Application responds correctly**
5. **✅ Nginx serves requests properly**

### Next Steps
- **Phase 4D**: Cloud deployment (AWS, GCP, Azure)
- **Phase 4E**: Monitoring and logging setup
- **SSL Configuration**: Add HTTPS certificates
- **CI/CD Pipeline**: Automated deployment

---

**🎉 Phase 4C: Docker & Containerization - COMPLETE!**

Your Freedom Fashion platform is now fully containerized and ready for production deployment!
