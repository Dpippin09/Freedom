// Charts UI Manager - Integrates charts with analytics dashboard
class ChartsUI {
    constructor() {
        this.chartsService = new ChartsService();
        this.analyticsService = new AnalyticsService();
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        // Wait for dependencies
        if (!window.Chart || !window.ChartsService || !window.AnalyticsService) {
            console.warn('Charts dependencies not ready, retrying...');
            setTimeout(() => this.init(), 100);
            return;
        }

        this.isInitialized = true;
        console.log('Charts UI initialized');
    }

    // === ANALYTICS DASHBOARD INTEGRATION ===
    
    async enhanceAnalyticsDashboard() {
        try {
            // Wait for analytics data
            const dashboardData = await this.analyticsService.getDashboard();
            if (!dashboardData.success) {
                throw new Error('Failed to load dashboard data');
            }

            const userStats = dashboardData.dashboard.userStats;
            const dashboard = dashboardData.dashboard;

            // Add charts to the analytics modal
            this.addChartsToDashboard(userStats, dashboard);
            
        } catch (error) {
            console.error('Failed to enhance analytics dashboard:', error);
        }
    }

    addChartsToDashboard(userStats, dashboard) {
        // Find the analytics dashboard modal
        const analyticsModal = document.querySelector('.analytics-dashboard');
        if (!analyticsModal) {
            console.warn('Analytics dashboard not found');
            return;
        }

        // Add charts section to the dashboard
        this.injectChartsSection(analyticsModal, userStats, dashboard);
    }

