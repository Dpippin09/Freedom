#!/usr/bin/env node

// Configuration Validation Script
// Validates that all required configuration is properly set for deployment

const fs = require('fs');
const path = require('path');
const config = require('./server/config');

console.log('🔍 ==============================');
console.log('   Configuration Validation');
console.log('🔍 ==============================\n');

let hasErrors = false;
let warnings = [];

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, icon, message) {
    console.log(`${colors[color]}${icon} ${message}${colors.reset}`);
}

function error(message) {
    log('red', '❌', message);
    hasErrors = true;
}

function warning(message) {
    log('yellow', '⚠️ ', message);
    warnings.push(message);
}

function success(message) {
    log('green', '✅', message);
}

function info(message) {
    log('blue', 'ℹ️ ', message);
}

// Check environment
const env = config.environment;
info(`Environment: ${env}`);

// Production-specific checks
if (env === 'production') {
    console.log('\n🏭 Production Environment Checks:');
    
    // JWT Secret validation
    const jwtSecret = config.get('security.jwtSecret');
    if (!jwtSecret || jwtSecret.includes('REPLACE_WITH') || jwtSecret.length < 32) {
        error('JWT_SECRET must be set to a secure random string (32+ characters)');
    } else {
        success('JWT_SECRET is properly configured');
    }
    
    // Session Secret validation
    const sessionSecret = config.get('security.sessionSecret');
    if (!sessionSecret || sessionSecret.includes('REPLACE_WITH') || sessionSecret.length < 32) {
        error('SESSION_SECRET must be set to a secure random string (32+ characters)');
    } else {
        success('SESSION_SECRET is properly configured');
    }
    
    // HTTPS enforcement
    if (!config.get('security.forceHttps')) {
        warning('FORCE_HTTPS is disabled - consider enabling for production');
    } else {
        success('HTTPS enforcement enabled');
    }
    
    // CORS origins
    const corsOrigins = config.get('security.corsOrigin');
    if (corsOrigins.includes('localhost') || corsOrigins.includes('*')) {
        warning('CORS origins include localhost or wildcard - verify this is intentional for production');
    } else {
        success('CORS origins configured for production');
    }
    
} else {
    console.log('\n🧪 Development Environment Checks:');
    success('Development configuration loaded');
}

// General configuration checks
console.log('\n⚙️  General Configuration:');

// Port configuration
const port = config.get('server.port');
if (port < 1024 && process.getuid && process.getuid() !== 0) {
    warning(`Port ${port} requires root privileges on Unix systems`);
} else {
    success(`Server port: ${port}`);
}

// Security features
const securityFeatures = [
    { key: 'security.helmetEnabled', name: 'Helmet security headers' },
    { key: 'security.corsCredentials', name: 'CORS credentials' }
];

securityFeatures.forEach(feature => {
    if (config.get(feature.key)) {
        success(`${feature.name} enabled`);
    } else {
        warning(`${feature.name} disabled`);
    }
});

// Rate limiting
const rateLimit = config.get('rateLimit.maxRequests');
info(`Rate limit: ${rateLimit} requests per window`);

// Feature flags
console.log('\n🚩 Feature Flags:');
const features = config.get('features');
Object.keys(features).forEach(feature => {
    const enabled = features[feature];
    if (enabled) {
        success(`${feature}: enabled`);
    } else {
        info(`${feature}: disabled`);
    }
});

// File system checks
console.log('\n📁 File System:');

const requiredDirs = ['data', 'logs', 'uploads'];
requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        success(`Directory exists: ${dir}/`);
    } else {
        warning(`Directory missing: ${dir}/ (will be created automatically)`);
    }
});

const requiredFiles = [
    'data/users.json',
    'data/products.json', 
    'data/analytics.json',
    'data/notifications.json'
];

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        success(`Data file exists: ${file}`);
    } else {
        info(`Data file missing: ${file} (will be created automatically)`);
    }
});

// Environment file checks
console.log('\n📄 Environment Files:');

if (fs.existsSync('.env')) {
    success('.env file found');
} else {
    error('.env file missing');
}

if (env === 'production') {
    if (fs.existsSync('.env.production')) {
        success('.env.production file found');
    } else {
        error('.env.production file missing - copy from .env.production.template');
    }
}

// Dependency checks
console.log('\n📦 Dependencies:');

try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
        'express',
        'helmet', 
        'express-rate-limit',
        'compression',
        'cors'
    ];
    
    requiredDeps.forEach(dep => {
        if (packageJson.dependencies[dep]) {
            success(`${dep}: ${packageJson.dependencies[dep]}`);
        } else {
            error(`Missing required dependency: ${dep}`);
        }
    });
} catch (err) {
    error('Could not read package.json');
}

// Configuration summary
console.log('\n📊 Configuration Summary:');
try {
    const summary = config.getSummary();
    info(`Environment: ${summary.environment}`);
    info(`Port: ${summary.port}`);
    info(`Database: ${summary.database}`);
    info(`Caching: ${summary.caching}`);
    info(`Features: ${summary.features.join(', ')}`);
    
    const security = summary.security;
    info(`Security - CORS: ${security.cors}, Helmet: ${security.helmet}, HTTPS: ${security.https}`);
} catch (err) {
    error(`Configuration summary failed: ${err.message}`);
}

// Final results
console.log('\n🎯 ==============================');
console.log('     Validation Results');
console.log('🎯 ==============================');

if (hasErrors) {
    error(`Found ${hasErrors} configuration error(s)`);
    log('red', '🚫', 'Configuration validation FAILED');
    process.exit(1);
} else {
    if (warnings.length > 0) {
        warning(`Found ${warnings.length} warning(s) - review recommended`);
    }
    success('Configuration validation PASSED');
    log('green', '🎉', 'Ready for deployment!');
    process.exit(0);
}
