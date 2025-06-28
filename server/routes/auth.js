const express = require('express');
const router = express.Router();
const UserModel = require('../models/userModel');
const { 
    authenticateToken, 
    validateRegistration, 
    validateLogin, 
    authRateLimit 
} = require('../middleware/auth');

const userModel = new UserModel();

// Apply rate limiting to auth routes
const rateLimiter = authRateLimit();

// POST /api/auth/register - Register new user
router.post('/register', rateLimiter, validateRegistration, async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        const newUser = await userModel.createUser({
            email: email.trim(),
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim()
        });

        // Generate token
        const token = userModel.generateToken(newUser);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: newUser,
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.message === 'User with this email already exists') {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to register user',
            error: error.message
        });
    }
});

// POST /api/auth/login - User login
router.post('/login', rateLimiter, validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userModel.authenticateUser(email.trim(), password);
        const token = userModel.generateToken(user);

        res.json({
            success: true,
            message: 'Login successful',
            user,
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
});

// POST /api/auth/logout - User logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
    // In a JWT system, logout is primarily handled client-side
    // by removing the token from storage
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

// GET /api/auth/profile - Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user profile',
            error: error.message
        });
    }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { firstName, lastName, preferences } = req.body;
        const userId = req.user.id;

        const updateData = {};
        
        if (firstName && firstName.trim()) {
            updateData.firstName = firstName.trim();
        }
        
        if (lastName && lastName.trim()) {
            updateData.lastName = lastName.trim();
        }
        
        if (preferences && typeof preferences === 'object') {
            updateData.preferences = {
                ...req.user.preferences,
                ...preferences
            };
        }

        const updatedUser = await userModel.updateUser(userId, updateData);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
});

// POST /api/auth/change-password - Change user password
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        // Verify current password
        const user = await userModel.findUserById(userId);
        const bcrypt = require('bcryptjs');
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await userModel.updateUser(userId, { password: hashedPassword });

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
            error: error.message
        });
    }
});

// POST /api/auth/wishlist/add - Add product to wishlist
router.post('/wishlist/add', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user.id;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        const wishlist = await userModel.addToWishlist(userId, productId);

        res.json({
            success: true,
            message: 'Product added to wishlist',
            wishlist
        });

    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add product to wishlist',
            error: error.message
        });
    }
});

// DELETE /api/auth/wishlist/remove - Remove product from wishlist
router.delete('/wishlist/remove', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user.id;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        const wishlist = await userModel.removeFromWishlist(userId, productId);

        res.json({
            success: true,
            message: 'Product removed from wishlist',
            wishlist
        });

    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove product from wishlist',
            error: error.message
        });
    }
});

// GET /api/auth/wishlist - Get user's wishlist
router.get('/wishlist', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const wishlist = await userModel.getUserWishlist(userId);

        res.json({
            success: true,
            wishlist
        });

    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get wishlist',
            error: error.message
        });
    }
});

// GET /api/auth/verify - Verify token validity
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token is valid',
        user: req.user
    });
});

// DELETE /api/auth/delete-account - Delete user account
router.delete('/delete-account', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Import PriceAlertModel for cleanup
        const PriceAlertModel = require('../models/priceAlertModel');
        const priceAlertModel = new PriceAlertModel();
        
        // Delete user's price alerts
        await priceAlertModel.deleteUserAlerts(userId);
        
        // Delete user account
        const result = await userModel.deleteUser(userId);
        
        if (result) {
            res.json({
                success: true,
                message: 'Account deleted successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to delete account'
            });
        }
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete account',
            error: error.message
        });
    }
});

module.exports = router;