    injectChartsSection(dashboardElement, userStats, dashboard) {
        // Check if charts section already exists
        let chartsSection = dashboardElement.querySelector('.analytics-charts-section');
        
        if (!chartsSection) {
            // Create charts section
            chartsSection = document.createElement('div');
            chartsSection.className = 'analytics-charts-section';
            chartsSection.innerHTML = `
                <div class="charts-header">
                    <h3>📊 Visual Analytics</h3>
                    <div class="charts-tabs">
                        <button class="chart-tab active" data-tab="overview">Overview</button>
                        <button class="chart-tab" data-tab="trends">Trends</button>
                        <button class="chart-tab" data-tab="goals">Goals</button>
                    </div>
                </div>
                
                <div class="charts-content">
                    <!-- Overview Tab -->
                    <div class="chart-panel active" data-panel="overview">
                        <div class="charts-grid">
                            <div class="chart-container">
                                <h4>📈 Savings Progress</h4>
                                <div class="chart-wrapper" id="savingsProgressChart"></div>
                            </div>
                            <div class="chart-container">
                                <h4>🎯 Goals Progress</h4>
                                <div class="chart-wrapper" id="goalsProgressChart"></div>
                            </div>
                            <div class="chart-container">
                                <h4>📋 Category Breakdown</h4>
                                <div class="chart-wrapper" id="categoryChart"></div>
                            </div>
                            <div class="chart-container">
                                <h4>⚡ Performance Radar</h4>
                                <div class="chart-wrapper" id="performanceChart"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Trends Tab -->
                    <div class="chart-panel" data-panel="trends">
                        <div class="charts-grid">
                            <div class="chart-container full-width">
                                <h4>📊 Savings Trend (Last 12 Weeks)</h4>
                                <div class="chart-wrapper" id="savingsTrendChart"></div>
                            </div>
                            <div class="chart-container full-width">
                                <h4>📈 Market Trends</h4>
                                <div class="chart-wrapper" id="marketTrendsChart"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Goals Tab -->
                    <div class="chart-panel" data-panel="goals">
                        <div class="charts-grid">
                            <div class="chart-container">
                                <h4>💰 Savings Goal</h4>
                                <div class="chart-wrapper" id="savingsGoalChart"></div>
                            </div>
                            <div class="chart-container">
                                <h4>🎯 Alerts Goal</h4>
                                <div class="chart-wrapper" id="alertsGoalChart"></div>
                            </div>
                            <div class="chart-container full-width">
                                <h4>📅 Monthly Progress</h4>
                                <div class="chart-wrapper" id="monthlyProgressChart"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Insert after the dashboard header
            const dashboardHeader = dashboardElement.querySelector('.dashboard-header');
            if (dashboardHeader) {
                dashboardHeader.after(chartsSection);
            } else {
                dashboardElement.appendChild(chartsSection);
            }

            // Add tab switching functionality
            this.setupChartTabs(chartsSection);
        }

        // Generate charts with real data
        this.generateDashboardCharts(userStats, dashboard);
    }

    setupChartTabs(chartsSection) {
        const tabs = chartsSection.querySelectorAll('.chart-tab');
        const panels = chartsSection.querySelectorAll('.chart-panel');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPanel = tab.getAttribute('data-tab');
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active panel
                panels.forEach(panel => {
                    panel.classList.remove('active');
                    if (panel.getAttribute('data-panel') === targetPanel) {
                        panel.classList.add('active');
                    }
                });

                // Trigger chart regeneration for the active panel
                setTimeout(() => this.refreshActiveCharts(targetPanel), 100);
            });
        });
    }

    async generateDashboardCharts(userStats, dashboard) {
        try {
            // Overview charts
            await this.createOverviewCharts(userStats, dashboard);
            
            // Trends charts
            await this.createTrendsCharts(userStats, dashboard);
            
            // Goals charts
            await this.createGoalsCharts(userStats, dashboard);
            
        } catch (error) {
            console.error('Failed to generate dashboard charts:', error);
        }
    }

    async createOverviewCharts(userStats, dashboard) {
        // 1. Savings Progress Chart (sample data for now)
        const savingsData = this.chartsService.generateSampleSavingsData(8);
        this.chartsService.createSavingsTrendChart('savingsProgressChart', savingsData, {
            chartOptions: {
                plugins: {
                    legend: { display: false }
                }
            }
        });

        // 2. Goals Progress Chart
        if (dashboard.goals?.savingsTarget) {
            this.chartsService.createGoalProgressChart('goalsProgressChart', {
                current: dashboard.goals.currentSavings || 0,
                target: dashboard.goals.savingsTarget,
                type: 'savings'
            });
        } else {
            // Show placeholder
            this.createPlaceholderChart('goalsProgressChart', 'Set savings goals to see progress');
        }

        // 3. Category Breakdown Chart
        if (userStats.favoriteCategory && Object.keys(userStats.favoriteCategories || {}).length > 0) {
            this.chartsService.createCategoryChart('categoryChart', userStats.favoriteCategories);
        } else {
            // Sample data for demonstration
            const sampleCategories = {
                'Clothing': 15,
                'Shoes': 8,
                'Accessories': 5,
                'Electronics': 3
            };
            this.chartsService.createCategoryChart('categoryChart', sampleCategories);
        }

        // 4. Performance Radar Chart
        const performanceData = {
            labels: ['Savings', 'Alert Success', 'Activity', 'Goal Progress', 'Engagement'],
            values: [
                Math.min(100, (userStats.totalSavings / 100) * 100),
                userStats.alertsCreated > 0 ? (userStats.alertsTriggered / userStats.alertsCreated) * 100 : 0,
                Math.min(100, userStats.alertsCreated * 20),
                dashboard.goals?.savingsTarget ? (dashboard.goals.currentSavings / dashboard.goals.savingsTarget) * 100 : 0,
                Math.min(100, Object.keys(userStats.favoriteCategories || {}).length * 25)
            ]
        };
        this.chartsService.createAnalyticsSummaryChart('performanceChart', performanceData);
    }

    async createTrendsCharts(userStats, dashboard) {
        // 1. Savings Trend Chart (12 weeks)
        const savingsData = this.chartsService.generateSampleSavingsData(12);
        this.chartsService.createSavingsTrendChart('savingsTrendChart', savingsData);

        // 2. Market Trends Chart
        try {
            const marketData = await this.analyticsService.getMarketTrends();
            if (marketData.success) {
                // Create sample trend data based on market data
                const trendsData = [{
                    label: 'Average Price Change',
                    data: this.generateTrendData(marketData.trends.averagePriceChange),
                    labels: this.generateTimeLabels(30)
                }];
                
                this.chartsService.createMarketTrendsChart('marketTrendsChart', trendsData);
            }
        } catch (error) {
            console.error('Failed to load market trends:', error);
            this.createPlaceholderChart('marketTrendsChart', 'Market trends data unavailable');
        }
    }

    async createGoalsCharts(userStats, dashboard) {
        // 1. Savings Goal Chart
        if (dashboard.goals?.savingsTarget) {
            this.chartsService.createGoalProgressChart('savingsGoalChart', {
                current: dashboard.goals.currentSavings || 0,
                target: dashboard.goals.savingsTarget,
                type: 'savings'
            });
        } else {
            this.createPlaceholderChart('savingsGoalChart', 'Set a savings goal to track progress');
        }

        // 2. Alerts Goal Chart
        if (dashboard.goals?.alertTarget) {
            this.chartsService.createGoalProgressChart('alertsGoalChart', {
                current: dashboard.goals.currentAlerts || 0,
                target: dashboard.goals.alertTarget,
                type: 'alerts'
            });
        } else {
            this.createPlaceholderChart('alertsGoalChart', 'Set an alerts goal to track progress');
        }

        // 3. Monthly Progress Chart
        const monthlyData = this.generateMonthlyProgressData(dashboard.goals);
        this.chartsService.createSavingsTrendChart('monthlyProgressChart', monthlyData);
    }

    // === PRODUCT PRICE HISTORY CHARTS ===
    
    async showProductPriceHistory(productId, containerId) {
        try {
            const priceHistory = await this.analyticsService.getPriceHistory(productId);
            
            if (priceHistory.success && priceHistory.history.length > 0) {
                this.chartsService.createPriceHistoryChart(containerId, priceHistory.history, {
                    label: 'Price History',
                    chartOptions: {
                        plugins: {
                            title: {
                                display: true,
                                text: 'Price History (Last 30 Days)'
                            }
                        }
                    }
                });
            } else {
                this.createPlaceholderChart(containerId, 'No price history available');
            }
        } catch (error) {
            console.error('Failed to load price history:', error);
            this.createPlaceholderChart(containerId, 'Failed to load price history');
        }
    }

    // === UTILITY METHODS ===
    
    createPlaceholderChart(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="chart-placeholder">
                <div class="placeholder-icon">📊</div>
                <div class="placeholder-message">${message}</div>
            </div>
        `;
    }

    generateTrendData(baseValue, days = 30) {
        const data = [];
        for (let i = 0; i < days; i++) {
            const variance = (Math.random() - 0.5) * 2;
            data.push(baseValue + variance);
        }
        return data;
    }

    generateTimeLabels(days) {
        const labels = [];
        const now = new Date();
        for (let i = days; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            labels.push(date.toLocaleDateString());
        }
        return labels;
    }

    generateMonthlyProgressData(goals) {
        // Generate sample monthly progress data
        const data = [];
        const now = new Date();
        const currentSavings = goals?.currentSavings || 0;
        
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const progress = Math.max(0, currentSavings * (Math.random() * 0.8 + 0.1));
            
            data.push({
                date: date.toISOString(),
                amount: progress
            });
        }
        
        return data;
    }

