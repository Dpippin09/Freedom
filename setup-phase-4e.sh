#!/bin/bash

# Phase 4E Complete Setup Script
# Sets up comprehensive monitoring, logging, and observability for Freedom Fashion

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Phase 4E Banner
show_banner() {
    echo -e "${GREEN}"
    echo "=============================================="
    echo "  Freedom Fashion - Phase 4E Setup"
    echo "  Advanced Monitoring & Logging"
    echo "=============================================="
    echo -e "${NC}"
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js")
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("Docker")
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        missing_deps+=("Docker Compose")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_error "Please install the missing dependencies and try again."
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

# Install Node.js dependencies
install_node_dependencies() {
    log_info "Installing Node.js monitoring dependencies..."
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Make sure you're in the project root directory."
        exit 1
    fi
    
    # Install specific monitoring dependencies
    npm install prom-client winston winston-cloudwatch @google-cloud/logging-winston --save
    
    if [ $? -eq 0 ]; then
        log_success "Node.js monitoring dependencies installed"
    else
        log_error "Failed to install Node.js dependencies"
        exit 1
    fi
}

# Setup monitoring directories
setup_directories() {
    log_info "Setting up monitoring directories..."
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p monitoring/data/{prometheus,grafana,alertmanager,loki}
    mkdir -p monitoring/scripts
    
    # Set appropriate permissions
    chmod 755 monitoring/data/*
    chmod +x monitoring/scripts/*.sh 2>/dev/null || true
    
    log_success "Monitoring directories created"
}

# Validate monitoring configuration
validate_monitoring_config() {
    log_info "Validating monitoring configuration..."
    
    local config_files=(
        "monitoring/config/prometheus.yml"
        "monitoring/config/grafana.ini"
        "monitoring/config/alertmanager.yml"
        "monitoring/config/alert_rules.yml"
        "monitoring/config/loki.yml"
        "monitoring/config/promtail.yml"
        "monitoring/docker-compose.monitoring.yml"
    )
    
    local missing_files=()
    
    for file in "${config_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        log_error "Missing monitoring configuration files:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        exit 1
    fi
    
    log_success "All monitoring configuration files are present"
}

# Test application integration
test_application_integration() {
    log_info "Testing application monitoring integration..."
    
    # Check if middleware files exist
    local middleware_files=(
        "server/middleware/logging.js"
        "server/middleware/metrics.js"
    )
    
    for file in "${middleware_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Missing middleware file: $file"
            exit 1
        fi
    done
    
    # Check if routes are updated
    if ! grep -q "metricsCollectionMiddleware" server/app.js; then
        log_warning "Metrics collection middleware may not be integrated in app.js"
    fi
    
    if ! grep -q "getMetricsHandler" server/routes/monitoring.js; then
        log_warning "Prometheus metrics handler may not be integrated in monitoring routes"
    fi
    
    log_success "Application monitoring integration validated"
}

# Start monitoring stack
start_monitoring_stack() {
    log_info "Starting monitoring stack..."
    
    # Use the monitoring script to start services
    if [ -f "monitoring/scripts/monitoring-stack.sh" ]; then
        bash monitoring/scripts/monitoring-stack.sh start
    else
        log_warning "Monitoring stack script not found, starting with docker-compose directly"
        docker-compose -f monitoring/docker-compose.monitoring.yml up -d
    fi
    
    # Wait for services to start
    log_info "Waiting for services to start..."
    sleep 30
    
    # Basic health check
    local services=(
        "http://localhost:9090/-/healthy"  # Prometheus
        "http://localhost:3001/api/health" # Grafana
        "http://localhost:9093/-/healthy"  # AlertManager
    )
    
    local failed_services=()
    
    for service in "${services[@]}"; do
        if ! curl -sf "$service" > /dev/null 2>&1; then
            failed_services+=("$service")
        fi
    done
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        log_success "All monitoring services are healthy"
    else
        log_warning "Some services may not be ready yet: ${failed_services[*]}"
        log_info "You can check service status with: npm run monitoring:status"
    fi
}

# Show final information
show_final_info() {
    echo ""
    log_success "Phase 4E Setup Complete!"
    echo ""
    echo -e "${GREEN}Monitoring Services:${NC}"
    echo "  📊 Grafana Dashboard:  http://localhost:3001 (admin/admin123)"
    echo "  📈 Prometheus:         http://localhost:9090"
    echo "  🚨 AlertManager:       http://localhost:9093"
    echo "  🔍 Node Exporter:      http://localhost:9100"
    echo "  📝 Loki:               http://localhost:3100"
    echo ""
    echo -e "${GREEN}Application Endpoints:${NC}"
    echo "  📊 Metrics (JSON):     http://localhost:3000/api/monitoring/metrics"
    echo "  📈 Prometheus Metrics: http://localhost:3000/api/monitoring/prometheus"
    echo "  ❤️  Health Check:      http://localhost:3000/api/monitoring/health"
    echo ""
    echo -e "${GREEN}Management Commands:${NC}"
    echo "  npm run monitoring:start    - Start monitoring stack"
    echo "  npm run monitoring:stop     - Stop monitoring stack"
    echo "  npm run monitoring:status   - Check service status"
    echo "  npm run monitoring:health   - Health check all services"
    echo "  npm run monitoring:info     - Show service information"
    echo ""
    echo -e "${GREEN}Next Steps:${NC}"
    echo "  1. Configure alerting channels (email, Slack) in alertmanager.yml"
    echo "  2. Import custom dashboards in Grafana"
    echo "  3. Set up log retention policies"
    echo "  4. Configure cloud monitoring integration"
    echo "  5. Test alert rules and notifications"
    echo ""
}

# Main execution
main() {
    show_banner
    
    log_info "Starting Phase 4E: Advanced Monitoring & Logging setup..."
    
    check_dependencies
    install_node_dependencies
    setup_directories
    validate_monitoring_config
    test_application_integration
    
    # Ask if user wants to start monitoring stack
    echo ""
    log_info "Do you want to start the monitoring stack now? (y/N)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        start_monitoring_stack
    else
        log_info "Monitoring stack not started. You can start it later with: npm run monitoring:start"
    fi
    
    show_final_info
    
    log_success "Phase 4E setup completed successfully!"
}

# Handle script interruption
trap 'log_warning "Setup interrupted by user"; exit 1' INT

# Run main function
main "$@"
