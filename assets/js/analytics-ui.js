// Analytics UI Manager
class AnalyticsUI {
    constructor() {
        this.analyticsService = new AnalyticsService();
        this.authService = new AuthService();
        this.chartsUI = null;
        this.currentUser = null;
        this.dashboardData = null;
        this.init();
    }

    async init() {
        // Initialize charts UI if available
        if (window.ChartsUI) {
            this.chartsUI = new ChartsUI();
            await this.chartsUI.init();
        }

        // Check if user is authenticated
        if (this.authService.isAuthenticated()) {
            this.currentUser = this.authService.getUser();
            await this.loadDashboardData();
            this.setupUI();
        }
    }

    async loadDashboardData() {
        try {
            // Try to get cached data first
            const cached = this.analyticsService.getCachedAnalytics('dashboard');
            if (cached) {
                this.dashboardData = cached;
                this.updateDashboardUI();
            }

            // Load fresh data
            const result = await this.analyticsService.getDashboard();
            if (result.success) {
                this.dashboardData = result.dashboard;
                this.analyticsService.cacheAnalytics(this.dashboardData, 'dashboard');
                this.updateDashboardUI();
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    setupUI() {
        this.addAnalyticsButton();
        this.updateExistingUI();
    }

    addAnalyticsButton() {
        // Add analytics button to navigation if not exists
        const nav = document.querySelector('.nav-links');
        if (!nav || nav.querySelector('.analytics-btn')) return;

        const analyticsBtn = document.createElement('li');
        analyticsBtn.innerHTML = `
            <a href="#" class="analytics-btn" title="Analytics Dashboard">
                📊 Analytics
            </a>
        `;

        // Insert before contact link
        const contactLink = nav.querySelector('a[href="contact.html"]')?.parentElement;
        if (contactLink) {
            nav.insertBefore(analyticsBtn, contactLink);
        } else {
            nav.appendChild(analyticsBtn);
        }

        analyticsBtn.querySelector('.analytics-btn').onclick = (e) => {
            e.preventDefault();
            this.showAnalyticsDashboard();
        };
    }

    updateExistingUI() {
        // Add analytics insights to existing profile modal if available
        this.enhanceProfileModal();
    }

    enhanceProfileModal() {
        // This will be called when the profile modal is shown
        // We'll integrate with the existing auth-ui.js
    }

    async showAnalyticsDashboard() {
        if (!this.currentUser) {
            alert('Please log in to view analytics');
            return;
        }

        await this.loadDashboardData();

        const modal = this.createModal('Analytics Dashboard', `
            <div class="analytics-dashboard">
                <div class="dashboard-header">
                    <div class="user-score-card">
                        <div class="score-circle" id="scoreCircle">
                            <span class="score-value" id="scoreValue">-</span>
                            <span class="score-label">Shopping Score</span>
                        </div>
                        <div class="level-info" id="levelInfo">
                            <span class="level-icon">🌱</span>
                            <span class="level-name">Loading...</span>
                        </div>
                    </div>
                </div>

                <div class="dashboard-tabs">
                    <button class="tab-btn active" data-tab="overview">Overview</button>
                    <button class="tab-btn" data-tab="savings">Savings</button>
                    <button class="tab-btn" data-tab="trends">Market Trends</button>
                    <button class="tab-btn" data-tab="goals">Goals</button>
                </div>

                <div class="dashboard-content">
                    <div class="tab-content active" id="overview-tab">
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-icon">💰</div>
                                <div class="stat-info">
                                    <div class="stat-value" id="totalSavings">$0.00</div>
                                    <div class="stat-label">Total Savings</div>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">🔔</div>
                                <div class="stat-info">
                                    <div class="stat-value" id="activeAlerts">0</div>
                                    <div class="stat-label">Active Alerts</div>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">🎯</div>
                                <div class="stat-info">
                                    <div class="stat-value" id="alertEffectiveness">0%</div>
                                    <div class="stat-label">Alert Success Rate</div>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">📊</div>
                                <div class="stat-info">
                                    <div class="stat-value" id="avgSavings">$0.00</div>
                                    <div class="stat-label">Avg Savings/Alert</div>
                                </div>
                            </div>
                        </div>

                        <div class="insights-section">
                            <h3>📈 Recent Insights</h3>
                            <div class="insights-list" id="insightsList">
                                <div class="loading">Loading insights...</div>
                            </div>
                        </div>

                        <div class="achievements-section">
                            <h3>🏆 Achievements</h3>
                            <div class="achievements-grid" id="achievementsGrid">
                                <div class="loading">Loading achievements...</div>
                            </div>
                        </div>
                    </div>

                    <div class="tab-content" id="savings-tab">
                        <div class="savings-overview">
                            <div class="chart-container">
                                <canvas id="savingsChart"></canvas>
                            </div>
                            <div class="savings-breakdown">
                                <h4>Savings Breakdown</h4>
                                <div id="savingsBreakdown">Loading...</div>
                            </div>
                        </div>
                    </div>

                    <div class="tab-content" id="trends-tab">
                        <div class="trends-overview">
                            <div class="market-insights" id="marketInsights">
                                <div class="loading">Loading market trends...</div>
                            </div>
                        </div>
                    </div>

                    <div class="tab-content" id="goals-tab">
                        <div class="goals-section">
                            <h3>🎯 Monthly Goals</h3>
                            <div class="goals-form">
                                <div class="goal-input-group">
                                    <label for="savingsGoal">Savings Target ($)</label>
                                    <input type="number" id="savingsGoal" placeholder="Enter target amount">
                                </div>
                                <div class="goal-input-group">
                                    <label for="alertsGoal">Alerts Target</label>
                                    <input type="number" id="alertsGoal" placeholder="Number of alerts">
                                </div>
                                <button id="saveGoalsBtn" class="btn-primary">Save Goals</button>
                            </div>
                            <div class="goals-progress" id="goalsProgress">
                                <div class="loading">Loading goals...</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-actions">
                    <button id="generateReportBtn" class="btn-secondary">📄 Generate Report</button>
                    <button id="exportDataBtn" class="btn-secondary">📤 Export Data</button>
                    <button id="refreshDataBtn" class="btn-secondary">🔄 Refresh</button>
                </div>
            </div>
        `);

        this.setupDashboardEvents();
        this.updateDashboardUI();
    }

    setupDashboardEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => this.switchTab(btn.dataset.tab);
        });

        // Goals form
        document.getElementById('saveGoalsBtn').onclick = () => this.saveGoals();

        // Action buttons
        document.getElementById('generateReportBtn').onclick = () => this.showReportModal();
        document.getElementById('exportDataBtn').onclick = () => this.exportData();
        document.getElementById('refreshDataBtn').onclick = () => this.refreshDashboard();
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        switch (tabName) {
            case 'savings':
                await this.loadSavingsData();
                break;
            case 'trends':
                await this.loadTrendsData();
                break;
            case 'goals':
                await this.loadGoalsData();
                break;
        }
    }

