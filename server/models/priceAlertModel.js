const fs = require('fs').promises;
const path = require('path');

class PriceAlertModel {
    constructor() {
        this.alertsFile = path.join(__dirname, '../data/price-alerts.json');
        this.initializeAlertsFile();
    }

    async initializeAlertsFile() {
        try {
            await fs.access(this.alertsFile);
        } catch (error) {
            // File doesn't exist, create it
            await fs.writeFile(this.alertsFile, JSON.stringify([], null, 2));
        }
    }

    async getAllAlerts() {
        try {
            const data = await fs.readFile(this.alertsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading alerts file:', error);
            return [];
        }
    }

    async saveAlerts(alerts) {
        try {
            await fs.writeFile(this.alertsFile, JSON.stringify(alerts, null, 2));
        } catch (error) {
            console.error('Error saving alerts file:', error);
            throw error;
        }
    }

    async createAlert(alertData) {
        const alerts = await this.getAllAlerts();
        
        const newAlert = {
            id: this.generateAlertId(),
            userId: alertData.userId,
            productId: alertData.productId,
            productName: alertData.productName,
            productImage: alertData.productImage,
            targetPrice: parseFloat(alertData.targetPrice),
            currentPrice: parseFloat(alertData.currentPrice),
            alertType: alertData.alertType || 'price_drop', // 'price_drop', 'in_stock', 'percentage_drop'
            threshold: alertData.threshold || null, // For percentage drops
            isActive: true,
            isTriggered: false,
            triggerCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastChecked: null,
            lastTriggered: null,
            notificationPreferences: {
                email: alertData.emailNotification !== false,
                push: alertData.pushNotification !== false,
                inApp: true
            }
        };

        alerts.push(newAlert);
        await this.saveAlerts(alerts);
        
        return newAlert;
    }

    async getUserAlerts(userId) {
        const alerts = await this.getAllAlerts();
        return alerts.filter(alert => alert.userId === userId);
    }

    async getActiveAlerts() {
        const alerts = await this.getAllAlerts();
        return alerts.filter(alert => alert.isActive && !alert.isTriggered);
    }

    async getAlertById(alertId) {
        const alerts = await this.getAllAlerts();
        return alerts.find(alert => alert.id === alertId);
    }

    async updateAlert(alertId, updateData) {
        const alerts = await this.getAllAlerts();
        const alertIndex = alerts.findIndex(alert => alert.id === alertId);
        
        if (alertIndex === -1) {
            throw new Error('Alert not found');
        }

        // Update alert properties
        const updatedAlert = {
            ...alerts[alertIndex],
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        alerts[alertIndex] = updatedAlert;
        await this.saveAlerts(alerts);
        
        return updatedAlert;
    }

    async deleteAlert(alertId) {
        const alerts = await this.getAllAlerts();
        const filteredAlerts = alerts.filter(alert => alert.id !== alertId);
        
        if (filteredAlerts.length === alerts.length) {
            throw new Error('Alert not found');
        }

        await this.saveAlerts(filteredAlerts);
        return true;
    }

    async deleteUserAlerts(userId) {
        const alerts = await this.getAllAlerts();
        const filteredAlerts = alerts.filter(alert => alert.userId !== userId);
        await this.saveAlerts(filteredAlerts);
        return true;
    }

    async triggerAlert(alertId, newPrice, productData = {}) {
        const alerts = await this.getAllAlerts();
        const alertIndex = alerts.findIndex(alert => alert.id === alertId);
        
        if (alertIndex === -1) {
            throw new Error('Alert not found');
        }

        const alert = alerts[alertIndex];
        const now = new Date().toISOString();

        // Update alert with trigger information
        alerts[alertIndex] = {
            ...alert,
            isTriggered: true,
            triggerCount: alert.triggerCount + 1,
            lastTriggered: now,
            lastChecked: now,
            updatedAt: now,
            triggerPrice: newPrice,
            triggerData: productData
        };

        await this.saveAlerts(alerts);
        return alerts[alertIndex];
    }

    async updateLastChecked(alertId) {
        const alerts = await this.getAllAlerts();
        const alertIndex = alerts.findIndex(alert => alert.id === alertId);
        
        if (alertIndex !== -1) {
            alerts[alertIndex].lastChecked = new Date().toISOString();
            alerts[alertIndex].updatedAt = new Date().toISOString();
            await this.saveAlerts(alerts);
        }
    }

    async reactivateAlert(alertId) {
        const updateData = {
            isActive: true,
            isTriggered: false,
            triggerPrice: null,
            triggerData: null
        };
        
        return await this.updateAlert(alertId, updateData);
    }

    async pauseAlert(alertId) {
        return await this.updateAlert(alertId, { isActive: false });
    }

    async getAlertStats(userId) {
        const userAlerts = await this.getUserAlerts(userId);
        
        return {
            total: userAlerts.length,
            active: userAlerts.filter(alert => alert.isActive && !alert.isTriggered).length,
            triggered: userAlerts.filter(alert => alert.isTriggered).length,
            paused: userAlerts.filter(alert => !alert.isActive).length,
            totalSavings: userAlerts
                .filter(alert => alert.isTriggered && alert.triggerPrice)
                .reduce((sum, alert) => {
                    const savings = alert.currentPrice - alert.triggerPrice;
                    return sum + (savings > 0 ? savings : 0);
                }, 0)
        };
    }

    generateAlertId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    // Helper method to check if alert should trigger
    shouldTrigger(alert, currentPrice) {
        if (!alert.isActive || alert.isTriggered) {
            return false;
        }

        switch (alert.alertType) {
            case 'price_drop':
                return currentPrice <= alert.targetPrice;
            
            case 'percentage_drop':
                const percentageDropped = ((alert.currentPrice - currentPrice) / alert.currentPrice) * 100;
                return percentageDropped >= alert.threshold;
            
            case 'in_stock':
                // This would require stock status from scraping
                return true; // Placeholder
            
            default:
                return currentPrice <= alert.targetPrice;
        }
    }
}

module.exports = PriceAlertModel;
