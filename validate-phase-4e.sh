#!/bin/bash

# Phase 4E Validation Script
# Validates that all monitoring and logging components are properly configured

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
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Validation counters
PASSED=0
FAILED=0

validate_item() {
    local description="$1"
    local command="$2"
    
    if eval "$command" &>/dev/null; then
        log_success "$description"
        ((PASSED++))
        return 0
    else
        log_error "$description"
        ((FAILED++))
        return 1
    fi
}

# Banner
echo -e "${GREEN}"
echo "=============================================="
echo "  Freedom Fashion - Phase 4E Validation"
echo "  Advanced Monitoring & Logging"
echo "=============================================="
echo -e "${NC}"

log_info "Validating Phase 4E implementation..."
echo ""

# 1. Check directory structure
log_info "📁 Checking directory structure..."
validate_item "Logs directory exists" "test -d logs"
validate_item "Monitoring config directory exists" "test -d monitoring/config"
validate_item "Monitoring dashboards directory exists" "test -d monitoring/dashboards"
validate_item "Monitoring scripts directory exists" "test -d monitoring/scripts"
echo ""

# 2. Check configuration files
log_info "⚙️  Checking configuration files..."
validate_item "Prometheus config exists" "test -f monitoring/config/prometheus.yml"
validate_item "Grafana config exists" "test -f monitoring/config/grafana.ini"
validate_item "AlertManager config exists" "test -f monitoring/config/alertmanager.yml"
validate_item "Alert rules exist" "test -f monitoring/config/alert_rules.yml"
validate_item "Loki config exists" "test -f monitoring/config/loki.yml"
validate_item "Promtail config exists" "test -f monitoring/config/promtail.yml"
validate_item "Grafana datasources config exists" "test -f monitoring/config/grafana-datasources.yml"
echo ""

# 3. Check Docker Compose files
log_info "🐳 Checking Docker Compose files..."
validate_item "Monitoring Docker Compose exists" "[ -f 'monitoring/docker-compose.monitoring.yml' ]"
validate_item "Main Docker Compose exists" "[ -f 'docker-compose.yml' ]"
validate_item "Development Docker Compose exists" "[ -f 'docker-compose.dev.yml' ]"
echo ""

# 4. Check application middleware
log_info "🔧 Checking application middleware..."
validate_item "Logging middleware exists" "[ -f 'server/middleware/logging.js' ]"
validate_item "Metrics middleware exists" "[ -f 'server/middleware/metrics.js' ]"
validate_item "Monitoring routes exist" "[ -f 'server/routes/monitoring.js' ]"
echo ""

# 5. Check middleware integration
log_info "🔗 Checking middleware integration..."
validate_item "Logging middleware integrated in app.js" "grep -q 'requestLoggingMiddleware' server/app.js"
validate_item "Metrics middleware integrated in app.js" "grep -q 'metricsCollectionMiddleware' server/app.js"
validate_item "Monitoring routes integrated" "grep -q 'monitoring' server/app.js"
echo ""

# 6. Check dashboards
log_info "📊 Checking dashboards..."
validate_item "Main dashboard exists" "[ -f 'monitoring/dashboards/main-dashboard.json' ]"
validate_item "Business dashboard exists" "[ -f 'monitoring/dashboards/business-dashboard.json' ]"
echo ""

# 7. Check scripts
log_info "📜 Checking scripts..."
validate_item "Monitoring stack script exists" "[ -f 'monitoring/scripts/monitoring-stack.sh' ]"
validate_item "Phase 4E setup script exists" "[ -f 'setup-phase-4e.sh' ]"
validate_item "Monitoring stack script is executable" "[ -x 'monitoring/scripts/monitoring-stack.sh' ]"
validate_item "Phase 4E setup script is executable" "[ -x 'setup-phase-4e.sh' ]"
echo ""

# 8. Check package.json updates
log_info "📦 Checking package.json updates..."
validate_item "Monitoring dependencies in package.json" "grep -q 'prom-client' package.json"
validate_item "Winston logging in package.json" "grep -q 'winston' package.json"
validate_item "Monitoring scripts added to package.json" "grep -q 'monitoring:start' package.json"
echo ""

# 9. Check node dependencies
log_info "📚 Checking Node.js dependencies..."
validate_item "prom-client installed" "[ -d 'node_modules/prom-client' ]"
validate_item "winston installed" "[ -d 'node_modules/winston' ]"
validate_item "winston-cloudwatch installed" "[ -d 'node_modules/winston-cloudwatch' ]"
echo ""

