const express = require('express');
const router = express.Router();
const AnalyticsModel = require('../models/analyticsModel');
const { authenticateToken } = require('../middleware/auth');

const analyticsModel = new AnalyticsModel();

// GET /api/analytics/user - Get user's personal analytics
router.get('/user', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const analytics = await analyticsModel.getUserAnalytics(userId);

        res.json({
            success: true,
            analytics
        });
    } catch (error) {
        console.error('Get user analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user analytics',
            error: error.message
        });
    }
});

// GET /api/analytics/dashboard - Get user dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user analytics
        const userAnalytics = await analyticsModel.getUserAnalytics(userId);
        
        // Get recent market trends for user's favorite categories
        const favoriteCategories = Object.keys(userAnalytics.favoriteCategories);
        const marketTrends = {};
        
        for (const category of favoriteCategories.slice(0, 3)) {
            marketTrends[category] = await analyticsModel.getMarketTrends(category, 7);
        }
        
        // Get overall market trends if no favorite categories
        if (favoriteCategories.length === 0) {
            marketTrends.general = await analyticsModel.getMarketTrends(null, 7);
        }
        
        const dashboard = {
            userStats: {
                totalSavings: userAnalytics.totalSavings,
                alertsActive: userAnalytics.alertsCreated - userAnalytics.alertsTriggered,
                alertsTriggered: userAnalytics.alertsTriggered,
                averageSavings: userAnalytics.averageSavingsPerAlert,
                favoriteCategory: getMostFrequentCategory(userAnalytics.favoriteCategories),
                recentSavings: getRecentSavings(userAnalytics.priceDropHistory, 7)
            },
            marketInsights: marketTrends,
            goals: userAnalytics.monthlyGoals,
            achievements: analyticsModel.calculateAchievements(userAnalytics),
            recommendations: analyticsModel.generateUserRecommendations(userAnalytics)
        };

        res.json({
            success: true,
            dashboard
        });
    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard data',
            error: error.message
        });
    }
});

// GET /api/analytics/report/:period - Generate user report
router.get('/report/:period', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const period = req.params.period;
        
        if (!['weekly', 'monthly', 'yearly'].includes(period)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid period. Must be weekly, monthly, or yearly.'
            });
        }
        
        const report = await analyticsModel.generateUserReport(userId, period);

        res.json({
            success: true,
            report
        });
    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate report',
            error: error.message
        });
    }
});

// GET /api/analytics/market-trends - Get market trends
router.get('/market-trends', authenticateToken, async (req, res) => {
    try {
        const { category, days = 30 } = req.query;
        const trends = await analyticsModel.getMarketTrends(category, parseInt(days));

        res.json({
            success: true,
            trends
        });
    } catch (error) {
        console.error('Get market trends error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get market trends',
            error: error.message
        });
    }
});

// POST /api/analytics/goals - Set user goals
router.post('/goals', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { savingsTarget, alertTarget } = req.body;
        
        if (!savingsTarget || !alertTarget) {
            return res.status(400).json({
                success: false,
                message: 'Savings target and alert target are required'
            });
        }
        
        const currentAnalytics = await analyticsModel.getUserAnalytics(userId);
        const updatedGoals = {
            savingsTarget: parseFloat(savingsTarget),
            alertTarget: parseInt(alertTarget),
            currentSavings: currentAnalytics.totalSavings,
            currentAlerts: currentAnalytics.alertsCreated,
            setAt: new Date().toISOString()
        };
        
        await analyticsModel.updateUserAnalytics(userId, {
            monthlyGoals: updatedGoals
        });

        res.json({
            success: true,
            message: 'Goals updated successfully',
            goals: updatedGoals
        });
    } catch (error) {
        console.error('Set goals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set goals',
            error: error.message
        });
    }
});

