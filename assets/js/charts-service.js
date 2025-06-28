// Charts Service - Data Visualization Manager
class ChartsService {
    constructor() {
        this.charts = new Map(); // Store chart instances
        this.defaultColors = {
            primary: '#667eea',
            secondary: '#764ba2', 
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#3b82f6',
            gradients: {
                purple: ['#667eea', '#764ba2'],
                green: ['#10b981', '#059669'],
                blue: ['#3b82f6', '#1d4ed8'],
                orange: ['#f59e0b', '#d97706']
            }
        };
    }

    // === UTILITY METHODS ===
    
    createGradient(ctx, colors, direction = 'vertical') {
        const gradient = direction === 'vertical' 
            ? ctx.createLinearGradient(0, 0, 0, 400)
            : ctx.createLinearGradient(0, 0, 400, 0);
            
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
        return gradient;
    }

    destroyChart(chartId) {
        if (this.charts.has(chartId)) {
            this.charts.get(chartId).destroy();
            this.charts.delete(chartId);
        }
    }

    getOrCreateCanvas(containerId, chartId, width = 400, height = 200) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return null;
        }

        // Destroy existing chart if it exists
        this.destroyChart(chartId);

        // Remove existing canvas if it exists
        const existingCanvas = container.querySelector('canvas');
        if (existingCanvas) {
            existingCanvas.remove();
        }

        // Create new canvas
        const canvas = document.createElement('canvas');
        canvas.id = chartId;
        canvas.width = width;
        canvas.height = height;
        container.appendChild(canvas);

        return canvas;
    }

    // === PRICE HISTORY CHART ===
    
    createPriceHistoryChart(containerId, priceData, options = {}) {
        const chartId = `${containerId}-price-chart`;
        const canvas = this.getOrCreateCanvas(containerId, chartId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        
        // Prepare data
        const labels = priceData.map(item => 
            new Date(item.timestamp).toLocaleDateString()
        );
        const prices = priceData.map(item => item.price);
        
        // Create gradient
        const gradient = this.createGradient(ctx, this.defaultColors.gradients.blue);

        const config = {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: options.label || 'Price',
                    data: prices,
                    borderColor: this.defaultColors.primary,
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: this.defaultColors.primary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: this.defaultColors.primary,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `$${context.raw.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                ...options.chartOptions
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(chartId, chart);
        return chart;
    }

    // === SAVINGS TREND CHART ===
    
    createSavingsTrendChart(containerId, savingsData, options = {}) {
        const chartId = `${containerId}-savings-chart`;
        const canvas = this.getOrCreateCanvas(containerId, chartId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        
        // Prepare data
        const labels = savingsData.map(item => 
            new Date(item.date).toLocaleDateString()
        );
        const savings = savingsData.map(item => item.amount);
        
        // Create gradient
        const gradient = this.createGradient(ctx, this.defaultColors.gradients.green);

        const config = {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Savings',
                    data: savings,
                    backgroundColor: gradient,
                    borderColor: this.defaultColors.success,
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: this.defaultColors.success,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `Saved: $${context.raw.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                ...options.chartOptions
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(chartId, chart);
        return chart;
    }

    // === GOAL PROGRESS CHART (DOUGHNUT) ===
    
    createGoalProgressChart(containerId, progressData, options = {}) {
        const chartId = `${containerId}-goal-chart`;
        const canvas = this.getOrCreateCanvas(containerId, chartId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        
        const completed = progressData.current || 0;
        const remaining = Math.max(0, (progressData.target || 100) - completed);
        const percentage = progressData.target ? (completed / progressData.target * 100) : 0;

        const config = {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Remaining'],
                datasets: [{
                    data: [completed, remaining],
                    backgroundColor: [
                        this.defaultColors.success,
                        'rgba(0, 0, 0, 0.1)'
                    ],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        callbacks: {
                            label: function(context) {
                                const label = context.label;
                                const value = context.raw;
                                if (label === 'Completed') {
                                    return `${progressData.type === 'savings' ? '$' : ''}${value}${progressData.type === 'savings' ? '' : ' alerts'}`;
                                }
                                return `Remaining: ${progressData.type === 'savings' ? '$' : ''}${value}${progressData.type === 'savings' ? '' : ' alerts'}`;
                            }
                        }
                    }
                },
                ...options.chartOptions
            },
            plugins: [{
                id: 'centerText',
                beforeDraw: function(chart) {
                    const width = chart.width;
                    const height = chart.height;
                    const ctx = chart.ctx;
                    
                    ctx.restore();
                    const fontSize = (height / 114).toFixed(2);
                    ctx.font = `bold ${fontSize}em sans-serif`;
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = options.centerTextColor || '#333333';
                    
                    const text = Math.round(percentage) + '%';
                    const textX = Math.round((width - ctx.measureText(text).width) / 2);
                    const textY = height / 2;
                    
                    ctx.fillText(text, textX, textY);
                    ctx.save();
                }
            }]
        };

        const chart = new Chart(ctx, config);
        this.charts.set(chartId, chart);
        return chart;
    }

    // === CATEGORY DISTRIBUTION CHART ===
    
    createCategoryChart(containerId, categoryData, options = {}) {
        const chartId = `${containerId}-category-chart`;
        const canvas = this.getOrCreateCanvas(containerId, chartId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        
        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);
        const colors = [
            this.defaultColors.primary,
            this.defaultColors.secondary,
            this.defaultColors.success,
            this.defaultColors.warning,
            this.defaultColors.info,
            this.defaultColors.danger
        ];

        const config = {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        callbacks: {
                            label: function(context) {
                                const label = context.label;
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                ...options.chartOptions
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(chartId, chart);
        return chart;
    }

    // === MARKET TRENDS CHART ===
    
    createMarketTrendsChart(containerId, trendsData, options = {}) {
        const chartId = `${containerId}-trends-chart`;
        const canvas = this.getOrCreateCanvas(containerId, chartId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        
        // Prepare multiple datasets for different categories or metrics
        const datasets = trendsData.map((trend, index) => {
            const colors = Object.values(this.defaultColors.gradients);
            const colorSet = colors[index % colors.length];
            
            return {
                label: trend.label,
                data: trend.data,
                borderColor: colorSet[0],
                backgroundColor: this.createGradient(ctx, colorSet),
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                pointBackgroundColor: colorSet[0],
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5
            };
        });

        const config = {
            type: 'line',
            data: {
                labels: trendsData[0]?.labels || [],
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                ...options.chartOptions
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(chartId, chart);
        return chart;
    }

    // === ANALYTICS SUMMARY CHART ===
    
    createAnalyticsSummaryChart(containerId, summaryData, options = {}) {
        const chartId = `${containerId}-summary-chart`;
        const canvas = this.getOrCreateCanvas(containerId, chartId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        
        const config = {
            type: 'radar',
            data: {
                labels: summaryData.labels,
                datasets: [{
                    label: 'Your Performance',
                    data: summaryData.values,
                    borderColor: this.defaultColors.primary,
                    backgroundColor: this.defaultColors.primary + '20',
                    borderWidth: 2,
                    pointBackgroundColor: this.defaultColors.primary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                ...options.chartOptions
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(chartId, chart);
        return chart;
    }

    // === CLEANUP ===
    
    destroyAllCharts() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }

    // === HELPER METHODS ===
    
    generateSamplePriceData(days = 30) {
        const data = [];
        const now = new Date();
        const basePrice = 50 + Math.random() * 100;
        
        for (let i = days; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const variance = (Math.random() - 0.5) * 20;
            const price = Math.max(10, basePrice + variance);
            
            data.push({
                timestamp: date.toISOString(),
                price: price
            });
        }
        
        return data;
    }

    generateSampleSavingsData(weeks = 12) {
        const data = [];
        const now = new Date();
        
        for (let i = weeks; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            const savings = Math.random() * 50;
            
            data.push({
                date: date.toISOString(),
                amount: savings
            });
        }
        
        return data;
    }
}

// Export for use
window.ChartsService = ChartsService;
