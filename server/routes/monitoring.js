const express = require('express');
const router = express.Router();
const PriceMonitor = require('../services/priceMonitor');

// Initialize the price monitor
const priceMonitor = new PriceMonitor();

// GET /api/monitoring/status - Get monitoring status
router.get('/status', async (req, res) => {
    try {
        const status = priceMonitor.getStatus();
        const stats = await priceMonitor.getMonitoringStats();

        res.json({
            success: true,
            status,
            stats
        });
    } catch (error) {
        console.error('Get monitoring status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get monitoring status',
            error: error.message
        });
    }
});

// POST /api/monitoring/start - Start price monitoring
router.post('/start', async (req, res) => {
    try {
        if (priceMonitor.isMonitoring) {
            return res.json({
                success: true,
                message: 'Price monitoring is already running',
                status: priceMonitor.getStatus()
            });
        }

        await priceMonitor.startMonitoring();

        res.json({
            success: true,
            message: 'Price monitoring started successfully',
            status: priceMonitor.getStatus()
        });
    } catch (error) {
        console.error('Start monitoring error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start price monitoring',
            error: error.message
        });
    }
});

// POST /api/monitoring/stop - Stop price monitoring
router.post('/stop', async (req, res) => {
    try {
        if (!priceMonitor.isMonitoring) {
            return res.json({
                success: true,
                message: 'Price monitoring is not running',
                status: priceMonitor.getStatus()
            });
        }

        priceMonitor.stopMonitoring();

        res.json({
            success: true,
            message: 'Price monitoring stopped successfully',
            status: priceMonitor.getStatus()
        });
    } catch (error) {
        console.error('Stop monitoring error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to stop price monitoring',
            error: error.message
        });
    }
});

// POST /api/monitoring/check-now - Manually trigger alert check
router.post('/check-now', async (req, res) => {
    try {
        console.log('🔍 Manual alert check triggered via API');
        const result = await priceMonitor.checkAllAlerts();

        res.json({
            success: true,
            message: 'Alert check completed',
            result: {
                checked: result.checked,
                triggered: result.triggered,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Manual check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check alerts',
            error: error.message
        });
    }
});

// POST /api/monitoring/check-alert/:id - Check specific alert
router.post('/check-alert/:id', async (req, res) => {
    try {
        const alertId = req.params.id;
        
        // Get the alert first
        const alert = await priceMonitor.priceAlertModel.getAlertById(alertId);
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }

        console.log(`🔍 Manual check for alert ${alertId} triggered via API`);
        const result = await priceMonitor.checkSingleAlert(alert);

        res.json({
            success: true,
            message: 'Alert check completed',
            result: {
                alertId,
                triggered: result !== null,
                timestamp: new Date().toISOString(),
                triggerData: result
            }
        });
    } catch (error) {
        console.error('Check single alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check alert',
            error: error.message
        });
    }
});

// GET /api/monitoring/config - Get monitoring configuration
router.get('/config', (req, res) => {
    try {
        res.json({
            success: true,
            config: {
                checkIntervalMinutes: priceMonitor.checkIntervalMinutes,
                isMonitoring: priceMonitor.isMonitoring
            }
        });
    } catch (error) {
        console.error('Get monitoring config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get monitoring configuration',
            error: error.message
        });
    }
});

// PUT /api/monitoring/config - Update monitoring configuration
router.put('/config', (req, res) => {
    try {
        const { checkIntervalMinutes } = req.body;

        if (checkIntervalMinutes && typeof checkIntervalMinutes === 'number' && checkIntervalMinutes > 0) {
            const wasMonitoring = priceMonitor.isMonitoring;
            
            // Stop monitoring if running
            if (wasMonitoring) {
                priceMonitor.stopMonitoring();
            }
            
            // Update interval
            priceMonitor.checkIntervalMinutes = checkIntervalMinutes;
            
            // Restart monitoring if it was running
            if (wasMonitoring) {
                priceMonitor.startMonitoring();
            }

            res.json({
                success: true,
                message: 'Monitoring configuration updated',
                config: {
                    checkIntervalMinutes: priceMonitor.checkIntervalMinutes,
                    isMonitoring: priceMonitor.isMonitoring
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid check interval. Must be a positive number.'
            });
        }
    } catch (error) {
        console.error('Update monitoring config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update monitoring configuration',
            error: error.message
        });
    }
});

// Auto-start monitoring when server starts
setTimeout(async () => {
    try {
        console.log('🤖 Auto-starting price monitoring system...');
        await priceMonitor.startMonitoring();
    } catch (error) {
        console.error('❌ Failed to auto-start price monitoring:', error);
    }
}, 5000); // Wait 5 seconds after server start

module.exports = router;
