const express = require('express');
const router = express.Router();
const PriceAlertModel = require('../models/priceAlertModel');
const { authenticateToken } = require('../middleware/auth');

const priceAlertModel = new PriceAlertModel();

// GET /api/alerts - Get user's price alerts
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const alerts = await priceAlertModel.getUserAlerts(userId);
        
        res.json({
            success: true,
            alerts,
            count: alerts.length
        });
    } catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get price alerts',
            error: error.message
        });
    }
});

// POST /api/alerts - Create new price alert
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            productId,
            productName,
            productImage,
            targetPrice,
            currentPrice,
            alertType,
            threshold,
            emailNotification,
            pushNotification
        } = req.body;

        // Validation
        if (!productId || !productName || !targetPrice || !currentPrice) {
            return res.status(400).json({
                success: false,
                message: 'Product ID, name, target price, and current price are required'
            });
        }

        if (parseFloat(targetPrice) <= 0 || parseFloat(currentPrice) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Prices must be positive numbers'
            });
        }

        if (alertType === 'percentage_drop' && (!threshold || threshold <= 0 || threshold > 100)) {
            return res.status(400).json({
                success: false,
                message: 'Percentage threshold must be between 1 and 100'
            });
        }

        // Check if user already has an alert for this product
        const existingAlerts = await priceAlertModel.getUserAlerts(userId);
        const existingAlert = existingAlerts.find(alert => 
            alert.productId === productId && alert.isActive
        );

        if (existingAlert) {
            return res.status(409).json({
                success: false,
                message: 'You already have an active alert for this product',
                existingAlert
            });
        }

        const alertData = {
            userId,
            productId,
            productName,
            productImage: productImage || '',
            targetPrice,
            currentPrice,
            alertType: alertType || 'price_drop',
            threshold,
            emailNotification,
            pushNotification
        };

        const newAlert = await priceAlertModel.createAlert(alertData);

        res.status(201).json({
            success: true,
            message: 'Price alert created successfully',
            alert: newAlert
        });
    } catch (error) {
        console.error('Create alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create price alert',
            error: error.message
        });
    }
});

// PUT /api/alerts/:id - Update price alert
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const alertId = req.params.id;
        const userId = req.user.id;
        const updateData = req.body;

        // Check if alert exists and belongs to user
        const alert = await priceAlertModel.getAlertById(alertId);
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Price alert not found'
            });
        }

        if (alert.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this alert'
            });
        }

        // Validate update data
        if (updateData.targetPrice && parseFloat(updateData.targetPrice) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Target price must be a positive number'
            });
        }

        const updatedAlert = await priceAlertModel.updateAlert(alertId, updateData);

        res.json({
            success: true,
            message: 'Price alert updated successfully',
            alert: updatedAlert
        });
    } catch (error) {
        console.error('Update alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update price alert',
            error: error.message
        });
    }
});

// DELETE /api/alerts/:id - Delete price alert
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const alertId = req.params.id;
        const userId = req.user.id;

        // Check if alert exists and belongs to user
        const alert = await priceAlertModel.getAlertById(alertId);
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Price alert not found'
            });
        }

        if (alert.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this alert'
            });
        }

        await priceAlertModel.deleteAlert(alertId);

        res.json({
            success: true,
            message: 'Price alert deleted successfully'
        });
    } catch (error) {
        console.error('Delete alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete price alert',
            error: error.message
        });
    }
});

// POST /api/alerts/:id/pause - Pause price alert
router.post('/:id/pause', authenticateToken, async (req, res) => {
    try {
        const alertId = req.params.id;
        const userId = req.user.id;

        // Check if alert exists and belongs to user
        const alert = await priceAlertModel.getAlertById(alertId);
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Price alert not found'
            });
        }

        if (alert.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to modify this alert'
            });
        }

        const updatedAlert = await priceAlertModel.pauseAlert(alertId);

        res.json({
            success: true,
            message: 'Price alert paused successfully',
            alert: updatedAlert
        });
    } catch (error) {
        console.error('Pause alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to pause price alert',
            error: error.message
        });
    }
});

// POST /api/alerts/:id/reactivate - Reactivate price alert
router.post('/:id/reactivate', authenticateToken, async (req, res) => {
    try {
        const alertId = req.params.id;
        const userId = req.user.id;

        // Check if alert exists and belongs to user
        const alert = await priceAlertModel.getAlertById(alertId);
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Price alert not found'
            });
        }

        if (alert.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to modify this alert'
            });
        }

        const updatedAlert = await priceAlertModel.reactivateAlert(alertId);

        res.json({
            success: true,
            message: 'Price alert reactivated successfully',
            alert: updatedAlert
        });
    } catch (error) {
        console.error('Reactivate alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reactivate price alert',
            error: error.message
        });
    }
});

// GET /api/alerts/stats - Get user's alert statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await priceAlertModel.getAlertStats(userId);

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Get alert stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get alert statistics',
            error: error.message
        });
    }
});

// GET /api/alerts/triggered - Get user's triggered alerts
router.get('/triggered', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const alerts = await priceAlertModel.getUserAlerts(userId);
        const triggeredAlerts = alerts.filter(alert => alert.isTriggered);

        res.json({
            success: true,
            alerts: triggeredAlerts,
            count: triggeredAlerts.length
        });
    } catch (error) {
        console.error('Get triggered alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get triggered alerts',
            error: error.message
        });
    }
});

module.exports = router;