    updateDashboardUI() {
        if (!this.dashboardData) return;

        const { userStats, achievements, goals } = this.dashboardData;

        // Update overview stats
        document.getElementById('totalSavings').textContent = `$${userStats.totalSavings.toFixed(2)}`;
        document.getElementById('activeAlerts').textContent = userStats.alertsActive;
        document.getElementById('avgSavings').textContent = `$${userStats.averageSavings.toFixed(2)}`;

        // Calculate and update effectiveness
        const totalAlerts = userStats.alertsActive + userStats.alertsTriggered;
        const effectiveness = totalAlerts > 0 ? (userStats.alertsTriggered / totalAlerts * 100).toFixed(1) : 0;
        document.getElementById('alertEffectiveness').textContent = `${effectiveness}%`;

        // Update shopping score
        this.updateShoppingScore();

        // Update insights
        this.updateInsights();

        // Update achievements
        this.updateAchievements(achievements);

        // Update goals
        this.updateGoalsDisplay(goals);

        // Initialize charts if available
        if (this.chartsUI) {
            setTimeout(() => {
                this.chartsUI.enhanceAnalyticsDashboard();
            }, 300); // Wait for DOM elements to be ready
        }
    }

    updateShoppingScore() {
        if (!this.dashboardData) return;

        const userAnalytics = {
            totalSavings: this.dashboardData.userStats.totalSavings,
            alertsCreated: this.dashboardData.userStats.alertsActive + this.dashboardData.userStats.alertsTriggered,
            alertsTriggered: this.dashboardData.userStats.alertsTriggered,
            averageSavingsPerAlert: this.dashboardData.userStats.averageSavings
        };

        const scoreData = this.analyticsService.calculateShoppingScore(userAnalytics);
        
        document.getElementById('scoreValue').textContent = scoreData.percentage;
        document.getElementById('levelInfo').innerHTML = `
            <span class="level-icon">${scoreData.level.icon}</span>
            <span class="level-name">${scoreData.level.name}</span>
        `;

        // Update score circle color
        const scoreCircle = document.getElementById('scoreCircle');
        scoreCircle.style.setProperty('--score-color', scoreData.level.color);
        scoreCircle.style.setProperty('--score-percentage', `${scoreData.percentage}%`);
    }

