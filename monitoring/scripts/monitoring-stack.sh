#!/bin/bash

# Monitoring Stack Management Script for Freedom Fashion Platform
# Provides easy commands to start, stop, and manage the monitoring infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="monitoring/docker-compose.monitoring.yml"
SERVICES=("prometheus" "grafana" "alertmanager" "node-exporter" "loki" "promtail")

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

# Check if Docker and Docker Compose are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    log_success "Dependencies check passed"
}

# Create necessary directories and files
setup_monitoring() {
    log_info "Setting up monitoring infrastructure..."
    
    # Create logs directory
    mkdir -p logs
    
    # Create monitoring data directories
    mkdir -p monitoring/data/{prometheus,grafana,alertmanager,loki}
    
    # Set permissions
    chmod 755 monitoring/data/*
    
    log_success "Monitoring setup completed"
}

# Start monitoring stack
start_monitoring() {
    log_info "Starting monitoring stack..."
    
    setup_monitoring
    
    docker-compose -f $COMPOSE_FILE up -d
    
    if [ $? -eq 0 ]; then
        log_success "Monitoring stack started successfully"
        show_services_info
    else
        log_error "Failed to start monitoring stack"
        exit 1
    fi
}

# Stop monitoring stack
stop_monitoring() {
    log_info "Stopping monitoring stack..."
    
    docker-compose -f $COMPOSE_FILE down
    
    if [ $? -eq 0 ]; then
        log_success "Monitoring stack stopped successfully"
    else
        log_error "Failed to stop monitoring stack"
        exit 1
    fi
}

# Restart monitoring stack
restart_monitoring() {
    log_info "Restarting monitoring stack..."
    
    stop_monitoring
    sleep 2
    start_monitoring
}

# Show status of monitoring services
status_monitoring() {
    log_info "Monitoring stack status:"
    
    docker-compose -f $COMPOSE_FILE ps
}

# Show logs for a specific service
show_logs() {
    local service=$1
    
    if [ -z "$service" ]; then
        log_error "Please specify a service name"
        echo "Available services: ${SERVICES[*]}"
        exit 1
    fi
    
    log_info "Showing logs for $service..."
    docker-compose -f $COMPOSE_FILE logs -f "$service"
}

# Show service URLs and access information
show_services_info() {
    echo ""
    log_info "Monitoring Services Access Information:"
    echo "======================================================"
    echo -e "${GREEN}Grafana Dashboard:${NC}     http://localhost:3001"
    echo -e "  Username: admin"
    echo -e "  Password: admin123"
    echo ""
    echo -e "${GREEN}Prometheus:${NC}            http://localhost:9090"
    echo -e "${GREEN}AlertManager:${NC}          http://localhost:9093"
    echo -e "${GREEN}Node Exporter:${NC}        http://localhost:9100"
    echo -e "${GREEN}Loki:${NC}                 http://localhost:3100"
    echo -e "${GREEN}cAdvisor:${NC}             http://localhost:8080"
    echo "======================================================"
    echo ""
}

# Health check for monitoring services
health_check() {
    log_info "Performing health check on monitoring services..."
    
    local failed_services=()
    
    # Check Prometheus
    if curl -s http://localhost:9090/-/healthy > /dev/null; then
        log_success "Prometheus is healthy"
    else
        log_error "Prometheus is not responding"
        failed_services+=("prometheus")
    fi
    
    # Check Grafana
    if curl -s http://localhost:3001/api/health > /dev/null; then
        log_success "Grafana is healthy"
    else
        log_error "Grafana is not responding"
        failed_services+=("grafana")
    fi
    
    # Check AlertManager
    if curl -s http://localhost:9093/-/healthy > /dev/null; then
        log_success "AlertManager is healthy"
    else
        log_error "AlertManager is not responding"
        failed_services+=("alertmanager")
    fi
    
    # Check Loki
    if curl -s http://localhost:3100/ready > /dev/null; then
        log_success "Loki is healthy"
    else
        log_error "Loki is not responding"
        failed_services+=("loki")
    fi
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        log_success "All monitoring services are healthy"
    else
        log_error "Failed services: ${failed_services[*]}"
        exit 1
    fi
}

# Clean up monitoring data (use with caution)
cleanup_data() {
    log_warning "This will remove all monitoring data. Are you sure? (y/N)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        log_info "Cleaning up monitoring data..."
        
        stop_monitoring
        
        docker-compose -f $COMPOSE_FILE down -v
        sudo rm -rf monitoring/data/*
        
        log_success "Monitoring data cleaned up"
    else
        log_info "Cleanup cancelled"
    fi
}

# Main command handler
case "$1" in
    start)
        check_dependencies
        start_monitoring
        ;;
    stop)
        stop_monitoring
        ;;
    restart)
        check_dependencies
        restart_monitoring
        ;;
    status)
        status_monitoring
        ;;
    logs)
        show_logs "$2"
        ;;
    health)
        health_check
        ;;
    info)
        show_services_info
        ;;
    cleanup)
        cleanup_data
        ;;
    *)
        echo "Freedom Fashion Monitoring Stack Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|health|info|cleanup}"
        echo ""
        echo "Commands:"
        echo "  start     - Start the monitoring stack"
        echo "  stop      - Stop the monitoring stack"
        echo "  restart   - Restart the monitoring stack"
        echo "  status    - Show status of monitoring services"
        echo "  logs      - Show logs for a specific service"
        echo "  health    - Perform health check on all services"
        echo "  info      - Show service URLs and access information"
        echo "  cleanup   - Clean up all monitoring data (WARNING: destructive)"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs prometheus"
        echo "  $0 health"
        exit 1
        ;;
esac
