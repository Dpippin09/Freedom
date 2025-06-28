const UserModel = require('../models/userModel');

const userModel = new UserModel();

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = userModel.verifyToken(token);
        
        // Get full user data
        const user = await userModel.findUserById(decoded.id);
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive'
            });
        }

        // Add user to request object (without password)
        const { password, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token',
            error: error.message
        });
    }
};

// Middleware to check if user is authenticated (optional authentication)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = userModel.verifyToken(token);
            const user = await userModel.findUserById(decoded.id);
            
            if (user && user.isActive) {
                const { password, ...userWithoutPassword } = user;
                req.user = userWithoutPassword;
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication if token is invalid
        next();
    }
};

// Middleware to validate user input
const validateRegistration = (req, res, next) => {
    const { email, password, firstName, lastName } = req.body;

    const errors = [];

    // Email validation
    if (!email || !email.trim()) {
        errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Please provide a valid email address');
    }

    // Password validation
    if (!password || password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }

    // Name validation
    if (!firstName || !firstName.trim()) {
        errors.push('First name is required');
    }

    if (!lastName || !lastName.trim()) {
        errors.push('Last name is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }

    next();
};

// Middleware to validate login input
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;

    const errors = [];

    if (!email || !email.trim()) {
        errors.push('Email is required');
    }

    if (!password || !password.trim()) {
        errors.push('Password is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }

    next();
};

// Rate limiting middleware for auth endpoints
const authRateLimit = () => {
    const attempts = new Map();
    const MAX_ATTEMPTS = 5;
    const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        if (!attempts.has(key)) {
            attempts.set(key, { count: 1, resetTime: now + WINDOW_MS });
            return next();
        }

        const attempt = attempts.get(key);
        
        if (now > attempt.resetTime) {
            // Reset window
            attempts.set(key, { count: 1, resetTime: now + WINDOW_MS });
            return next();
        }

        if (attempt.count >= MAX_ATTEMPTS) {
            return res.status(429).json({
                success: false,
                message: 'Too many authentication attempts. Please try again later.',
                retryAfter: Math.ceil((attempt.resetTime - now) / 1000)
            });
        }

        attempt.count++;
        next();
    };
};

module.exports = {
    authenticateToken,
    optionalAuth,
    validateRegistration,
    validateLogin,
    authRateLimit
};