# 10. Check documentation
log_info "📖 Checking documentation..."
validate_item "Phase 4E plan exists" "[ -f 'PHASE_4E_PLAN.md' ]"
validate_item "Phase 4E completion doc exists" "[ -f 'PHASE_4E_COMPLETE.md' ]"
echo ""

# 11. Validate configuration syntax (basic checks)
log_info "🔍 Validating configuration syntax..."

# Check YAML syntax for key files
if command -v python3 &> /dev/null; then
    validate_item "Prometheus config syntax" "python3 -c 'import yaml; yaml.safe_load(open(\"monitoring/config/prometheus.yml\"))'"
    validate_item "AlertManager config syntax" "python3 -c 'import yaml; yaml.safe_load(open(\"monitoring/config/alertmanager.yml\"))'"
    validate_item "Loki config syntax" "python3 -c 'import yaml; yaml.safe_load(open(\"monitoring/config/loki.yml\"))'"
elif command -v node &> /dev/null; then
    # Fallback to basic checks
    validate_item "Prometheus config not empty" "[ -s 'monitoring/config/prometheus.yml' ]"
    validate_item "AlertManager config not empty" "[ -s 'monitoring/config/alertmanager.yml' ]"
    validate_item "Loki config not empty" "[ -s 'monitoring/config/loki.yml' ]"
else
    log_warning "No YAML parser available for syntax validation"
fi

# Check JSON syntax for dashboards
if command -v node &> /dev/null; then
    validate_item "Main dashboard JSON syntax" "node -e 'JSON.parse(require(\"fs\").readFileSync(\"monitoring/dashboards/main-dashboard.json\"))'"
    validate_item "Business dashboard JSON syntax" "node -e 'JSON.parse(require(\"fs\").readFileSync(\"monitoring/dashboards/business-dashboard.json\"))'"
fi
echo ""

# 12. Check Docker availability
log_info "🐋 Checking Docker environment..."
validate_item "Docker is installed" "command -v docker"
validate_item "Docker Compose is installed" "command -v docker-compose"
if command -v docker &> /dev/null; then
    validate_item "Docker daemon is running" "docker info"
fi
echo ""

# Summary
echo -e "${GREEN}=============================================="
echo "  Validation Summary"
echo "===============================================" 
echo -e "${NC}"

if [ $FAILED -eq 0 ]; then
    log_success "All validations passed! ($PASSED/$((PASSED + FAILED)))"
    log_success "Phase 4E is correctly implemented and ready to use"
    echo ""
    log_info "🚀 Next steps:"
    echo "  1. Start the monitoring stack: npm run monitoring:start"
    echo "  2. Start the application: npm start"
    echo "  3. Access Grafana: http://localhost:3001 (admin/admin123)"
    echo "  4. View metrics: http://localhost:3000/api/monitoring/metrics"
    echo ""
else
    log_error "Some validations failed ($FAILED failed, $PASSED passed)"
    log_info "Please review the failed items above and fix them before proceeding"
    echo ""
    log_info "💡 Common fixes:"
    echo "  - Run: bash setup-phase-4e.sh"
    echo "  - Check file permissions: chmod +x monitoring/scripts/*.sh"
    echo "  - Install dependencies: npm install"
    echo ""
    exit 1
fi

# Show additional information
echo -e "${BLUE}=============================================="
echo "  Additional Information"
echo "==============================================="
echo -e "${NC}"

echo "📊 Monitoring Services (when started):"
echo "  • Grafana:      http://localhost:3001"
echo "  • Prometheus:   http://localhost:9090"
echo "  • AlertManager: http://localhost:9093"
echo "  • Node Exporter: http://localhost:9100"
echo "  • Loki:         http://localhost:3100"
echo ""

echo "📈 Application Endpoints:"
echo "  • Metrics (JSON):    http://localhost:3000/api/monitoring/metrics"
echo "  • Prometheus format: http://localhost:3000/api/monitoring/prometheus"
echo "  • Health check:      http://localhost:3000/api/monitoring/health"
echo ""

echo "🛠️ Management Commands:"
echo "  • npm run monitoring:start    - Start monitoring stack"
echo "  • npm run monitoring:stop     - Stop monitoring stack"
echo "  • npm run monitoring:status   - Check service status"
echo "  • npm run monitoring:health   - Health check all services"
echo ""

log_success "Phase 4E validation completed successfully!"
