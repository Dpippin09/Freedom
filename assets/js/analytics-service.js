// Analytics API Service
class AnalyticsService {
    constructor() {
        this.baseURL = '/api/analytics';
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

    // === USER ANALYTICS ===

    // Get user's personal analytics
    async getUserAnalytics() {
        try {
            const response = await fetch(`${this.baseURL}/user`, {
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Get user analytics error:', error);
            throw error;
        }
    }

    // Get user dashboard data
    async getDashboard() {
        try {
            const response = await fetch(`${this.baseURL}/dashboard`, {
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Get dashboard error:', error);
            throw error;
        }
    }

    // Generate user report
    async generateReport(period = 'monthly') {
        try {
            const response = await fetch(`${this.baseURL}/report/${period}`, {
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Generate report error:', error);
            throw error;
        }
    }

    // Set user goals
    async setGoals(savingsTarget, alertTarget) {
        try {
            const response = await fetch(`${this.baseURL}/goals`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    savingsTarget,
                    alertTarget
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Set goals error:', error);
            throw error;
        }
    }

    // === MARKET ANALYTICS ===

    // Get market trends
    async getMarketTrends(category = null, days = 30) {
        try {
            const params = new URLSearchParams();
            if (category) params.append('category', category);
            params.append('days', days);

            const response = await fetch(`${this.baseURL}/market-trends?${params}`, {
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Get market trends error:', error);
            throw error;
        }
    }

    // Get price history for a product
    async getPriceHistory(productId, days = 30) {
        try {
            const response = await fetch(`${this.baseURL}/price-history/${productId}?days=${days}`, {
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Get price history error:', error);
            throw error;
        }
    }

    // Get global platform statistics
    async getGlobalStats() {
        try {
            const response = await fetch(`${this.baseURL}/global-stats`);
            return await response.json();
        } catch (error) {
            console.error('Get global stats error:', error);
            throw error;
        }
    }

    // === EVENT TRACKING ===

    // Track analytics events
    async trackEvent(eventType, eventData) {
        try {
            const response = await fetch(`${this.baseURL}/track-event`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    eventType,
                    eventData
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Track event error:', error);
            throw error;
        }
    }

    // Convenience methods for common events
    async trackAlertCreated(category, targetPrice) {
        return this.trackEvent('alert_created', {
            category,
            targetPrice
        });
    }

    async trackPriceDrop(productId, oldPrice, newPrice, savings) {
        return this.trackEvent('price_drop', {
            productId,
            oldPrice,
            newPrice,
            savings
        });
    }

    async trackWishlistAdd() {
        return this.trackEvent('wishlist_add', {});
    }

    // === DATA VISUALIZATION HELPERS ===

    // Format analytics data for charts
    formatChartData(data, type) {
        switch (type) {
            case 'price_history':
                return {
                    labels: data.map(entry => new Date(entry.timestamp).toLocaleDateString()),
                    datasets: [{
                        label: 'Price',
                        data: data.map(entry => entry.price),
                        borderColor: 'rgb(102, 126, 234)',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.1
                    }]
                };

            case 'savings_over_time':
                return {
                    labels: data.map(entry => new Date(entry.timestamp).toLocaleDateString()),
                    datasets: [{
                        label: 'Cumulative Savings',
                        data: this.calculateCumulativeSavings(data),
                        borderColor: 'rgb(76, 175, 80)',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.1
                    }]
                };

            case 'category_distribution':
                const categories = Object.keys(data);
                const values = Object.values(data);
                return {
                    labels: categories,
                    datasets: [{
                        data: values,
                        backgroundColor: [
                            '#FF6384',
                            '#36A2EB',
                            '#FFCE56',
                            '#4BC0C0',
                            '#9966FF',
                            '#FF9F40'
                        ]
                    }]
                };

            default:
                return data;
        }
    }

    calculateCumulativeSavings(priceDropHistory) {
        let cumulative = 0;
        return priceDropHistory.map(drop => {
            cumulative += drop.savings;
            return cumulative;
        });
    }

    // === INSIGHTS & RECOMMENDATIONS ===

    // Generate insights from analytics data
    generateInsights(analyticsData) {
        const insights = [];

        // Savings insights
        if (analyticsData.totalSavings > 0) {
            insights.push({
                type: 'savings',
                icon: '💰',
                title: 'Total Savings',
                value: `$${analyticsData.totalSavings.toFixed(2)}`,
                description: 'Money saved through price alerts',
                trend: analyticsData.totalSavings > analyticsData.monthlyGoals.savingsTarget ? 'up' : 'down'
            });
        }

        // Alert effectiveness
        if (analyticsData.alertsCreated > 0) {
            const effectiveness = (analyticsData.alertsTriggered / analyticsData.alertsCreated * 100).toFixed(1);
            insights.push({
                type: 'effectiveness',
                icon: '🎯',
                title: 'Alert Effectiveness',
                value: `${effectiveness}%`,
                description: 'Percentage of alerts that triggered',
                trend: effectiveness > 50 ? 'up' : 'down'
            });
        }

        // Average savings per alert
        if (analyticsData.averageSavingsPerAlert > 0) {
            insights.push({
                type: 'average_savings',
                icon: '📊',
                title: 'Average Savings',
                value: `$${analyticsData.averageSavingsPerAlert.toFixed(2)}`,
                description: 'Average savings per triggered alert',
                trend: analyticsData.averageSavingsPerAlert > 10 ? 'up' : 'neutral'
            });
        }

        return insights;
    }

    // Calculate user's shopping score
    calculateShoppingScore(analyticsData) {
        let score = 0;
        let maxScore = 100;

        // Savings score (40 points max)
        if (analyticsData.totalSavings >= 100) score += 40;
        else if (analyticsData.totalSavings >= 50) score += 30;
        else if (analyticsData.totalSavings >= 20) score += 20;
        else if (analyticsData.totalSavings > 0) score += 10;

        // Alert usage score (30 points max)
        if (analyticsData.alertsCreated >= 10) score += 30;
        else if (analyticsData.alertsCreated >= 5) score += 20;
        else if (analyticsData.alertsCreated >= 1) score += 10;

        // Effectiveness score (30 points max)
        if (analyticsData.alertsCreated > 0) {
            const effectiveness = analyticsData.alertsTriggered / analyticsData.alertsCreated;
            if (effectiveness >= 0.8) score += 30;
            else if (effectiveness >= 0.6) score += 25;
            else if (effectiveness >= 0.4) score += 20;
            else if (effectiveness >= 0.2) score += 15;
            else if (effectiveness > 0) score += 10;
        }

        return {
            score,
            maxScore,
            percentage: Math.round((score / maxScore) * 100),
            level: this.getShoppingLevel(score)
        };
    }

    getShoppingLevel(score) {
        if (score >= 80) return { name: 'Master Shopper', icon: '👑', color: '#FFD700' };
        if (score >= 60) return { name: 'Smart Shopper', icon: '🎯', color: '#4CAF50' };
        if (score >= 40) return { name: 'Savvy Shopper', icon: '💡', color: '#2196F3' };
        if (score >= 20) return { name: 'Learning Shopper', icon: '📚', color: '#FF9800' };
        return { name: 'New Shopper', icon: '🌱', color: '#9E9E9E' };
    }

    // === LOCAL STORAGE HELPERS ===

    // Cache analytics data locally
    cacheAnalytics(data, key = 'analytics') {
        try {
            const cacheData = {
                data,
                timestamp: Date.now(),
                expires: Date.now() + (30 * 60 * 1000) // 30 minutes
            };
            localStorage.setItem(`snatched_it_${key}`, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Cache analytics error:', error);
        }
    }

    // Get cached analytics data
    getCachedAnalytics(key = 'analytics') {
        try {
            const cached = localStorage.getItem(`snatched_it_${key}`);
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            if (Date.now() > cacheData.expires) {
                localStorage.removeItem(`snatched_it_${key}`);
                return null;
            }

            return cacheData.data;
        } catch (error) {
            console.error('Get cached analytics error:', error);
            return null;
        }
    }

    // Clear analytics cache
    clearCache() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('snatched_it_analytics') || key.startsWith('snatched_it_dashboard')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Clear cache error:', error);
        }
    }
}

// Export for use in other modules
window.AnalyticsService = AnalyticsService;
