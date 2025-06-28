const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');

// Import configuration and middleware
const config = require('./config');
const SecurityManager = require('./middleware/security');
const HealthCheckManager = require('./middleware/health');
const database = require('./database');

const app = express();
const security = new SecurityManager();
const healthCheck = new HealthCheckManager();

// Global database reference for app
app.locals.database = database;

// Trust proxy if behind load balancer/reverse proxy
if (config.get('server.trustProxy')) {
    app.set('trust proxy', 1);
}

// Security middleware (should be first)
app.use(security.configureHelmet());

// Compression middleware
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// CORS configuration using config system
app.use(cors({
    origin: config.get('security.corsOrigin'),
    credentials: config.get('security.corsCredentials'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset']
}));

// Rate limiting middleware
app.use('/api/', security.configureRateLimit().general);

// Body parsing middleware
app.use(express.json({ 
    limit: config.get('server.maxRequestSize'),
    strict: true
}));
app.use(express.urlencoded({ 
    extended: false,
    limit: config.get('server.maxRequestSize')
}));
app.use(cookieParser(config.get('security.sessionSecret')));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// Static files with appropriate headers
app.use(express.static(path.join(__dirname, '../'), {
    maxAge: config.get('server.staticMaxAge'),
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        } else if (path.endsWith('.js') || path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
    }
}));

// Import routes
const productRoutes = require('./routes/products');
const scrapingRoutes = require('./routes/scraping');
const authRoutes = require('./routes/auth');
const alertRoutes = require('./routes/alerts');
const notificationRoutes = require('./routes/notifications');
const monitoringRoutes = require('./routes/monitoring');
const analyticsRoutes = require('./routes/analytics');

// Health check endpoints (before other routes)
app.get('/health', async (req, res) => {
    try {
        const health = await healthCheck.runQuickCheck();
        res.status(health.status === 'healthy' ? 200 : 503).json(health);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

app.get('/health/full', async (req, res) => {
    try {
        const health = await healthCheck.runAllChecks();
        res.status(health.status === 'healthy' ? 200 : 503).json(health);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

app.get('/health/ready', async (req, res) => {
    try {
        const readiness = await healthCheck.runReadinessCheck();
        res.status(readiness.ready ? 200 : 503).json(readiness);
    } catch (error) {
        res.status(503).json({
            ready: false,
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

app.get('/health/live', async (req, res) => {
    try {
        const liveness = await healthCheck.runLivenessCheck();
        res.status(liveness.alive ? 200 : 503).json(liveness);
    } catch (error) {
        res.status(503).json({
            alive: false,
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// API routes with specific rate limiting
app.use('/api/auth', security.configureRateLimit().auth, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/scraping', security.configureRateLimit().scraping, scrapingRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/analytics', analyticsRoutes);

// Serve static files (your existing HTML/CSS/JS)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Basic API info endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Snatched It API',
        version: config.get('app.version'),
        environment: config.environment,
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            fullHealth: '/health/full',
            readiness: '/health/ready',
            liveness: '/health/live',
            products: '/api/products',
            auth: '/api/auth',
            alerts: '/api/alerts',
            scraping: '/api/scraping',
            notifications: '/api/notifications',
            monitoring: '/api/monitoring',
            analytics: '/api/analytics'
        }
    });
});

// Legacy health endpoint for backward compatibility
app.get('/api/health', async (req, res) => {
    try {
        const health = await healthCheck.runQuickCheck();
        res.status(health.status === 'healthy' ? 200 : 503).json({
            status: 'OK',
            message: 'Snatched It API is running!',
            timestamp: new Date().toISOString(),
            health
        });
    } catch (error) {
        res.status(503).json({ 
            status: 'ERROR',
            message: 'Health check failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Security headers for all responses
app.use((req, res, next) => {
    res.setHeader('X-API-Version', config.get('app.version'));
    res.setHeader('X-Environment', config.environment);
    next();
});

// Graceful error handling middleware
app.use((err, req, res, next) => {
    const errorId = Date.now().toString();
    
    // Log error with context
    console.error(`[${errorId}] Error:`, {
        message: err.message,
        stack: config.isDevelopment() ? err.stack : undefined,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });

    // Don't leak error details in production
    const errorResponse = {
        error: 'Internal Server Error',
        errorId,
        timestamp: new Date().toISOString()
    };

    if (config.isDevelopment()) {
        errorResponse.message = err.message;
        errorResponse.stack = err.stack;
    }

    res.status(err.status || 500).json(errorResponse);
});

// Enhanced 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        availableEndpoints: '/api'
    });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

const PORT = config.get('server.port');
const HOST = config.get('server.host');

app.listen(PORT, HOST, () => {
    console.log('🚀 ===================================');
    console.log(`   Snatched It API Server Started`);
    console.log('🚀 ===================================');
    console.log(`📍 Server: http://${HOST}:${PORT}`);
    console.log(`� Environment: ${config.environment}`);
    console.log(`📁 Static files: ${path.join(__dirname, '../')}`);
    console.log(`🔗 API endpoints: http://${HOST}:${PORT}/api`);
    console.log(`💚 Health check: http://${HOST}:${PORT}/health`);
    console.log(`🔒 Security: ${config.get('security.helmetEnabled') ? 'Enabled' : 'Disabled'}`);
    console.log(`⚡ Rate limiting: ${config.get('rateLimit.maxRequests')} req/window`);
    console.log('🚀 ===================================');
});

module.exports = app;
