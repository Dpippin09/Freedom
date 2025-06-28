// Health Check System
const config = require('../config');
const fs = require('fs').promises;
const path = require('path');

class HealthCheckManager {
    constructor() {
        this.config = config;
        this.checks = new Map();
        this.registerDefaultChecks();
    }

    registerDefaultChecks() {
        // System health checks
        this.registerCheck('system', this.checkSystem.bind(this));
        this.registerCheck('memory', this.checkMemory.bind(this));
        this.registerCheck('disk', this.checkDisk.bind(this));
        
        // Application health checks
        this.registerCheck('configuration', this.checkConfiguration.bind(this));
        this.registerCheck('dependencies', this.checkDependencies.bind(this));
        this.registerCheck('database', this.checkDatabase.bind(this));
        
        // Service health checks
        this.registerCheck('fileSystem', this.checkFileSystem.bind(this));
        this.registerCheck('externalApis', this.checkExternalApis.bind(this));
        this.registerCheck('security', this.checkSecurity.bind(this));
    }

    registerCheck(name, checkFunction) {
        this.checks.set(name, checkFunction);
    }

    async runAllChecks() {
        const results = {};
        const startTime = Date.now();

        for (const [name, checkFunction] of this.checks) {
            try {
                const checkStart = Date.now();
                const result = await Promise.race([
                    checkFunction(),
                    this.timeout(5000) // 5 second timeout for each check
                ]);
                
                results[name] = {
                    status: 'healthy',
                    responseTime: Date.now() - checkStart,
                    ...result
                };
            } catch (error) {
                results[name] = {
                    status: 'unhealthy',
                    error: error.message,
                    responseTime: Date.now() - checkStart
                };
            }
        }

        const overallStatus = this.determineOverallStatus(results);
        const totalResponseTime = Date.now() - startTime;

        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            environment: this.config.environment,
            version: this.getApplicationVersion(),
            uptime: process.uptime(),
            responseTime: totalResponseTime,
            checks: results
        };
    }

    async runQuickCheck() {
        // Minimal health check for load balancers
        const startTime = Date.now();
        
        try {
            // Just check if the app is responding
            const memoryUsage = process.memoryUsage();
            const responseTime = Date.now() - startTime;

            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                responseTime,
                memory: {
                    used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    total: Math.round(memoryUsage.heapTotal / 1024 / 1024)
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
                responseTime: Date.now() - startTime
            };
        }
    }

    // Individual health checks

    async checkSystem() {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        return {
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
            memory: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024)
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            uptime: process.uptime(),
            pid: process.pid
        };
    }

    async checkMemory() {
        const memoryUsage = process.memoryUsage();
        const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        
        const status = heapUsedPercent > 90 ? 'critical' : 
                      heapUsedPercent > 75 ? 'warning' : 'healthy';

        return {
            status,
            heapUsedPercent: Math.round(heapUsedPercent),
            heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024)
        };
    }

    async checkDisk() {
        try {
            const stats = await fs.stat(process.cwd());
            const dataDir = this.config.get('storage.dataDirectory');
            
            // Check if data directory is writable
            await fs.access(dataDir, fs.constants.W_OK);
            
            return {
                status: 'healthy',
                dataDirectoryWritable: true,
                lastModified: stats.mtime
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: 'Data directory not accessible',
                details: error.message
            };
        }
    }

    async checkConfiguration() {
        const issues = [];
        
        // Check critical configuration
        if (!this.config.get('security.jwtSecret')) {
            issues.push('JWT secret not configured');
        }
        
        if (this.config.isProduction() && this.config.get('security.corsOrigin').includes('*')) {
            issues.push('CORS configured to allow all origins in production');
        }
        
        if (this.config.isProduction() && !this.config.get('security.forceHttps')) {
            issues.push('HTTPS not enforced in production');
        }

        return {
            status: issues.length === 0 ? 'healthy' : 'warning',
            issues,
            environment: this.config.environment,
            featuresEnabled: Object.keys(this.config.get('features')).filter(
                key => this.config.get(`features.${key}`)
            )
        };
    }

    async checkDependencies() {
        const dependencies = [];
        const packageJson = require('../../package.json');
        
        // Check critical dependencies
        const criticalDeps = ['express', 'bcryptjs', 'jsonwebtoken', 'axios'];
        
        for (const dep of criticalDeps) {
            try {
                const version = require(`${dep}/package.json`).version;
                dependencies.push({
                    name: dep,
                    version,
                    status: 'available'
                });
            } catch (error) {
                dependencies.push({
                    name: dep,
                    status: 'missing',
                    error: error.message
                });
            }
        }

        const missingDeps = dependencies.filter(dep => dep.status === 'missing');
        
        return {
            status: missingDeps.length === 0 ? 'healthy' : 'unhealthy',
            dependencies,
            nodeVersion: process.version,
            npmVersion: packageJson.engines?.npm || 'unknown'
        };
    }

    async checkDatabase() {
        // Since we're using file-based storage, check file accessibility
        try {
            const dataDir = this.config.get('storage.dataDirectory');
            
            // Check critical data files
            const files = [
                'users.json',
                'products.json', 
                'notifications.json',
                'analytics.json'
            ];
            
            const fileStatus = {};
            
            for (const file of files) {
                const filePath = path.join(dataDir, file);
                try {
                    await fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
                    const stats = await fs.stat(filePath);
                    fileStatus[file] = {
                        status: 'accessible',
                        size: stats.size,
                        lastModified: stats.mtime
                    };
                } catch (error) {
                    fileStatus[file] = {
                        status: 'inaccessible',
                        error: error.message
                    };
                }
            }
            
            const inaccessibleFiles = Object.values(fileStatus)
                .filter(status => status.status === 'inaccessible').length;
            
            return {
                status: inaccessibleFiles === 0 ? 'healthy' : 'degraded',
                type: 'file-based',
                files: fileStatus,
                dataDirectory: dataDir
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                type: 'file-based',
                error: error.message
            };
        }
    }

    async checkFileSystem() {
        try {
            const dirs = [
                this.config.get('storage.dataDirectory'),
                this.config.get('storage.logDirectory'),
                this.config.get('storage.uploadDirectory')
            ];
            
            const dirStatus = {};
            
            for (const dir of dirs) {
                try {
                    await fs.mkdir(dir, { recursive: true });
                    await fs.access(dir, fs.constants.W_OK);
                    dirStatus[dir] = 'writable';
                } catch (error) {
                    dirStatus[dir] = 'error: ' + error.message;
                }
            }
            
            const errors = Object.values(dirStatus).filter(status => status.startsWith('error'));
            
            return {
                status: errors.length === 0 ? 'healthy' : 'unhealthy',
                directories: dirStatus
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async checkExternalApis() {
        // This would check external services if configured
        const apiStatuses = {};
        
        // Example: Check if Google Shopping API is configured
        if (this.config.get('apis.google.shoppingApiKey')) {
            apiStatuses.googleShopping = 'configured';
        }
        
        // Example: Check if SendGrid is configured
        if (this.config.get('email.sendgrid.apiKey')) {
            apiStatuses.sendgrid = 'configured';
        }
        
        return {
            status: 'healthy',
            apis: apiStatuses,
            note: 'External API connectivity not tested in health check'
        };
    }

    async checkSecurity() {
        const SecurityManager = require('./security');
        const security = new SecurityManager();
        
        const securityStatus = security.getSecurityStatus();
        
        const issues = [];
        
        if (!securityStatus.helmet) issues.push('Helmet not enabled');
        if (!securityStatus.cors) issues.push('CORS not configured');
        if (!securityStatus.jwtConfigured) issues.push('JWT not configured');
        if (this.config.isProduction() && !securityStatus.https) {
            issues.push('HTTPS not enforced in production');
        }
        
        return {
            status: issues.length === 0 ? 'healthy' : 'warning',
            issues,
            ...securityStatus
        };
    }

    // Utility methods

    timeout(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Health check timeout')), ms);
        });
    }

    determineOverallStatus(results) {
        const statuses = Object.values(results).map(result => result.status);
        
        if (statuses.includes('unhealthy')) return 'unhealthy';
        if (statuses.includes('critical')) return 'critical';
        if (statuses.includes('warning') || statuses.includes('degraded')) return 'degraded';
        return 'healthy';
    }

    getApplicationVersion() {
        try {
            const packageJson = require('../../package.json');
            return packageJson.version || '1.0.0';
        } catch {
            return 'unknown';
        }
    }

    // Express middleware for health endpoints
    getHealthMiddleware() {
        return {
            // Full health check
            full: async (req, res) => {
                try {
                    const health = await this.runAllChecks();
                    const statusCode = health.status === 'healthy' ? 200 : 
                                      health.status === 'degraded' ? 200 : 503;
                    
                    res.status(statusCode).json(health);
                } catch (error) {
                    res.status(500).json({
                        status: 'error',
                        timestamp: new Date().toISOString(),
                        error: error.message
                    });
                }
            },

            // Quick health check for load balancers
            quick: async (req, res) => {
                try {
                    const health = await this.runQuickCheck();
                    const statusCode = health.status === 'healthy' ? 200 : 503;
                    
                    res.status(statusCode).json(health);
                } catch (error) {
                    res.status(500).json({
                        status: 'error',
                        timestamp: new Date().toISOString(),
                        error: error.message
                    });
                }
            },

            // Readiness check (can the app serve traffic?)
            ready: async (req, res) => {
                try {
                    // Check if app is ready to serve traffic
                    const critical = await Promise.all([
                        this.checkConfiguration(),
                        this.checkFileSystem(),
                        this.checkDependencies()
                    ]);
                    
                    const isReady = critical.every(check => 
                        check.status === 'healthy' || check.status === 'warning'
                    );
                    
                    res.status(isReady ? 200 : 503).json({
                        status: isReady ? 'ready' : 'not-ready',
                        timestamp: new Date().toISOString(),
                        checks: {
                            configuration: critical[0].status,
                            fileSystem: critical[1].status,
                            dependencies: critical[2].status
                        }
                    });
                } catch (error) {
                    res.status(503).json({
                        status: 'not-ready',
                        timestamp: new Date().toISOString(),
                        error: error.message
                    });
                }
            },

            // Liveness check (is the app running?)
            live: async (req, res) => {
                res.status(200).json({
                    status: 'alive',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    pid: process.pid
                });
            }
        };
    }

    async runReadinessCheck() {
        // Readiness check - can the app serve traffic?
        try {
            const critical = await Promise.all([
                this.checkConfiguration(),
                this.checkFileSystem(),
                this.checkDependencies()
            ]);
            
            const isReady = critical.every(check => 
                check.status === 'healthy' || check.status === 'warning'
            );
            
            return {
                ready: isReady,
                timestamp: new Date().toISOString(),
                checks: {
                    configuration: critical[0].status,
                    fileSystem: critical[1].status,
                    dependencies: critical[2].status
                }
            };
        } catch (error) {
            return {
                ready: false,
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    async runLivenessCheck() {
        // Liveness check - is the app running?
        return {
            alive: true,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            pid: process.pid,
            memory: {
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            }
        };
    }
}

module.exports = HealthCheckManager;