    updateInsights() {
        if (!this.dashboardData) return;

        const insights = this.analyticsService.generateInsights({
            totalSavings: this.dashboardData.userStats.totalSavings,
            alertsCreated: this.dashboardData.userStats.alertsActive + this.dashboardData.userStats.alertsTriggered,
            alertsTriggered: this.dashboardData.userStats.alertsTriggered,
            averageSavingsPerAlert: this.dashboardData.userStats.averageSavings,
            monthlyGoals: this.dashboardData.goals
        });

        const insightsList = document.getElementById('insightsList');
        if (insights.length === 0) {
            insightsList.innerHTML = '<div class="no-insights">No insights available yet. Start setting price alerts to see insights!</div>';
            return;
        }

        insightsList.innerHTML = insights.map(insight => `
            <div class="insight-item ${insight.trend}">
                <div class="insight-icon">${insight.icon}</div>
                <div class="insight-content">
                    <div class="insight-title">${insight.title}</div>
                    <div class="insight-value">${insight.value}</div>
                    <div class="insight-description">${insight.description}</div>
                </div>
                <div class="insight-trend ${insight.trend}">
                    ${insight.trend === 'up' ? '📈' : insight.trend === 'down' ? '📉' : '➡️'}
                </div>
            </div>
        `).join('');
    }

    updateAchievements(achievements) {
        const achievementsGrid = document.getElementById('achievementsGrid');
        
        if (!achievements || achievements.length === 0) {
            achievementsGrid.innerHTML = '<div class="no-achievements">Complete actions to unlock achievements!</div>';
            return;
        }

        achievementsGrid.innerHTML = achievements.map(achievement => `
            <div class="achievement-item unlocked">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-title">${achievement.title}</div>
                    <div class="achievement-description">${achievement.description}</div>
                    <div class="achievement-date">Unlocked: ${new Date(achievement.unlockedAt).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');
    }

    updateGoalsDisplay(goals) {
        if (!goals) return;

        document.getElementById('savingsGoal').value = goals.savingsTarget || '';
        document.getElementById('alertsGoal').value = goals.alertTarget || '';

        const goalsProgress = document.getElementById('goalsProgress');
        
        if (goals.savingsTarget > 0 || goals.alertTarget > 0) {
            const savingsProgress = goals.savingsTarget > 0 ? (goals.currentSavings / goals.savingsTarget * 100) : 0;
            const alertsProgress = goals.alertTarget > 0 ? (goals.currentAlerts / goals.alertTarget * 100) : 0;

            goalsProgress.innerHTML = `
                <div class="goal-progress-item">
                    <div class="goal-label">Savings Progress</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(savingsProgress, 100)}%"></div>
                    </div>
                    <div class="goal-text">$${goals.currentSavings.toFixed(2)} / $${goals.savingsTarget.toFixed(2)}</div>
                </div>
                <div class="goal-progress-item">
                    <div class="goal-label">Alerts Progress</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(alertsProgress, 100)}%"></div>
                    </div>
                    <div class="goal-text">${goals.currentAlerts} / ${goals.alertTarget} alerts</div>
                </div>
            `;
        } else {
            goalsProgress.innerHTML = '<div class="no-goals">Set your monthly goals to track progress!</div>';
        }
    }

    async saveGoals() {
        const savingsTarget = parseFloat(document.getElementById('savingsGoal').value);
        const alertTarget = parseInt(document.getElementById('alertsGoal').value);

        if (!savingsTarget || !alertTarget) {
            alert('Please enter both savings and alert targets');
            return;
        }

        try {
            const result = await this.analyticsService.setGoals(savingsTarget, alertTarget);
            if (result.success) {
                this.showSuccessMessage('Goals updated successfully!');
                await this.loadDashboardData(); // Refresh data
            } else {
                this.showErrorMessage(result.message || 'Failed to update goals');
            }
        } catch (error) {
            console.error('Save goals error:', error);
            this.showErrorMessage('Failed to update goals. Please try again.');
        }
    }

    async showReportModal() {
        const reportModal = this.createModal('Analytics Report', `
            <div class="report-generator">
                <div class="report-options">
                    <h4>Generate Report</h4>
                    <div class="option-group">
                        <label>Report Period:</label>
                        <select id="reportPeriod">
                            <option value="weekly">Weekly</option>
                            <option value="monthly" selected>Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                    <button id="generateBtn" class="btn-primary">Generate Report</button>
                </div>
                <div class="report-content" id="reportContent">
                    <div class="report-placeholder">Select a period and click generate to create your report.</div>
                </div>
            </div>
        `);

        document.getElementById('generateBtn').onclick = async () => {
            const period = document.getElementById('reportPeriod').value;
            await this.generateReport(period);
        };
    }

    async generateReport(period) {
        const reportContent = document.getElementById('reportContent');
        reportContent.innerHTML = '<div class="loading">Generating report...</div>';

        try {
            const result = await this.analyticsService.generateReport(period);
            if (result.success) {
                this.displayReport(result.report);
            } else {
                reportContent.innerHTML = '<div class="error">Failed to generate report</div>';
            }
        } catch (error) {
            console.error('Generate report error:', error);
            reportContent.innerHTML = '<div class="error">Failed to generate report</div>';
        }
    }

    displayReport(report) {
        const reportContent = document.getElementById('reportContent');
        
        reportContent.innerHTML = `
            <div class="report-header">
                <h3>${report.period.charAt(0).toUpperCase() + report.period.slice(1)} Report</h3>
                <p class="report-period">${new Date(report.startDate).toLocaleDateString()} - ${new Date(report.endDate).toLocaleDateString()}</p>
            </div>
            
