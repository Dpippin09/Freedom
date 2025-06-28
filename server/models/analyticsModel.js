// Analytics Data Model
const fs = require('fs').promises;
const path = require('path');

class AnalyticsModel {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.analyticsFile = path.join(this.dataDir, 'analytics.json');
        this.userAnalyticsFile = path.join(this.dataDir, 'user-analytics.json');
        this.priceHistoryFile = path.join(this.dataDir, 'price-history.json');
        this.init();
    }

    async init() {
        try {
            // Ensure data directory exists
            await fs.mkdir(this.dataDir, { recursive: true });

            // Initialize analytics files if they don't exist
            await this.ensureFileExists(this.analyticsFile, {
                globalStats: {
                    totalUsers: 0,
                    totalAlerts: 0,
                    totalSavings: 0,
                    avgSavingsPerUser: 0,
                    popularCategories: {},
                    priceDropEvents: 0,
                    lastUpdated: new Date().toISOString()
                },
                dailyStats: {},
                weeklyStats: {},
                monthlyStats: {}
            });

            await this.ensureFileExists(this.userAnalyticsFile, {});
            
        } catch (error) {
            console.error('Analytics model initialization error:', error);
        }
    }

    async ensureFileExists(filePath, defaultData) {
        try {
            await fs.access(filePath);
        } catch (error) {
            await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
        }
    }

    // === USER ANALYTICS ===

    async getUserAnalytics(userId) {
        try {
            const data = await this.readUserAnalytics();
            return data[userId] || this.createDefaultUserAnalytics(userId);
        } catch (error) {
            console.error('Get user analytics error:', error);
            return this.createDefaultUserAnalytics(userId);
        }
    }

    createDefaultUserAnalytics(userId) {
        return {
            userId,
            totalSavings: 0,
            alertsCreated: 0,
            alertsTriggered: 0,
            wishlistItems: 0,
            averageSavingsPerAlert: 0,
            favoriteCategories: {},
            shoppingPattern: {
                mostActiveDay: null,
                mostActiveHour: null,
                averageAlertValue: 0
            },
            monthlyGoals: {
                savingsTarget: 0,
                currentSavings: 0,
                alertTarget: 0,
                currentAlerts: 0
            },
            priceDropHistory: [],
            lastActivity: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
    }

    async updateUserAnalytics(userId, updateData) {
        try {
            const data = await this.readUserAnalytics();
            const userAnalytics = data[userId] || this.createDefaultUserAnalytics(userId);
            
            // Merge update data
            Object.assign(userAnalytics, updateData, {
                lastActivity: new Date().toISOString()
            });

            data[userId] = userAnalytics;
            await this.writeUserAnalytics(data);
            
            return userAnalytics;
        } catch (error) {
            console.error('Update user analytics error:', error);
            throw error;
        }
    }

    async recordPriceDrop(userId, productId, oldPrice, newPrice, savings) {
        try {
            const userAnalytics = await this.getUserAnalytics(userId);
            
            // Update savings
            userAnalytics.totalSavings += savings;
            userAnalytics.alertsTriggered += 1;
            
            // Calculate average savings per alert
            if (userAnalytics.alertsTriggered > 0) {
                userAnalytics.averageSavingsPerAlert = userAnalytics.totalSavings / userAnalytics.alertsTriggered;
            }

            // Add to price drop history
            userAnalytics.priceDropHistory.push({
                productId,
                oldPrice,
                newPrice,
                savings,
                timestamp: new Date().toISOString()
            });

            // Keep only last 50 price drops for performance
            if (userAnalytics.priceDropHistory.length > 50) {
                userAnalytics.priceDropHistory = userAnalytics.priceDropHistory.slice(-50);
            }

            await this.updateUserAnalytics(userId, userAnalytics);
            
            // Update global analytics
            await this.updateGlobalAnalytics({ totalSavings: savings, priceDropEvents: 1 });
            
            return userAnalytics;
        } catch (error) {
            console.error('Record price drop error:', error);
            throw error;
        }
    }

    async recordAlertCreated(userId, category, targetPrice) {
        try {
            const userAnalytics = await this.getUserAnalytics(userId);
            
            userAnalytics.alertsCreated += 1;
            
            // Update favorite categories
            if (!userAnalytics.favoriteCategories[category]) {
                userAnalytics.favoriteCategories[category] = 0;
            }
            userAnalytics.favoriteCategories[category] += 1;
            
            // Update shopping pattern
            const now = new Date();
            const day = now.toLocaleDateString('en-US', { weekday: 'long' });
            const hour = now.getHours();
            
            if (!userAnalytics.shoppingPattern.mostActiveDay) {
                userAnalytics.shoppingPattern.mostActiveDay = day;
            }
            
            if (!userAnalytics.shoppingPattern.mostActiveHour) {
                userAnalytics.shoppingPattern.mostActiveHour = hour;
            }
            
            // Calculate average alert value
            const totalAlertValue = (userAnalytics.shoppingPattern.averageAlertValue * (userAnalytics.alertsCreated - 1)) + targetPrice;
            userAnalytics.shoppingPattern.averageAlertValue = totalAlertValue / userAnalytics.alertsCreated;
            
            await this.updateUserAnalytics(userId, userAnalytics);
            
            // Update global analytics
            await this.updateGlobalAnalytics({ totalAlerts: 1 });
            
            return userAnalytics;
        } catch (error) {
            console.error('Record alert created error:', error);
            throw error;
        }
    }

    // === GLOBAL ANALYTICS ===

    async getGlobalAnalytics() {
        try {
            const data = await this.readAnalytics();
            return data.globalStats;
        } catch (error) {
            console.error('Get global analytics error:', error);
            throw error;
        }
    }

    async updateGlobalAnalytics(updates) {
        try {
            const data = await this.readAnalytics();
            const globalStats = data.globalStats;
            
            // Apply updates
            Object.keys(updates).forEach(key => {
                if (typeof updates[key] === 'number') {
                    globalStats[key] = (globalStats[key] || 0) + updates[key];
                } else {
                    globalStats[key] = updates[key];
                }
            });
            
            globalStats.lastUpdated = new Date().toISOString();
            
            // Calculate derived metrics
            if (globalStats.totalUsers > 0) {
                globalStats.avgSavingsPerUser = globalStats.totalSavings / globalStats.totalUsers;
            }
            
            data.globalStats = globalStats;
            await this.writeAnalytics(data);
            
            return globalStats;
        } catch (error) {
            console.error('Update global analytics error:', error);
            throw error;
        }
    }

    // === MARKET INTELLIGENCE ===

    async getMarketTrends(category = null, days = 30) {
        try {
            const priceHistory = await this.readPriceHistory();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            const trends = {
                category: category || 'all',
                timeframe: `${days} days`,
                averagePriceChange: 0,
                totalPriceDrops: 0,
                totalPriceIncreases: 0,
                mostDiscountedProducts: [],
                priceStability: 'stable',
                recommendations: []
            };
            
            let totalPriceChanges = 0;
            let priceChangeSum = 0;
            
            Object.keys(priceHistory).forEach(productId => {
                const history = priceHistory[productId];
                if (!history || history.length < 2) return;
                
                // Filter by category if specified
                if (category && history[0].category !== category) return;
                
                // Filter by date range
                const recentHistory = history.filter(entry => 
                    new Date(entry.timestamp) >= cutoffDate
                );
                
                if (recentHistory.length < 2) return;
                
                // Calculate price change
                const oldestPrice = recentHistory[0].price;
                const newestPrice = recentHistory[recentHistory.length - 1].price;
                const priceChange = ((newestPrice - oldestPrice) / oldestPrice) * 100;
                
                priceChangeSum += priceChange;
                totalPriceChanges++;
                
                if (priceChange < -5) { // 5% or more discount
                    trends.totalPriceDrops++;
                    trends.mostDiscountedProducts.push({
                        productId,
                        productName: recentHistory[0].productName,
                        oldPrice: oldestPrice,
                        newPrice: newestPrice,
                        discountPercent: Math.abs(priceChange).toFixed(1)
                    });
                } else if (priceChange > 5) {
                    trends.totalPriceIncreases++;
                }
            });
            
            // Calculate average price change
            if (totalPriceChanges > 0) {
                trends.averagePriceChange = (priceChangeSum / totalPriceChanges).toFixed(2);
            }
            
            // Determine price stability
            const avgChange = Math.abs(parseFloat(trends.averagePriceChange));
            if (avgChange < 2) {
                trends.priceStability = 'very stable';
            } else if (avgChange < 5) {
                trends.priceStability = 'stable';
            } else if (avgChange < 10) {
                trends.priceStability = 'volatile';
            } else {
                trends.priceStability = 'highly volatile';
            }
            
            // Sort most discounted products
            trends.mostDiscountedProducts.sort((a, b) => 
                parseFloat(b.discountPercent) - parseFloat(a.discountPercent)
            ).slice(0, 10);
            
            // Generate recommendations
            trends.recommendations = this.generateMarketRecommendations(trends);
            
            return trends;
        } catch (error) {
            console.error('Get market trends error:', error);
            throw error;
        }
    }

    generateMarketRecommendations(trends) {
        const recommendations = [];
        
        if (trends.totalPriceDrops > trends.totalPriceIncreases) {
            recommendations.push({
                type: 'market_timing',
                message: 'Great time to shop! Prices are generally trending downward.',
                action: 'Consider making purchases now or setting price alerts.'
            });
        }
        
        if (trends.mostDiscountedProducts.length > 5) {
            recommendations.push({
                type: 'deal_alert',
                message: `${trends.mostDiscountedProducts.length} products have significant discounts!`,
                action: 'Check out the trending deals section.'
            });
        }
        
        if (trends.priceStability === 'highly volatile') {
            recommendations.push({
                type: 'volatility_warning',
                message: 'Prices are highly volatile in this category.',
                action: 'Set tighter price alerts to catch the best deals.'
            });
        }
        
        return recommendations;
    }

    // === ACHIEVEMENT & RECOMMENDATION SYSTEM ===

    calculateAchievements(userAnalytics) {
        const achievements = [];
        
        // First price alert achievement
        if (userAnalytics.alertsCreated >= 1) {
            achievements.push({
                id: 'first_alert',
                title: 'First Step',
                description: 'Created your first price alert',
                icon: '🎯',
                unlockedAt: userAnalytics.createdAt
            });
        }
        
        // Savings achievements
        if (userAnalytics.totalSavings >= 10) {
            achievements.push({
                id: 'saver_10',
                title: 'Smart Saver',
                description: 'Saved $10 through price alerts',
                icon: '💰',
                unlockedAt: new Date().toISOString()
            });
        }
        
        if (userAnalytics.totalSavings >= 50) {
            achievements.push({
                id: 'saver_50',
                title: 'Deal Hunter',
                description: 'Saved $50 through price alerts',
                icon: '🏆',
                unlockedAt: new Date().toISOString()
            });
        }
        
        if (userAnalytics.totalSavings >= 100) {
            achievements.push({
                id: 'saver_100',
                title: 'Master Bargainer',
                description: 'Saved $100 through price alerts',
                icon: '👑',
                unlockedAt: new Date().toISOString()
            });
        }
        
        // Alert achievements
        if (userAnalytics.alertsCreated >= 5) {
            achievements.push({
                id: 'alert_master',
                title: 'Alert Master',
                description: 'Created 5 price alerts',
                icon: '📊',
                unlockedAt: new Date().toISOString()
            });
        }
        
        return achievements;
    }

    generateUserRecommendations(userAnalytics) {
        const recommendations = [];
        
        // If user has no alerts, recommend creating some
        if (userAnalytics.alertsCreated === 0) {
            recommendations.push({
                type: 'getting_started',
                title: 'Get Started with Price Alerts',
                description: 'Create your first price alert to start saving money',
                action: 'Browse products and set up alerts for items you want',
                priority: 'high'
            });
        }
        
        // If user has alerts but none triggered, encourage patience
        if (userAnalytics.alertsCreated > 0 && userAnalytics.alertsTriggered === 0) {
            recommendations.push({
                type: 'patience',
                title: 'Great Job Setting Up Alerts!',
                description: 'Your alerts are monitoring prices. You\'ll be notified when prices drop',
                action: 'Keep monitoring and consider adding more alerts',
                priority: 'medium'
            });
        }
        
        // If user has favorite categories, suggest similar items
        const favCategory = this.getMostFrequentCategory(userAnalytics.favoriteCategories);
        if (favCategory) {
            recommendations.push({
                type: 'category_suggestion',
                title: `More ${favCategory} Deals`,
                description: `You seem to love ${favCategory}. Check out more deals in this category`,
                action: `Browse ${favCategory} section`,
                priority: 'medium'
            });
        }
        
        // Goal progress recommendations
        if (userAnalytics.monthlyGoals?.savingsTarget) {
            const progress = (userAnalytics.totalSavings / userAnalytics.monthlyGoals.savingsTarget) * 100;
            if (progress < 50) {
                recommendations.push({
                    type: 'goal_progress',
                    title: 'Boost Your Savings',
                    description: `You're ${progress.toFixed(0)}% towards your monthly savings goal`,
                    action: 'Set up more price alerts to increase your savings',
                    priority: 'medium'
                });
            }
        }
        
        return recommendations;
    }

    getMostFrequentCategory(categories) {
        if (!categories || Object.keys(categories).length === 0) return null;
        
        return Object.keys(categories).reduce((a, b) => 
            categories[a] > categories[b] ? a : b
        );
    }

    async generateUserReport(userId, period) {
        try {
            const userAnalytics = await this.getUserAnalytics(userId);
            const now = new Date();
            let startDate;
            
            // Calculate period start date
            switch (period) {
                case 'weekly':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'monthly':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    period = 'weekly';
            }
            
            // Filter price drops within period
            const periodDrops = userAnalytics.priceDropHistory.filter(drop => 
                new Date(drop.timestamp) >= startDate
            );
            
            const periodSavings = periodDrops.reduce((sum, drop) => sum + drop.savings, 0);
            
            // Generate insights
            const insights = [];
            
            if (periodSavings > 0) {
                insights.push(`You saved $${periodSavings.toFixed(2)} this ${period}!`);
            }
            
            if (periodDrops.length > 0) {
                insights.push(`${periodDrops.length} of your alerts triggered this ${period}`);
            }
            
            if (userAnalytics.favoriteCategories) {
                const favCategory = this.getMostFrequentCategory(userAnalytics.favoriteCategories);
                if (favCategory) {
                    insights.push(`Your favorite category is ${favCategory}`);
                }
            }
            
            const report = {
                period,
                startDate: startDate.toISOString(),
                endDate: now.toISOString(),
                summary: {
                    totalSavings: periodSavings,
                    alertsTriggered: periodDrops.length,
                    bestDeal: periodDrops.length > 0 ? 
                        periodDrops.reduce((best, drop) => drop.savings > best.savings ? drop : best) : null
                },
                insights,
                achievements: this.calculateAchievements(userAnalytics),
                recommendations: this.generateUserRecommendations(userAnalytics)
            };
            
            return report;
        } catch (error) {
            console.error('Generate user report error:', error);
            throw error;
        }
    }

    // === FILE OPERATIONS ===

    async readAnalytics() {
        try {
            const data = await fs.readFile(this.analyticsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Read analytics error:', error);
            return { globalStats: {}, dailyStats: {}, weeklyStats: {}, monthlyStats: {} };
        }
    }

    async writeAnalytics(data) {
        try {
            await fs.writeFile(this.analyticsFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Write analytics error:', error);
            throw error;
        }
    }

    async readUserAnalytics() {
        try {
            const data = await fs.readFile(this.userAnalyticsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Read user analytics error:', error);
            return {};
        }
    }

    async writeUserAnalytics(data) {
        try {
            await fs.writeFile(this.userAnalyticsFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Write user analytics error:', error);
            throw error;
        }
    }

    async readPriceHistory() {
        try {
            const data = await fs.readFile(this.priceHistoryFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Read price history error:', error);
            return {};
        }
    }
}

module.exports = AnalyticsModel;