    async refreshActiveCharts(activePanel) {
        // Refresh charts in the active panel to ensure proper rendering
        const panel = document.querySelector(`[data-panel="${activePanel}"]`);
        if (!panel) return;

        const chartContainers = panel.querySelectorAll('.chart-wrapper');
        chartContainers.forEach(container => {
            const chartId = container.id;
            const chart = this.chartsService.charts.get(`${chartId}-chart`) || 
                          this.chartsService.charts.get(`${chartId}-price-chart`) ||
                          this.chartsService.charts.get(`${chartId}-savings-chart`) ||
                          this.chartsService.charts.get(`${chartId}-goal-chart`) ||
                          this.chartsService.charts.get(`${chartId}-category-chart`) ||
                          this.chartsService.charts.get(`${chartId}-trends-chart`) ||
                          this.chartsService.charts.get(`${chartId}-summary-chart`);
                          
            if (chart) {
                chart.resize();
                chart.update();
            }
        });
    }

    // === INTEGRATION WITH EXISTING UI ===
    
    enhanceProductCards() {
        // Add mini price history charts to product cards
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            this.addMiniChartToCard(card);
        });
    }

    addMiniChartToCard(productCard) {
        const productId = productCard.dataset.productId;
        if (!productId) return;

        // Check if chart already exists
        if (productCard.querySelector('.mini-chart')) return;

        // Create mini chart container
        const miniChartContainer = document.createElement('div');
        miniChartContainer.className = 'mini-chart';
        miniChartContainer.innerHTML = `
            <canvas id="mini-chart-${productId}" width="100" height="40"></canvas>
        `;

        // Add to product card
        const productInfo = productCard.querySelector('.product-info');
        if (productInfo) {
            productInfo.appendChild(miniChartContainer);
        }

        // Generate mini price history chart
        const sampleData = this.chartsService.generateSamplePriceData(7);
        this.chartsService.createPriceHistoryChart(`mini-chart-${productId}`, sampleData, {
            chartOptions: {
                plugins: { legend: { display: false } },
                scales: { 
                    x: { display: false },
                    y: { display: false }
                },
                elements: { 
                    point: { radius: 0 }
                }
            }
        });
    }

    // === CLEANUP ===
    
    cleanup() {
        this.chartsService.destroyAllCharts();
    }
}

// Export for use
window.ChartsUI = ChartsUI;
