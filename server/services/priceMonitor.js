const PriceAlertModel = require('../models/priceAlertModel');
const fs = require('fs').promises;
const path = require('path');

class PriceMonitor {
    constructor() {
        this.priceAlertModel = new PriceAlertModel();
        this.productsFile = path.join(__dirname, '../data/products.json');
        this.priceHistoryFile = path.join(__dirname, '../data/price-history.json');
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.checkIntervalMinutes = 15; // Check every 15 minutes
        this.notifications = [];
    }

    async startMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ Price monitoring is already running');
            return;
        }

        console.log('🚀 Starting price monitoring system...');
        this.isMonitoring = true;

        // Run initial check
        await this.checkAllAlerts();

        // Set up periodic checking
        this.monitoringInterval = setInterval(async () => {
            await this.checkAllAlerts();
        }, this.checkIntervalMinutes * 60 * 1000);

        console.log(`✅ Price monitoring started - checking every ${this.checkIntervalMinutes} minutes`);
    }

    stopMonitoring() {
        if (!this.isMonitoring) {
            console.log('⚠️ Price monitoring is not running');
            return;
        }

        console.log('⏹️ Stopping price monitoring system...');
        this.isMonitoring = false;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        console.log('✅ Price monitoring stopped');
    }

    async checkAllAlerts() {
        try {
            console.log('🔍 Checking all active price alerts...');
            
            const activeAlerts = await this.priceAlertModel.getActiveAlerts();
            
            if (activeAlerts.length === 0) {
                console.log('📭 No active alerts to check');
                return { checked: 0, triggered: 0 };
            }

            console.log(`📊 Checking ${activeAlerts.length} active alerts`);

            const currentPrices = await this.getCurrentPrices();
            let triggeredCount = 0;

            for (const alert of activeAlerts) {
                try {
                    await this.checkSingleAlert(alert, currentPrices);
                    
                    if (this.shouldTriggerAlert(alert, currentPrices[alert.productId])) {
                        await this.triggerAlert(alert, currentPrices[alert.productId]);
                        triggeredCount++;
                    }
                    
                    // Update last checked timestamp
                    await this.priceAlertModel.updateLastChecked(alert.id);
                    
                } catch (error) {
                    console.error(`❌ Error checking alert ${alert.id}:`, error.message);
                }
            }

            console.log(`✅ Alert check complete: ${activeAlerts.length} checked, ${triggeredCount} triggered`);
            return { checked: activeAlerts.length, triggered: triggeredCount };

        } catch (error) {
            console.error('❌ Error in checkAllAlerts:', error);
            throw error;
        }
    }

    async checkSingleAlert(alert, currentPrices = null) {
        try {
            if (!currentPrices) {
                currentPrices = await this.getCurrentPrices();
            }

            const currentPrice = currentPrices[alert.productId];
            
            if (currentPrice === undefined) {
                console.log(`⚠️ No current price found for product ${alert.productId}`);
                return null;
            }

            console.log(`🔍 Checking alert for ${alert.productName}: Current $${currentPrice}, Target $${alert.targetPrice}`);

            if (this.shouldTriggerAlert(alert, currentPrice)) {
                return await this.triggerAlert(alert, currentPrice);
            }

            return null;
        } catch (error) {
            console.error(`Error checking alert ${alert.id}:`, error);
            throw error;
        }
    }

    shouldTriggerAlert(alert, currentPrice) {
        if (!alert.isActive || alert.isTriggered || currentPrice === undefined) {
            return false;
        }

        switch (alert.alertType) {
            case 'price_drop':
                return currentPrice <= alert.targetPrice;
            
            case 'percentage_drop':
                const percentageDropped = ((alert.currentPrice - currentPrice) / alert.currentPrice) * 100;
                return percentageDropped >= alert.threshold;
            
            case 'in_stock':
                // Would need stock status from scraping
                return false; // Placeholder
            
            default:
                return currentPrice <= alert.targetPrice;
        }
    }

    async triggerAlert(alert, newPrice) {
        try {
            console.log(`🚨 ALERT TRIGGERED! ${alert.productName} dropped to $${newPrice} (target: $${alert.targetPrice})`);

            // Update alert in database
            const triggeredAlert = await this.priceAlertModel.triggerAlert(alert.id, newPrice, {
                priceDrop: alert.currentPrice - newPrice,
                percentageDrop: ((alert.currentPrice - newPrice) / alert.currentPrice) * 100,
                triggeredAt: new Date().toISOString()
            });

            // Create notification
            const notification = {
                id: this.generateNotificationId(),
                alertId: alert.id,
                userId: alert.userId,
                type: 'price_alert',
                title: `Price Alert: ${alert.productName}`,
                message: `Great news! ${alert.productName} dropped to $${newPrice} (was $${alert.currentPrice})`,
                data: {
                    productId: alert.productId,
                    productName: alert.productName,
                    oldPrice: alert.currentPrice,
                    newPrice: newPrice,
                    savings: alert.currentPrice - newPrice,
                    targetPrice: alert.targetPrice
                },
                isRead: false,
                createdAt: new Date().toISOString()
            };

            await this.saveNotification(notification);

            // Send notifications based on user preferences
            if (alert.notificationPreferences.email) {
                await this.sendEmailNotification(alert, notification);
            }

            if (alert.notificationPreferences.push) {
                await this.sendPushNotification(alert, notification);
            }

            console.log(`📧 Notifications sent for alert ${alert.id}`);
            return triggeredAlert;

        } catch (error) {
            console.error(`Error triggering alert ${alert.id}:`, error);
            throw error;
        }
    }

    async getCurrentPrices() {
        try {
            // Get prices from products file
            const productsData = await fs.readFile(this.productsFile, 'utf8');
            const products = JSON.parse(productsData);
            
            const prices = {};
            
            // Add base product prices
            products.forEach(product => {
                prices[product.id] = parseFloat(product.price);
            });

            // Try to get more recent prices from price history
            try {
                const priceHistoryData = await fs.readFile(this.priceHistoryFile, 'utf8');
                const priceHistory = JSON.parse(priceHistoryData);
                
                // Get most recent prices from history
                Object.keys(priceHistory).forEach(productId => {
                    const history = priceHistory[productId];
                    if (history && history.length > 0) {
                        const latestEntry = history[history.length - 1];
                        if (latestEntry.retailers) {
                            // Find the lowest current price among retailers
                            const currentPrices = Object.values(latestEntry.retailers)
                                .filter(retailer => retailer.price && !isNaN(retailer.price))
                                .map(retailer => parseFloat(retailer.price));
                            
                            if (currentPrices.length > 0) {
                                prices[productId] = Math.min(...currentPrices);
                            }
                        }
                    }
                });
                
            } catch (priceHistoryError) {
                console.log('📊 No price history file found, using base product prices');
            }

            return prices;
            
        } catch (error) {
            console.error('Error getting current prices:', error);
            return {};
        }
    }

    async saveNotification(notification) {
        try {
            const notificationsFile = path.join(__dirname, '../data/notifications.json');
            
            let notifications = [];
            try {
                const data = await fs.readFile(notificationsFile, 'utf8');
                notifications = JSON.parse(data);
            } catch (error) {
                // File doesn't exist, will create new one
            }

            notifications.push(notification);
            
            // Keep only last 1000 notifications
            if (notifications.length > 1000) {
                notifications = notifications.slice(-1000);
            }

            await fs.writeFile(notificationsFile, JSON.stringify(notifications, null, 2));
            
        } catch (error) {
            console.error('Error saving notification:', error);
        }
    }

    async sendEmailNotification(alert, notification) {
        // Placeholder for email notification
        // In production, you would integrate with email service like SendGrid, AWS SES, etc.
        console.log(`📧 [EMAIL] To: User ${alert.userId}`);
        console.log(`📧 [EMAIL] Subject: ${notification.title}`);
        console.log(`📧 [EMAIL] Message: ${notification.message}`);
        
        // For demo purposes, we'll just log the notification
        // TODO: Implement actual email sending
    }

    async sendPushNotification(alert, notification) {
        // Placeholder for push notification
        // In production, you would integrate with push service like Firebase, OneSignal, etc.
        console.log(`📱 [PUSH] To: User ${alert.userId}`);
        console.log(`📱 [PUSH] Title: ${notification.title}`);
        console.log(`📱 [PUSH] Message: ${notification.message}`);
        
        // For demo purposes, we'll just log the notification
        // TODO: Implement actual push notifications
    }

    generateNotificationId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            checkInterval: this.checkIntervalMinutes,
            nextCheckIn: this.isMonitoring ? 
                Math.ceil((this.checkIntervalMinutes * 60 * 1000 - (Date.now() % (this.checkIntervalMinutes * 60 * 1000))) / 1000) : 
                null
        };
    }

    async getMonitoringStats() {
        try {
            const allAlerts = await this.priceAlertModel.getAllAlerts();
            const activeAlerts = allAlerts.filter(alert => alert.isActive && !alert.isTriggered);
            const triggeredAlerts = allAlerts.filter(alert => alert.isTriggered);
            
            return {
                totalAlerts: allAlerts.length,
                activeAlerts: activeAlerts.length,
                triggeredAlerts: triggeredAlerts.length,
                pausedAlerts: allAlerts.filter(alert => !alert.isActive).length,
                isMonitoring: this.isMonitoring,
                checkInterval: this.checkIntervalMinutes,
                lastCheck: this.lastCheckTime || null
            };
        } catch (error) {
            console.error('Error getting monitoring stats:', error);
            return null;
        }
    }
}

module.exports = PriceMonitor;