            <div class="report-summary">
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-label">Total Savings</div>
                        <div class="summary-value">$${report.summary.totalSavings.toFixed(2)}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Alerts Triggered</div>
                        <div class="summary-value">${report.summary.alertsTriggered}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Average Savings</div>
                        <div class="summary-value">$${report.summary.averageSavingsPerAlert.toFixed(2)}</div>
                    </div>
                </div>
            </div>
            
            ${report.summary.bestDeal ? `
                <div class="best-deal">
                    <h4>🏆 Best Deal</h4>
                    <p>Saved $${report.summary.bestDeal.savings.toFixed(2)} on ${report.summary.bestDeal.productId}</p>
                </div>
            ` : ''}
            
            <div class="report-actions">
                <button onclick="window.print()" class="btn-secondary">🖨️ Print Report</button>
                <button onclick="this.exportReport('${report.period}')" class="btn-secondary">📤 Export PDF</button>
            </div>
        `;
    }

    async refreshDashboard() {
        // Clear cache and reload
        this.analyticsService.clearCache();
        document.querySelector('.dashboard-content').innerHTML = '<div class="loading">Refreshing...</div>';
        await this.loadDashboardData();
        this.showSuccessMessage('Dashboard refreshed!');
    }

    exportData() {
        if (!this.dashboardData) return;

        const data = {
            exportDate: new Date().toISOString(),
            userStats: this.dashboardData.userStats,
            goals: this.dashboardData.goals,
            achievements: this.dashboardData.achievements
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showSuccessMessage('Data exported successfully!');
    }

    // Utility methods
    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'analytics-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.close-modal').onclick = () => this.closeModal();
        modal.onclick = (e) => {
            if (e.target === modal) this.closeModal();
        };

        return modal;
    }

    closeModal() {
        const modal = document.querySelector('.analytics-modal');
        if (modal) modal.remove();
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1001;
            max-width: 300px;
            ${type === 'success' ? 'background: #4CAF50;' : 'background: #f44336;'}
        `;

        document.body.appendChild(messageEl);
        setTimeout(() => messageEl.remove(), 4000);
    }
}

// Export for use in other modules
window.AnalyticsUI = AnalyticsUI;
