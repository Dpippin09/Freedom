// Security Hardening Module
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const config = require('../config');

class SecurityManager {
    constructor() {
        this.config = config;
    }

    // Configure Helmet for security headers
    configureHelmet() {
        if (!this.config.get('security.helmetEnabled')) {
            return (req, res, next) => next();
        }

        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: [
                        "'self'", 
                        "'unsafe-inline'", 
                        "https://fonts.googleapis.com",
                        "https://cdn.jsdelivr.net"
                    ],
                    scriptSrc: [
                        "'self'", 
                        "'unsafe-inline'",
                        "https://cdn.jsdelivr.net",
                        "https://www.google-analytics.com"
                    ],
                    fontSrc: [
                        "'self'", 
                        "https://fonts.gstatic.com",
                        "data:"
                    ],
                    imgSrc: [
                        "'self'", 
                        "data:", 
                        "https:",
                        "http:" // Allow external product images
                    ],
                    connectSrc: [
                        "'self'",
                        "https://www.google-analytics.com"
                    ],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"],
                    upgradeInsecureRequests: this.config.get('security.forceHttps') ? [] : null
                },
                reportOnly: !this.config.isProduction()
            },
            
            hsts: {
                maxAge: this.config.get('security.hstsMaxAge'),
                includeSubDomains: true,
                preload: true
            },
            
            frameguard: { action: 'deny' },
            
            noSniff: true,
            
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
            
            permittedCrossDomainPolicies: false,
            
            crossOriginEmbedderPolicy: false, // Disable for external product images
            
            crossOriginOpenerPolicy: { policy: 'same-origin' },
            
            crossOriginResourcePolicy: { policy: 'cross-origin' }
        });
    }

    // Enhanced rate limiting with different tiers
    configureRateLimit() {
        const rateLimiters = {};

        // General API rate limiting
        rateLimiters.general = rateLimit({
            windowMs: this.config.get('rateLimit.windowMs'),
            max: this.config.get('rateLimit.maxRequests'),
            message: {
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil(this.config.get('rateLimit.windowMs') / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                res.status(429).json({
                    success: false,
                    error: 'Rate limit exceeded',
                    message: 'Too many requests. Please slow down.',
                    retryAfter: Math.ceil(this.config.get('rateLimit.windowMs') / 1000)
                });
            }
        });

        // Strict rate limiting for authentication endpoints
        rateLimiters.auth = rateLimit({
            windowMs: this.config.get('rateLimit.authWindowMs'),
            max: this.config.get('rateLimit.authMaxRequests'),
            message: {
                error: 'Too many authentication attempts',
                message: 'Too many login attempts. Please try again later.',
                retryAfter: Math.ceil(this.config.get('rateLimit.authWindowMs') / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            skipSuccessfulRequests: true,
            handler: (req, res) => {
                res.status(429).json({
                    success: false,
                    error: 'Authentication rate limit exceeded',
                    message: 'Too many authentication attempts. Please wait before trying again.',
                    retryAfter: Math.ceil(this.config.get('rateLimit.authWindowMs') / 1000)
                });
            }
        });

        // Scraping endpoints rate limiting
        rateLimiters.scraping = rateLimit({
            windowMs: 60000, // 1 minute
            max: 10, // 10 requests per minute
            message: {
                error: 'Scraping rate limit exceeded',
                message: 'Too many scraping requests. Please wait.',
                retryAfter: 60
            },
            standardHeaders: true,
            legacyHeaders: false
        });

        // Progressive delay for repeated requests
        rateLimiters.slowDown = slowDown({
            windowMs: 15 * 60 * 1000, // 15 minutes
            delayAfter: 50, // allow 50 requests per windowMs without delay
            delayMs: () => 500, // add 500ms delay per request after delayAfter
            maxDelayMs: 10000, // maximum delay of 10 seconds
            validate: { delayMs: false } // Disable deprecation warning
        });

        return rateLimiters;
    }

    // CORS configuration
    configureCors() {
        const corsOptions = {
            origin: (origin, callback) => {
                const allowedOrigins = this.config.get('security.corsOrigin');
                
                // Allow requests with no origin (mobile apps, Postman, etc.)
                if (!origin) return callback(null, true);
                
                // In development, allow localhost variations
                if (this.config.isDevelopment()) {
                    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                        return callback(null, true);
                    }
                }
                
                // Check against allowed origins
                if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
                    return callback(null, true);
                }
                
                return callback(new Error('Not allowed by CORS policy'), false);
            },
            credentials: this.config.get('security.corsCredentials'),
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: [
                'Content-Type', 
                'Authorization', 
                'X-Requested-With',
                'X-API-Key',
                'Accept',
                'Origin'
            ],
            exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
            maxAge: 86400 // 24 hours
        };

        return corsOptions;
    }

    // Input validation and sanitization
    configureInputValidation() {
        return {
            // Email validation (basic)
            isValidEmail: (email) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(email) && email.length <= 254;
            },

            // Password validation
            isValidPassword: (password) => {
                return password && 
                       password.length >= 6 && 
                       password.length <= 128 &&
                       !password.includes(' '); // No spaces
            },

            // Name validation
            isValidName: (name) => {
                const nameRegex = /^[a-zA-Z\s'-]+$/;
                return name && 
                       name.length >= 1 && 
                       name.length <= 50 && 
                       nameRegex.test(name);
            },

            // URL validation (basic)
            isValidUrl: (url) => {
                try {
                    const parsedUrl = new URL(url);
                    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
                } catch {
                    return false;
                }
            },

            // Sanitize HTML input (basic)
            sanitizeHtml: (input) => {
                if (!input) return '';
                return input
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;')
                    .replace(/\//g, '&#x2F;');
            },

            // Sanitize search query
            sanitizeSearchQuery: (query) => {
                if (!query) return '';
                
                // Remove potentially dangerous characters
                return query
                    .replace(/[<>'"]/g, '')
                    .trim()
                    .substring(0, 100); // Limit length
            },

            // Product ID validation
            isValidProductId: (id) => {
                const productIdRegex = /^[a-zA-Z0-9\-_]+$/;
                return id && 
                       productIdRegex.test(id) && 
                       id.length >= 1 && 
                       id.length <= 50;
            }
        };
    }

    // Security middleware for different route types
    getSecurityMiddleware() {
        const rateLimiters = this.configureRateLimit();
        const validator = this.configureInputValidation();

        return {
            // Basic security for all routes
            basic: [
                this.configureHelmet(),
                rateLimiters.general,
                rateLimiters.slowDown
            ],

            // Enhanced security for auth routes
            auth: [
                this.configureHelmet(),
                rateLimiters.auth,
                // Additional auth-specific middleware can be added here
            ],

            // Security for scraping endpoints
            scraping: [
                this.configureHelmet(),
                rateLimiters.scraping
            ],

            // API key validation middleware
            apiKey: (req, res, next) => {
                const apiKey = req.header('X-API-Key');
                const validApiKey = this.config.getString('API_KEY');

                if (validApiKey && (!apiKey || apiKey !== validApiKey)) {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid API key',
                        message: 'Valid API key required'
                    });
                }

                next();
            },

            // Request validation middleware
            validateRequest: (validationRules) => {
                return (req, res, next) => {
                    const errors = [];

                    for (const [field, rules] of Object.entries(validationRules)) {
                        const value = req.body[field];

                        for (const rule of rules) {
                            if (!rule.validator(value)) {
                                errors.push({
                                    field,
                                    message: rule.message
                                });
                                break;
                            }
                        }
                    }

                    if (errors.length > 0) {
                        return res.status(400).json({
                            success: false,
                            error: 'Validation failed',
                            details: errors
                        });
                    }

                    next();
                };
            },

            // Content Security Policy reporting
            cspReport: (req, res, next) => {
                if (req.body && req.body['csp-report']) {
                    console.warn('CSP Violation:', JSON.stringify(req.body['csp-report'], null, 2));
                }
                res.status(204).end();
            }
        };
    }

    // Security health check
    getSecurityStatus() {
        return {
            helmet: this.config.get('security.helmetEnabled'),
            cors: this.config.get('security.corsOrigin').length > 0,
            rateLimit: true,
            https: this.config.get('security.forceHttps'),
            environment: this.config.environment,
            jwtConfigured: !!this.config.get('security.jwtSecret'),
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = SecurityManager;
