// Advanced Logging Middleware for Freedom Fashion Platform
// Provides structured logging, request tracking, and performance monitoring

const winston = require('winston');
const crypto = require('crypto');

// Create centralized logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
    ),
    defaultMeta: {
        service: 'freedom-fashion',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0'
    },
    transports: [
        // Console logging for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        
        // File logging for production
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 10
        }),
        
        new winston.transports.File({
            filename: 'logs/application.log',
            maxsize: 10485760, // 10MB
            maxFiles: 20
        })
    ]
});

// Add cloud logging transport if in production
if (process.env.NODE_ENV === 'production') {
    // AWS CloudWatch
    if (process.env.CLOUD_PROVIDER === 'aws') {
        const CloudWatchLogs = require('winston-cloudwatch');
        logger.add(new CloudWatchLogs({
            logGroupName: '/ecs/freedom-fashion',
            logStreamName: `${process.env.HOSTNAME || 'app'}-${new Date().toISOString().split('T')[0]}`,
            awsRegion: process.env.AWS_REGION || 'us-east-1',
            awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
            awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY
        }));
    }
    
    // Google Cloud Logging
    if (process.env.CLOUD_PROVIDER === 'gcp') {
        const { LoggingWinston } = require('@google-cloud/logging-winston');
        logger.add(new LoggingWinston({
            projectId: process.env.GCP_PROJECT_ID,
            keyFilename: process.env.GCP_KEY_FILE
        }));
    }
}

// Request correlation ID generator
function generateCorrelationId() {
    return crypto.randomBytes(16).toString('hex');
}

// Enhanced request logging middleware
function requestLoggingMiddleware(req, res, next) {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
    
    // Add correlation ID to request and response headers
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    
    // Create request-specific logger
    req.logger = logger.child({
        correlationId,
        requestId: req.headers['x-request-id'] || correlationId,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id || null
    });
    
    // Log incoming request
    req.logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        query: req.query,
        headers: {
            'content-type': req.headers['content-type'],
            'authorization': req.headers.authorization ? '[REDACTED]' : undefined,
            'user-agent': req.headers['user-agent']
        },
        body: sanitizeRequestBody(req.body)
    });
    
    // Override res.json to log responses
    const originalJson = res.json;
    res.json = function(data) {
        const duration = Date.now() - startTime;
        
        // Log response
        req.logger.info('Outgoing response', {
            statusCode: res.statusCode,
            duration,
            method: req.method,
            url: req.url,
            responseSize: JSON.stringify(data).length,
            success: res.statusCode < 400
        });
        
        // Record metrics
        recordRequestMetrics(req, res, duration);
        
        return originalJson.call(this, data);
    };
    
    // Handle response end
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        if (!res.headersSent || !res.getHeader('content-type')?.includes('json')) {
            req.logger.info('Request completed', {
                statusCode: res.statusCode,
                duration,
                method: req.method,
                url: req.url,
                success: res.statusCode < 400
            });
            
            recordRequestMetrics(req, res, duration);
        }
    });
    
    // Handle errors
    res.on('error', (error) => {
        req.logger.error('Response error', {
            error: error.message,
            stack: error.stack,
            statusCode: res.statusCode,
            method: req.method,
            url: req.url
        });
    });
    
    next();
}

// Sanitize request body for logging (remove sensitive data)
function sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') return body;
    
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }
    
    return sanitized;
}

// Performance metrics collection
const metrics = {
    requests: {
        total: 0,
        byMethod: {},
        byStatus: {},
        byEndpoint: {}
    },
    performance: {
        responseTime: {
            sum: 0,
            count: 0,
            min: Infinity,
            max: 0,
            p95: []
        }
    },
    errors: {
        total: 0,
        byType: {},
        byEndpoint: {}
    }
};

function recordRequestMetrics(req, res, duration) {
    // Update request counters
    metrics.requests.total++;
    metrics.requests.byMethod[req.method] = (metrics.requests.byMethod[req.method] || 0) + 1;
    metrics.requests.byStatus[res.statusCode] = (metrics.requests.byStatus[res.statusCode] || 0) + 1;
    
    // Clean endpoint path for metrics (remove IDs)
    const endpoint = req.route?.path || req.url.replace(/\/\d+/g, '/:id');
    metrics.requests.byEndpoint[endpoint] = (metrics.requests.byEndpoint[endpoint] || 0) + 1;
    
    // Update performance metrics
    metrics.performance.responseTime.sum += duration;
    metrics.performance.responseTime.count++;
    metrics.performance.responseTime.min = Math.min(metrics.performance.responseTime.min, duration);
    metrics.performance.responseTime.max = Math.max(metrics.performance.responseTime.max, duration);
    
    // Keep last 1000 response times for percentile calculation
    metrics.performance.responseTime.p95.push(duration);
    if (metrics.performance.responseTime.p95.length > 1000) {
        metrics.performance.responseTime.p95.shift();
    }
    
    // Record errors
    if (res.statusCode >= 400) {
        metrics.errors.total++;
        const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
        metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
        metrics.errors.byEndpoint[endpoint] = (metrics.errors.byEndpoint[endpoint] || 0) + 1;
    }
}

