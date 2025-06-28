const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');

const notificationsFile = path.join(__dirname, '../data/notifications.json');

// GET /api/notifications - Get user's notifications
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, unreadOnly = false } = req.query;
        
        let notifications = [];
        try {
            const data = await fs.readFile(notificationsFile, 'utf8');
            notifications = JSON.parse(data);
        } catch (error) {
            // File doesn't exist yet
            notifications = [];
        }

        // Filter by user and unread status
        let userNotifications = notifications.filter(notification => 
            notification.userId === userId
        );

        if (unreadOnly === 'true') {
            userNotifications = userNotifications.filter(notification => !notification.isRead);
        }

        // Sort by creation date (newest first)
        userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Pagination
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const endIndex = startIndex + parseInt(limit);
        const paginatedNotifications = userNotifications.slice(startIndex, endIndex);

        res.json({
            success: true,
            notifications: paginatedNotifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: userNotifications.length,
                totalPages: Math.ceil(userNotifications.length / parseInt(limit))
            },
            unreadCount: userNotifications.filter(n => !n.isRead).length
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notifications',
            error: error.message
        });
    }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user.id;

        let notifications = [];
        try {
            const data = await fs.readFile(notificationsFile, 'utf8');
            notifications = JSON.parse(data);
        } catch (error) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        const notificationIndex = notifications.findIndex(notification => 
            notification.id === notificationId && notification.userId === userId
        );

        if (notificationIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        notifications[notificationIndex].isRead = true;
        notifications[notificationIndex].readAt = new Date().toISOString();

        await fs.writeFile(notificationsFile, JSON.stringify(notifications, null, 2));

        res.json({
            success: true,
            message: 'Notification marked as read',
            notification: notifications[notificationIndex]
        });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message
        });
    }
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        let notifications = [];
        try {
            const data = await fs.readFile(notificationsFile, 'utf8');
            notifications = JSON.parse(data);
        } catch (error) {
            notifications = [];
        }

        let updatedCount = 0;
        const now = new Date().toISOString();

        notifications.forEach(notification => {
            if (notification.userId === userId && !notification.isRead) {
                notification.isRead = true;
                notification.readAt = now;
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            await fs.writeFile(notificationsFile, JSON.stringify(notifications, null, 2));
        }

        res.json({
            success: true,
            message: `${updatedCount} notifications marked as read`,
            updatedCount
        });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notifications as read',
            error: error.message
        });
    }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user.id;

        let notifications = [];
        try {
            const data = await fs.readFile(notificationsFile, 'utf8');
            notifications = JSON.parse(data);
        } catch (error) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        const initialLength = notifications.length;
        notifications = notifications.filter(notification => 
            !(notification.id === notificationId && notification.userId === userId)
        );

        if (notifications.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        await fs.writeFile(notificationsFile, JSON.stringify(notifications, null, 2));

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification',
            error: error.message
        });
    }
});

// DELETE /api/notifications - Delete all user notifications
router.delete('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        let notifications = [];
        try {
            const data = await fs.readFile(notificationsFile, 'utf8');
            notifications = JSON.parse(data);
        } catch (error) {
            notifications = [];
        }

        const initialLength = notifications.length;
        notifications = notifications.filter(notification => 
            notification.userId !== userId
        );

        const deletedCount = initialLength - notifications.length;

        if (deletedCount > 0) {
            await fs.writeFile(notificationsFile, JSON.stringify(notifications, null, 2));
        }

        res.json({
            success: true,
            message: `${deletedCount} notifications deleted`,
            deletedCount
        });
    } catch (error) {
        console.error('Delete all notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notifications',
            error: error.message
        });
    }
});

// GET /api/notifications/stats - Get notification statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        let notifications = [];
        try {
            const data = await fs.readFile(notificationsFile, 'utf8');
            notifications = JSON.parse(data);
        } catch (error) {
            notifications = [];
        }

        const userNotifications = notifications.filter(notification => 
            notification.userId === userId
        );

        const stats = {
            total: userNotifications.length,
            unread: userNotifications.filter(n => !n.isRead).length,
            read: userNotifications.filter(n => n.isRead).length,
            priceAlerts: userNotifications.filter(n => n.type === 'price_alert').length,
            today: userNotifications.filter(n => {
                const notificationDate = new Date(n.createdAt);
                const today = new Date();
                return notificationDate.toDateString() === today.toDateString();
            }).length,
            thisWeek: userNotifications.filter(n => {
                const notificationDate = new Date(n.createdAt);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return notificationDate >= weekAgo;
            }).length
        };

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Get notification stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notification statistics',
            error: error.message
        });
    }
});

module.exports = router;
