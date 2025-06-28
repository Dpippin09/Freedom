// Price Alerts API Service
class PriceAlertService {
    constructor() {
        this.baseURL = '/api/alerts';
        this.notificationsURL = '/api/notifications';
        this.monitoringURL = '/api/monitoring';
    }

    // Get authorization headers
    getAuthHeaders() {
        const token = localStorage.getItem('snatched_it_token');
        return token ? {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        } : {
            'Content-Type': 'application/json'
        };
    }

    // === PRICE ALERTS ===

    // Get all user's price alerts
    async getAlerts() {
        try {
            const response = await fetch(this.baseURL, {
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Get alerts error:', error);
            throw error;
        }
    }

    // Create new price alert
    async createAlert(alertData) {
        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(alertData)
            });
            return await response.json();
        } catch (error) {
            console.error('Create alert error:', error);
            throw error;
        }
    }

    // Update price alert
    async updateAlert(alertId, updateData) {
        try {
            const response = await fetch(`${this.baseURL}/${alertId}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(updateData)
            });
            return await response.json();
        } catch (error) {
            console.error('Update alert error:', error);
            throw error;
        }
    }

    // Delete price alert
    async deleteAlert(alertId) {
        try {
            const response = await fetch(`${this.baseURL}/${alertId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Delete alert error:', error);
            throw error;
        }
    }

    // Pause price alert
    async pauseAlert(alertId) {
        try {
            const response = await fetch(`${this.baseURL}/${alertId}/pause`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Pause alert error:', error);
            throw error;
        }
    }

    // Reactivate price alert
    async reactivateAlert(alertId) {
        try {
            const response = await fetch(`${this.baseURL}/${alertId}/reactivate`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Reactivate alert error:', error);
            throw error;
        }
    }

    // Get alert statistics
    async getAlertStats() {
        try {
            const response = await fetch(`${this.baseURL}/stats`, {
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Get alert stats error:', error);
            throw error;
        }
    }

    // Get triggered alerts
    async getTriggeredAlerts() {
        try {
            const response = await fetch(`${this.baseURL}/triggered`, {
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Get triggered alerts error:', error);
            throw error;
        }
    }

    // === NOTIFICATIONS ===

    // Get user notifications
    async getNotifications(options = {}) {
        try {
            const params = new URLSearchParams(options);
            const response = await fetch(`${this.notificationsURL}?${params}`, {
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Get notifications error:', error);
            throw error;
        }
    }

    // Mark notification as read
    async markNotificationRead(notificationId) {
        try {
            const response = await fetch(`${this.notificationsURL}/${notificationId}/read`, {
                method: 'PUT',
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Mark notification read error:', error);
            throw error;
        }
    }

    // Mark all notifications as read
    async markAllNotificationsRead() {
        try {
            const response = await fetch(`${this.notificationsURL}/read-all`, {
                method: 'PUT',
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Mark all notifications read error:', error);
            throw error;
        }
    }

    // Delete notification
    async deleteNotification(notificationId) {
        try {
            const response = await fetch(`${this.notificationsURL}/${notificationId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Delete notification error:', error);
            throw error;
        }
    }

    // Delete all notifications
    async deleteAllNotifications() {
        try {
            const response = await fetch(this.notificationsURL, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Delete all notifications error:', error);
            throw error;
        }
    }

    // Get notification statistics
    async getNotificationStats() {
        try {
            const response = await fetch(`${this.notificationsURL}/stats`, {
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Get notification stats error:', error);
            throw error;
        }
    }

    // === MONITORING ===

    // Get monitoring status
    async getMonitoringStatus() {
        try {
            const response = await fetch(`${this.monitoringURL}/status`);
            return await response.json();
        } catch (error) {
            console.error('Get monitoring status error:', error);
            throw error;
        }
    }

    // Start monitoring
    async startMonitoring() {
        try {
            const response = await fetch(`${this.monitoringURL}/start`, {
                method: 'POST'
            });
            return await response.json();
        } catch (error) {
            console.error('Start monitoring error:', error);
            throw error;
        }
    }

    // Stop monitoring
    async stopMonitoring() {
        try {
            const response = await fetch(`${this.monitoringURL}/stop`, {
                method: 'POST'
            });
            return await response.json();
        } catch (error) {
            console.error('Stop monitoring error:', error);
            throw error;
        }
    }

    // Manually check all alerts
    async checkAlertsNow() {
        try {
            const response = await fetch(`${this.monitoringURL}/check-now`, {
                method: 'POST'
            });
            return await response.json();
        } catch (error) {
            console.error('Check alerts now error:', error);
            throw error;
        }
    }

    // Check specific alert
    async checkAlert(alertId) {
        try {
            const response = await fetch(`${this.monitoringURL}/check-alert/${alertId}`, {
                method: 'POST'
            });
            return await response.json();
        } catch (error) {
            console.error('Check alert error:', error);
            throw error;
        }
    }

    // === HELPER METHODS ===

    // Check if product has active alert
    async hasActiveAlert(productId) {
        try {
            const alertsResult = await this.getAlerts();
            if (alertsResult.success) {
                return alertsResult.alerts.some(alert => 
                    alert.productId === productId && alert.isActive && !alert.isTriggered
                );
            }
            return false;
        } catch (error) {
            console.error('Check active alert error:', error);
            return false;
        }
    }

    // Get product alert if exists
    async getProductAlert(productId) {
        try {
            const alertsResult = await this.getAlerts();
            if (alertsResult.success) {
                return alertsResult.alerts.find(alert => 
                    alert.productId === productId && alert.isActive
                );
            }
            return null;
        } catch (error) {
            console.error('Get product alert error:', error);
            return null;
        }
    }

    // Format price for display
    formatPrice(price) {
        return typeof price === 'number' ? price.toFixed(2) : parseFloat(price).toFixed(2);
    }

    // Calculate savings
    calculateSavings(originalPrice, currentPrice) {
        const savings = originalPrice - currentPrice;
        return savings > 0 ? savings : 0;
    }

    // Calculate percentage drop
    calculatePercentageDrop(originalPrice, currentPrice) {
        const drop = ((originalPrice - currentPrice) / originalPrice) * 100;
        return drop > 0 ? drop : 0;
    }

    // Validate alert data
    validateAlertData(alertData) {
        const errors = [];

        if (!alertData.productId) {
            errors.push('Product ID is required');
        }

        if (!alertData.productName) {
            errors.push('Product name is required');
        }

        if (!alertData.targetPrice || alertData.targetPrice <= 0) {
            errors.push('Valid target price is required');
        }

        if (!alertData.currentPrice || alertData.currentPrice <= 0) {
            errors.push('Valid current price is required');
        }

        if (alertData.alertType === 'percentage_drop') {
            if (!alertData.threshold || alertData.threshold <= 0 || alertData.threshold > 100) {
                errors.push('Percentage threshold must be between 1 and 100');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Get unread notification count
    async getUnreadCount() {
        try {
            const stats = await this.getNotificationStats();
            return stats.success ? stats.stats.unread : 0;
        } catch (error) {
            console.error('Get unread count error:', error);
            return 0;
        }
    }
}

// Export for use in other modules
window.PriceAlertService = PriceAlertService;