// Error logging middleware
function errorLoggingMiddleware(error, req, res, next) {
    const correlationId = req.correlationId || 'unknown';
    
    // Create error logger with context
    const errorLogger = logger.child({
        correlationId,
        userId: req.user?.id || null,
        url: req.url,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress
    });
    
    // Log error with full context
    errorLogger.error('Application error', {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code || 'UNKNOWN_ERROR'
        },
        request: {
            headers: sanitizeHeaders(req.headers),
            body: sanitizeRequestBody(req.body),
            query: req.query,
            params: req.params
        }
    });
    
    // Record error metrics
    metrics.errors.total++;
    metrics.errors.byType[error.name || 'UnknownError'] = (metrics.errors.byType[error.name || 'UnknownError'] || 0) + 1;
    
    next(error);
}

// Sanitize headers for logging
function sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    for (const header of sensitiveHeaders) {
        if (sanitized[header]) {
            sanitized[header] = '[REDACTED]';
        }
    }
    
    return sanitized;
}

// Business event logging
function logBusinessEvent(eventType, eventData, req = null) {
    const eventLogger = logger.child({
        correlationId: req?.correlationId || generateCorrelationId(),
        userId: req?.user?.id || eventData.userId || null,
        eventType: 'business_event'
    });
    
    eventLogger.info(`Business event: ${eventType}`, {
        event: eventType,
        data: eventData,
        timestamp: new Date().toISOString()
    });
}

// Security event logging
function logSecurityEvent(eventType, details, req = null) {
    const securityLogger = logger.child({
        correlationId: req?.correlationId || generateCorrelationId(),
        userId: req?.user?.id || details.userId || null,
        eventType: 'security_event',
        severity: details.severity || 'medium'
    });
    
    securityLogger.warn(`Security event: ${eventType}`, {
        event: eventType,
        details,
        timestamp: new Date().toISOString(),
        ip: req?.ip || details.ip,
        userAgent: req?.headers['user-agent'] || details.userAgent
    });
}

// Performance monitoring
function logPerformanceMetric(metricName, value, tags = {}) {
    logger.info('Performance metric', {
        eventType: 'performance_metric',
        metric: metricName,
        value,
        tags,
        timestamp: new Date().toISOString()
    });
}

// Get current metrics summary
function getMetricsSummary() {
    const responseTime = metrics.performance.responseTime;
    const avgResponseTime = responseTime.count > 0 ? responseTime.sum / responseTime.count : 0;
    
    // Calculate 95th percentile
    const sortedTimes = [...responseTime.p95].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95ResponseTime = sortedTimes[p95Index] || 0;
    
    return {
        requests: {
            total: metrics.requests.total,
            errorRate: metrics.errors.total > 0 ? (metrics.errors.total / metrics.requests.total) * 100 : 0,
            byMethod: metrics.requests.byMethod,
            byStatus: metrics.requests.byStatus,
            topEndpoints: Object.entries(metrics.requests.byEndpoint)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
        },
        performance: {
            avgResponseTime: Math.round(avgResponseTime),
            minResponseTime: responseTime.min === Infinity ? 0 : responseTime.min,
            maxResponseTime: responseTime.max,
            p95ResponseTime: Math.round(p95ResponseTime)
        },
        errors: {
            total: metrics.errors.total,
            byType: metrics.errors.byType,
            byEndpoint: metrics.errors.byEndpoint
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    };
}

// Metrics collection middleware
function metricsMiddleware(req, res, next) {
    req.startTime = Date.now();
    next();
}

// Reset metrics (useful for testing or periodic resets)
function resetMetrics() {
    metrics.requests = {
        total: 0,
        byMethod: {},
        byStatus: {},
        byEndpoint: {}
    };
    metrics.performance = {
        responseTime: {
            sum: 0,
            count: 0,
            min: Infinity,
            max: 0,
            p95: []
        }
    };
    metrics.errors = {
        total: 0,
        byType: {},
        byEndpoint: {}
    };
}

module.exports = {
    logger,
    requestLoggingMiddleware,
    metricsMiddleware,
    errorLoggingMiddleware,
    logBusinessEvent,
    logSecurityEvent,
    logPerformanceMetric,
    getMetricsSummary,
    resetMetrics,
    generateCorrelationId
};