// GET /api/analytics/price-history/:productId - Get price history for a product
router.get('/price-history/:productId', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.params;
        const { days = 30 } = req.query;
        
        const priceHistory = await analyticsModel.readPriceHistory();
        const productHistory = priceHistory[productId] || [];
        
        // Filter by date range
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        
        const filteredHistory = productHistory.filter(entry =>
            new Date(entry.timestamp) >= cutoffDate
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Calculate statistics
        const prices = filteredHistory.map(entry => entry.price);
        const stats = {
            currentPrice: prices.length > 0 ? prices[prices.length - 1] : null,
            lowestPrice: prices.length > 0 ? Math.min(...prices) : null,
            highestPrice: prices.length > 0 ? Math.max(...prices) : null,
            averagePrice: prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : null,
            priceChange: prices.length >= 2 ? prices[prices.length - 1] - prices[0] : 0,
            volatility: calculateVolatility(prices)
        };

        res.json({
            success: true,
            productId,
            timeframe: `${days} days`,
            history: filteredHistory,
            statistics: stats
        });
    } catch (error) {
        console.error('Get price history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get price history',
            error: error.message
        });
    }
});

// GET /api/analytics/global-stats - Get global platform statistics (admin/public)
router.get('/global-stats', async (req, res) => {
    try {
        const globalStats = await analyticsModel.getGlobalAnalytics();
        
        // Remove sensitive data for public consumption
        const publicStats = {
            totalSavings: globalStats.totalSavings,
            totalAlerts: globalStats.totalAlerts,
            avgSavingsPerUser: globalStats.avgSavingsPerUser,
            priceDropEvents: globalStats.priceDropEvents,
            popularCategories: globalStats.popularCategories,
            lastUpdated: globalStats.lastUpdated
        };

        res.json({
            success: true,
            stats: publicStats
        });
    } catch (error) {
        console.error('Get global stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get global statistics',
            error: error.message
        });
    }
});

// POST /api/analytics/track-event - Track custom analytics events
router.post('/track-event', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventType, eventData } = req.body;
        
        if (!eventType) {
            return res.status(400).json({
                success: false,
                message: 'Event type is required'
            });
        }
        
        // Handle different event types
        switch (eventType) {
            case 'alert_created':
                await analyticsModel.recordAlertCreated(
                    userId, 
                    eventData.category, 
                    eventData.targetPrice
                );
                break;
                
            case 'price_drop':
                await analyticsModel.recordPriceDrop(
                    userId,
                    eventData.productId,
                    eventData.oldPrice,
                    eventData.newPrice,
                    eventData.savings
                );
                break;
                
            case 'wishlist_add':
                const userAnalytics = await analyticsModel.getUserAnalytics(userId);
                await analyticsModel.updateUserAnalytics(userId, {
                    wishlistItems: (userAnalytics.wishlistItems || 0) + 1
                });
                break;
                
            case 'product_view':
                // Track product view - could be used for recommendations
                // For now, just acknowledge the event
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Unknown event type'
                });
        }

        res.json({
            success: true,
            message: 'Event tracked successfully'
        });
    } catch (error) {
        console.error('Track event error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track event',
            error: error.message
        });
    }
});

// Helper functions
function getMostFrequentCategory(categories) {
    if (!categories || Object.keys(categories).length === 0) return null;
    
    return Object.keys(categories).reduce((a, b) => 
        categories[a] > categories[b] ? a : b
    );
}

function getRecentSavings(priceDropHistory, days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return priceDropHistory
        .filter(drop => new Date(drop.timestamp) >= cutoffDate)
        .reduce((sum, drop) => sum + drop.savings, 0);
}

function calculateVolatility(prices) {
    if (prices.length < 2) return 0;
    
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const squaredDifferences = prices.map(price => Math.pow(price - mean, 2));
    const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / prices.length;
    
    return Math.sqrt(variance);
}

// Attach helper functions to router for access in routes
router.getMostFrequentCategory = getMostFrequentCategory;
router.getRecentSavings = getRecentSavings;
router.calculateVolatility = calculateVolatility;

module.exports = router;
