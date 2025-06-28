// Prometheus Metrics Integration for Freedom Fashion Platform
// Exposes application metrics in Prometheus format

const promClient = require('prom-client');
const { getMetricsSummary } = require('./logging');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add default metrics (memory, CPU, etc.)
promClient.collectDefaultMetrics({
    register,
    prefix: 'freedom_fashion_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    eventLoopMonitoringPrecision: 10
});

// Custom application metrics
const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register]
});

const activeUsers = new promClient.Gauge({
    name: 'active_users_total',
    help: 'Number of currently active users',
    registers: [register]
});

const totalUsers = new promClient.Gauge({
    name: 'total_users',
    help: 'Total number of registered users',
    registers: [register]
});

const activeAlerts = new promClient.Gauge({
    name: 'active_alerts_total',
    help: 'Number of active price alerts',
    registers: [register]
});

const productsMonitored = new promClient.Gauge({
    name: 'products_monitored_total',
    help: 'Number of products being monitored',
    registers: [register]
});

const priceChecks = new promClient.Counter({
    name: 'price_checks_total',
    help: 'Total number of price checks performed',
    labelNames: ['success'],
    registers: [register]
});

const userRegistrations = new promClient.Counter({
    name: 'user_registrations_total',
    help: 'Total number of user registrations',
    registers: [register]
});

const alertsCreated = new promClient.Counter({
    name: 'alerts_created_total',
    help: 'Total number of alerts created',
    labelNames: ['category'],
    registers: [register]
});

const scrapingErrors = new promClient.Counter({
    name: 'scraping_errors_total',
    help: 'Total number of scraping errors',
    labelNames: ['error_type', 'source'],
    registers: [register]
});

const priceMonitoringActive = new promClient.Gauge({
    name: 'price_monitoring_active',
    help: 'Whether price monitoring is currently active (1) or not (0)',
    registers: [register]
});

const userSavings = new promClient.Histogram({
    name: 'user_savings_dollars',
    help: 'Distribution of user savings in dollars',
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
    registers: [register]
});

const productsByCategory = new promClient.Gauge({
    name: 'products_by_category',
    help: 'Number of products by category',
    labelNames: ['category'],
    registers: [register]
});

// Middleware to collect HTTP metrics
function metricsCollectionMiddleware(req, res, next) {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        const route = req.route?.path || req.path;
        
        // Record request metrics
        httpRequestsTotal
            .labels(req.method, route, res.statusCode.toString())
            .inc();
        
        httpRequestDuration
            .labels(req.method, route, res.statusCode.toString())
            .observe(duration);
    });
    
    next();
}

// Function to update business metrics
function updateBusinessMetrics(metrics) {
    if (metrics.activeUsers !== undefined) {
        activeUsers.set(metrics.activeUsers);
    }
    
    if (metrics.totalUsers !== undefined) {
        totalUsers.set(metrics.totalUsers);
    }
    
    if (metrics.activeAlerts !== undefined) {
        activeAlerts.set(metrics.activeAlerts);
    }
    
    if (metrics.productsMonitored !== undefined) {
        productsMonitored.set(metrics.productsMonitored);
    }
    
    if (metrics.priceMonitoringActive !== undefined) {
        priceMonitoringActive.set(metrics.priceMonitoringActive ? 1 : 0);
    }
    
    if (metrics.productsByCategory) {
        // Reset all category gauges first
        productsByCategory.reset();
        
        // Set new values
        Object.entries(metrics.productsByCategory).forEach(([category, count]) => {
            productsByCategory.labels(category).set(count);
        });
    }
}

// Function to record events
function recordEvent(eventType, labels = {}) {
    switch (eventType) {
        case 'user_registration':
            userRegistrations.inc();
            break;
        case 'alert_created':
            alertsCreated.labels(labels.category || 'unknown').inc();
            break;
        case 'price_check_success':
            priceChecks.labels('true').inc();
            break;
        case 'price_check_failure':
            priceChecks.labels('false').inc();
            break;
        case 'scraping_error':
            scrapingErrors.labels(labels.errorType || 'unknown', labels.source || 'unknown').inc();
            break;
        case 'user_savings':
            if (labels.amount) {
                userSavings.observe(labels.amount);
            }
            break;
    }
}

// Metrics endpoint handler
async function getMetricsHandler(req, res) {
    try {
        // Update metrics from internal tracking
        const internalMetrics = getMetricsSummary();
        
        // You can add business logic here to fetch current counts from database
        // For example:
        // const dbMetrics = await getDatabaseMetrics();
        // updateBusinessMetrics(dbMetrics);
        
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        console.error('Error generating metrics:', error);
        res.status(500).send('Error generating metrics');
    }
}

// Health check with metrics
function getHealthWithMetrics() {
    const metrics = getMetricsSummary();
    
    return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        metrics: {
            requests: metrics.requests,
            performance: metrics.performance,
            errors: metrics.errors
        },
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
    };
}

// Reset all metrics (useful for testing)
function resetAllMetrics() {
    register.resetMetrics();
}

module.exports = {
    register,
    metricsCollectionMiddleware,
    updateBusinessMetrics,
    recordEvent,
    getMetricsHandler,
    getHealthWithMetrics,
    resetAllMetrics,
    
    // Individual metrics for direct access
    metrics: {
        httpRequestsTotal,
        httpRequestDuration,
        activeUsers,
        totalUsers,
        activeAlerts,
        productsMonitored,
        priceChecks,
        userRegistrations,
        alertsCreated,
        scrapingErrors,
        priceMonitoringActive,
        userSavings,
        productsByCategory
    }
};
