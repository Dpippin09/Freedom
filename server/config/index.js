// Configuration Management System
const path = require('path');
const fs = require('fs');

class ConfigManager {
    constructor() {
        this.config = {};
        this.environment = process.env.NODE_ENV || 'development';
        this.loadConfiguration();
        this.validateRequiredConfig();
    }

    loadConfiguration() {
        // Load environment-specific configuration
        this.loadEnvFile('.env'); // Base configuration
        
        if (this.environment !== 'development') {
            this.loadEnvFile(`.env.${this.environment}`); // Environment-specific overrides
        }
        
        this.loadEnvFile('.env.local'); // Local overrides (not in git)

        // Define configuration schema
        this.config = {
            // Server Configuration
            server: {
                port: this.getInt('PORT', 3000),
                host: this.getString('HOST', '0.0.0.0'),
                nodeEnv: this.environment,
                trustProxy: this.getBoolean('TRUST_PROXY', false)
            },

            // Security Configuration
            security: {
                jwtSecret: this.getString('JWT_SECRET', this.generateDefaultSecret()),
                jwtExpiresIn: this.getString('JWT_EXPIRES_IN', '7d'),
                jwtRefreshExpiresIn: this.getString('JWT_REFRESH_EXPIRES_IN', '30d'),
                sessionSecret: this.getString('SESSION_SECRET', this.generateDefaultSecret()),
                corsOrigin: this.getArray('CORS_ORIGIN', ['http://localhost:3000']),
                corsCredentials: this.getBoolean('CORS_CREDENTIALS', true),
                helmetEnabled: this.getBoolean('HELMET_ENABLED', true),
                forceHttps: this.getBoolean('FORCE_HTTPS', false),
                hstsMaxAge: this.getInt('HSTS_MAX_AGE', 31536000)
            },

            // Rate Limiting
            rateLimit: {
                windowMs: this.getInt('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
                maxRequests: this.getInt('RATE_LIMIT_MAX_REQUESTS', 100),
                authWindowMs: this.getInt('RATE_LIMIT_AUTH_WINDOW_MS', 900000),
                authMaxRequests: this.getInt('RATE_LIMIT_AUTH_MAX_REQUESTS', 5)
            },

            // Database Configuration
            database: {
                url: this.getString('DATABASE_URL'),
                host: this.getString('DB_HOST', 'localhost'),
                port: this.getInt('DB_PORT', 5432),
                name: this.getString('DB_NAME', 'snatched_it'),
                user: this.getString('DB_USER'),
                password: this.getString('DB_PASSWORD'),
                ssl: this.getBoolean('DB_SSL', false),
                pool: {
                    min: this.getInt('DB_POOL_MIN', 2),
                    max: this.getInt('DB_POOL_MAX', 10),
                    idleTimeoutMillis: this.getInt('DB_POOL_IDLE_TIMEOUT', 30000)
                }
            },

            // Logging Configuration
            logging: {
                level: this.getString('LOG_LEVEL', 'info'),
                format: this.getString('LOG_FORMAT', 'combined'),
                enableRequestLogging: this.getBoolean('ENABLE_REQUEST_LOGGING', true),
                logFilePath: this.getString('LOG_FILE_PATH', './logs/app.log'),
                errorLogPath: this.getString('ERROR_LOG_PATH', './logs/error.log')
            },

            // Email Configuration
            email: {
                provider: this.getString('EMAIL_PROVIDER', 'sendgrid'),
                sendgrid: {
                    apiKey: this.getString('SENDGRID_API_KEY'),
                    fromEmail: this.getString('FROM_EMAIL'),
                    fromName: this.getString('FROM_NAME', 'Snatched It')
                },
                smtp: {
                    host: this.getString('SMTP_HOST'),
                    port: this.getInt('SMTP_PORT', 587),
                    secure: this.getBoolean('SMTP_SECURE', false),
                    user: this.getString('SMTP_USER'),
                    password: this.getString('SMTP_PASSWORD')
                }
            },

            // External APIs
            apis: {
                google: {
                    shoppingApiKey: this.getString('GOOGLE_SHOPPING_API_KEY'),
                    analyticsId: this.getString('GOOGLE_ANALYTICS_ID')
                },
                amazon: {
                    accessKey: this.getString('AMAZON_API_ACCESS_KEY'),
                    secretKey: this.getString('AMAZON_API_SECRET_KEY')
                },
                sentry: {
                    dsn: this.getString('SENTRY_DSN'),
                    enabled: this.getBoolean('SENTRY_ENABLED', false),
                    environment: this.getString('SENTRY_ENVIRONMENT', this.environment),
                    release: this.getString('SENTRY_RELEASE', '1.0.0')
                }
            },

            // Scraping Configuration
            scraping: {
                enabled: this.getBoolean('ENABLE_SCHEDULED_SCRAPING', true),
                rateLimit: this.getInt('SCRAPING_RATE_LIMIT', 2),
                maxConcurrent: this.getInt('MAX_CONCURRENT_SCRAPING', 3),
                timeout: this.getInt('SCRAPING_TIMEOUT', 30000),
                retryAttempts: this.getInt('RETRY_ATTEMPTS', 3),
                retryDelay: this.getInt('RETRY_DELAY', 5000),
                userAgent: this.getString('SCRAPING_USER_AGENT', 'Mozilla/5.0 (compatible; SnatchedBot/1.0)'),
                proxy: {
                    enabled: this.getBoolean('PROXY_ENABLED', false),
                    url: this.getString('PROXY_URL'),
                    username: this.getString('PROXY_USERNAME'),
                    password: this.getString('PROXY_PASSWORD')
                }
            },

            // File Storage
            storage: {
                dataDirectory: this.getString('DATA_DIRECTORY', './data'),
                uploadDirectory: this.getString('UPLOAD_DIRECTORY', './uploads'),
                logDirectory: this.getString('LOG_DIRECTORY', './logs'),
                cloudStorage: {
                    enabled: this.getBoolean('CLOUD_STORAGE_ENABLED', false),
                    provider: this.getString('CLOUD_STORAGE_PROVIDER', 'aws'),
                    aws: {
                        accessKeyId: this.getString('AWS_ACCESS_KEY_ID'),
                        secretAccessKey: this.getString('AWS_SECRET_ACCESS_KEY'),
                        region: this.getString('AWS_REGION', 'us-east-1'),
                        s3Bucket: this.getString('AWS_S3_BUCKET')
                    }
                }
            },

            // Caching (Redis)
            cache: {
                enabled: this.getBoolean('REDIS_ENABLED', false),
                url: this.getString('REDIS_URL', 'redis://localhost:6379'),
                password: this.getString('REDIS_PASSWORD'),
                db: this.getInt('REDIS_DB', 0),
                ttl: this.getInt('REDIS_TTL', 3600)
            },

            // Performance
            performance: {
                compression: this.getBoolean('ENABLE_COMPRESSION', true),
                cacheStaticAssets: this.getBoolean('CACHE_STATIC_ASSETS', true),
                staticCacheMaxAge: this.getInt('STATIC_CACHE_MAX_AGE', 86400),
                apiCacheTtl: this.getInt('API_CACHE_TTL', 300)
            },

            // Feature Flags
            features: {
                analytics: this.getBoolean('ENABLE_ANALYTICS', true),
                priceAlerts: this.getBoolean('ENABLE_PRICE_ALERTS', true),
                userRegistration: this.getBoolean('ENABLE_USER_REGISTRATION', true),
                socialFeatures: this.getBoolean('ENABLE_SOCIAL_FEATURES', false),
                adminPanel: this.getBoolean('ENABLE_ADMIN_PANEL', false),
                maintenanceMode: this.getBoolean('MAINTENANCE_MODE', false)
            },

            // Health Check
            healthCheck: {
                endpoint: this.getString('HEALTH_CHECK_ENDPOINT', '/health'),
                secret: this.getString('HEALTH_CHECK_SECRET')
            },

            // Monitoring
            monitoring: {
                apmEnabled: this.getBoolean('APM_ENABLED', false),
                newRelicKey: this.getString('NEW_RELIC_LICENSE_KEY'),
                datadogKey: this.getString('DATADOG_API_KEY'),
                webhookErrorAlerts: this.getString('WEBHOOK_ERROR_ALERTS'),
                webhookStatusUpdates: this.getString('WEBHOOK_STATUS_UPDATES')
            },

            // Clustering
            cluster: {
                enabled: this.getBoolean('CLUSTER_ENABLED', false),
                workers: this.getString('CLUSTER_WORKERS', 'auto'),
                gracefulShutdownTimeout: this.getInt('GRACEFUL_SHUTDOWN_TIMEOUT', 10000)
            }
        };
    }

    loadEnvFile(filename) {
        const filePath = path.resolve(process.cwd(), filename);
        if (fs.existsSync(filePath)) {
            require('dotenv').config({ path: filePath });
            console.log(`✅ Loaded configuration from ${filename}`);
        }
    }

    getString(key, defaultValue = null) {
        return process.env[key] || defaultValue;
    }

    getInt(key, defaultValue = 0) {
        const value = process.env[key];
        return value ? parseInt(value, 10) : defaultValue;
    }

    getFloat(key, defaultValue = 0.0) {
        const value = process.env[key];
        return value ? parseFloat(value) : defaultValue;
    }

    getBoolean(key, defaultValue = false) {
        const value = process.env[key];
        if (!value) return defaultValue;
        return value.toLowerCase() === 'true' || value === '1';
    }

    getArray(key, defaultValue = []) {
        const value = process.env[key];
        if (!value) return defaultValue;
        return value.split(',').map(item => item.trim());
    }

    generateDefaultSecret() {
        if (this.environment === 'production') {
            throw new Error('Default secrets not allowed in production. Please set secure secrets in environment variables.');
        }
        return require('crypto').randomBytes(64).toString('hex');
    }

    validateRequiredConfig() {
        const required = [];

        // Production-specific required fields
        if (this.environment === 'production') {
            if (!this.getString('JWT_SECRET') || this.getString('JWT_SECRET').includes('REPLACE_WITH')) {
                required.push('JWT_SECRET');
            }
            if (!this.getString('SESSION_SECRET') || this.getString('SESSION_SECRET').includes('REPLACE_WITH')) {
                required.push('SESSION_SECRET');
            }
        }

        if (required.length > 0) {
            const message = `Missing required configuration: ${required.join(', ')}`;
            console.error('❌ Configuration Error:', message);
            if (this.environment === 'production') {
                throw new Error(message);
            } else {
                console.warn('⚠️ Using default values for development');
            }
        }
    }

    // Getters for easy access
    get(path) {
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    // Feature flag checker
    isFeatureEnabled(feature) {
        return this.get(`features.${feature}`) === true;
    }

    // Environment checkers
    isDevelopment() {
        return this.environment === 'development';
    }

    isProduction() {
        return this.environment === 'production';
    }

    isTest() {
        return this.environment === 'test';
    }

    // Configuration summary for logging
    getSummary() {
        return {
            environment: this.environment,
            port: this.config.server.port,
            database: this.config.database.host ? 'configured' : 'file-based',
            caching: this.config.cache.enabled ? 'enabled' : 'disabled',
            features: Object.keys(this.config.features).filter(key => this.config.features[key]),
            security: {
                cors: this.config.security.corsOrigin.length > 0,
                helmet: this.config.security.helmetEnabled,
                https: this.config.security.forceHttps
            }
        };
    }
}

// Export singleton instance
module.exports = new ConfigManager();
