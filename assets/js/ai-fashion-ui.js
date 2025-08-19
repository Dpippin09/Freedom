/**
 * AI FASHION COMPATIBILITY UI - Patent Interface
 * User interface for the AI Fashion Compatibility Engine
 */

class AIFashionCompatibilityUI {
    constructor() {
        this.aiEngine = null;
        this.userWardrobe = [];
        this.currentAnalysis = null;
        this.isAnalyzing = false;
        
        this.init();
    }

    async init() {
        console.log("🎨 Initializing AI Fashion Compatibility UI...");
        
        // Initialize the AI engine
        this.aiEngine = new AIFashionCompatibilityEngine();
        await this.aiEngine.initialize();
        
        // Setup UI components
        this.createAIInterface();
        this.bindEventListeners();
        this.loadUserWardrobe();
        
        console.log("✅ AI Fashion UI ready for patent demonstration!");
    }

    /**
     * Create the AI interface components
     */
    createAIInterface() {
        // Add AI compatibility section to the page
        const aiSection = document.createElement('section');
        aiSection.className = 'ai-compatibility-section';
        aiSection.innerHTML = `
            <div class="container">
                <div class="ai-header">
                    <h2 class="section-title">
                        <span class="ai-icon">🤖</span>
                        AI Fashion Compatibility Engine
                        <span class="patent-badge">PATENT PENDING</span>
                    </h2>
                    <p class="ai-description">
                        Discover how new items work with your existing wardrobe using our proprietary AI technology
                    </p>
                </div>
                
                <div class="ai-interface">
                    <!-- Wardrobe Analysis Panel -->
                    <div class="wardrobe-panel">
                        <h3>Your Virtual Wardrobe</h3>
                        <div class="wardrobe-grid" id="wardrobe-grid">
                            <!-- Wardrobe items will be populated here -->
                        </div>
                        <button class="add-wardrobe-btn" id="add-wardrobe-btn">
                            📷 Add Items to Wardrobe
                        </button>
                    </div>
                    
                    <!-- Compatibility Analysis Panel -->
                    <div class="compatibility-panel">
                        <h3>Compatibility Analysis</h3>
                        <div class="analysis-container" id="analysis-container">
                            <div class="analysis-prompt">
                                Select a product to see AI compatibility analysis
                            </div>
                        </div>
                    </div>
                    
                    <!-- AI Insights Panel -->
                    <div class="insights-panel">
                        <h3>AI Fashion Insights</h3>
                        <div class="insights-container" id="insights-container">
                            <!-- AI insights will be displayed here -->
                        </div>
                    </div>
                </div>
                
                <!-- AI Demo Controls -->
                <div class="ai-demo-controls">
                    <button class="demo-btn" onclick="aiCompatibilityUI.runCompatibilityDemo()">
                        🚀 Run AI Demo
                    </button>
                    <button class="demo-btn" onclick="aiCompatibilityUI.showPatentInfo()">
                        📋 Patent Information
                    </button>
                    <button class="demo-btn" onclick="aiCompatibilityUI.generateStyleReport()">
                        📊 Generate Style Report
                    </button>
                </div>
            </div>
        `;

        // Insert after the main products section
        const productsSection = document.querySelector('.products-section');
        if (productsSection) {
            productsSection.parentNode.insertBefore(aiSection, productsSection.nextSibling);
        }
    }

    /**
     * Bind event listeners for AI functionality
     */
    bindEventListeners() {
        // Add compatibility analysis to product cards
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            this.enhanceProductCard(card);
        });

        // Wardrobe management
        const addWardrobeBtn = document.getElementById('add-wardrobe-btn');
        if (addWardrobeBtn) {
            addWardrobeBtn.addEventListener('click', () => this.openWardrobeManager());
        }
    }

    /**
     * Enhance existing product cards with AI functionality
     */
    enhanceProductCard(card) {
        // Add AI compatibility button to each product card
        const aiButton = document.createElement('button');
        aiButton.className = 'ai-compatibility-btn';
        aiButton.innerHTML = '🤖 AI Match Analysis';
        aiButton.onclick = () => this.analyzeProductCompatibility(card);

        const productActions = card.querySelector('.product-actions');
        if (productActions) {
            productActions.appendChild(aiButton);
        }
    }

    /**
     * CORE AI FUNCTIONALITY: Analyze product compatibility
     */
    async analyzeProductCompatibility(productCard) {
        if (this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        this.showAnalysisLoading();

        try {
            // Extract product data
            const productData = this.extractProductData(productCard);
            
            // Run AI compatibility analysis
            const compatibilityResults = await this.aiEngine.analyzeStyleCompatibility(
                productData, 
                this.userWardrobe
            );
            
            // Get fit prediction
            const fitPrediction = await this.aiEngine.predictCrossPlatformFit(
                productData,
                await this.getUserMeasurements(),
                this.getUserPurchaseHistory()
            );
            
            // Get trend analysis
            const trendAnalysis = await this.aiEngine.getTrendAwareCompatibility(
                productData,
                await this.getUserStyleProfile(),
                await this.getCurrentTrends()
            );

            // Display comprehensive AI analysis
            this.displayAIAnalysis({
                product: productData,
                compatibility: compatibilityResults,
                fit: fitPrediction,
                trends: trendAnalysis,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('AI Analysis failed:', error);
            this.showAnalysisError(error);
        } finally {
            this.isAnalyzing = false;
        }
    }

    /**
     * Display comprehensive AI analysis results
     */
    displayAIAnalysis(analysis) {
        const container = document.getElementById('analysis-container');
        if (!container) return;

        const { product, compatibility, fit, trends } = analysis;

        container.innerHTML = `
            <div class="ai-analysis-results">
                <div class="analyzed-product">
                    <img src="${product.image}" alt="${product.name}" class="product-thumb">
                    <div class="product-info">
                        <h4>${product.name}</h4>
                        <p class="brand">${product.brand || 'Fashion Item'}</p>
                        <p class="price">${product.price}</p>
                    </div>
                </div>

                <div class="compatibility-score">
                    <div class="score-circle ${this.getScoreClass(compatibility.overallCompatibility)}">
                        <span class="score-number">${Math.round(compatibility.overallCompatibility * 100)}</span>
                        <span class="score-label">Match Score</span>
                    </div>
                    <div class="confidence-indicator">
                        Confidence: ${Math.round(compatibility.confidenceLevel * 100)}%
                    </div>
                </div>

                <div class="analysis-details">
                    <div class="detail-section">
                        <h5>🎨 Style Compatibility</h5>
                        <div class="compatibility-breakdown">
                            ${this.renderCompatibilityBreakdown(compatibility.breakdown)}
                        </div>
                    </div>

                    <div class="detail-section">
                        <h5>📏 Fit Prediction</h5>
                        <div class="fit-analysis">
                            <div class="fit-recommendation">
                                Recommended Size: <strong>${fit.recommendedSize}</strong>
                            </div>
                            <div class="fit-confidence">
                                Fit Confidence: ${Math.round(fit.fitConfidence * 100)}%
                            </div>
                            <div class="fit-breakdown">
                                Perfect Fit: ${Math.round(fit.fitPrediction.perfectFit * 100)}%<br>
                                Too Small Risk: ${Math.round(fit.fitPrediction.tooSmall * 100)}%<br>
                                Too Large Risk: ${Math.round(fit.fitPrediction.tooLarge * 100)}%
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h5>📈 Trend Analysis</h5>
                        <div class="trend-analysis">
                            <div class="trend-score">
                                Trend Relevance: ${Math.round(trends.trendAdjustedCompatibility * 100)}%
                            </div>
                            <div class="future-relevance">
                                Future Appeal: ${Math.round(trends.futureRelevance * 100)}%
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h5>💡 AI Recommendations</h5>
                        <div class="recommendations">
                            ${this.renderRecommendations(compatibility.styleRecommendations)}
                        </div>
                    </div>
                </div>

                <div class="ai-actions">
                    <button class="action-btn primary" onclick="aiCompatibilityUI.addToWishlist('${product.id}')">
                        ❤️ Add to Wishlist
                    </button>
                    <button class="action-btn secondary" onclick="aiCompatibilityUI.findSimilarItems('${product.id}')">
                        🔍 Find Similar
                    </button>
                    <button class="action-btn tertiary" onclick="aiCompatibilityUI.getOutfitSuggestions('${product.id}')">
                        👗 Complete Outfit
                    </button>
                </div>
            </div>
        `;

        // Update insights panel
        this.updateInsightsPanel(analysis);
    }

    /**
     * Run AI compatibility demo
     */
    async runCompatibilityDemo() {
        const demoData = this.createDemoData();
        
        console.log("🚀 Running AI Compatibility Demo...");
        
        // Simulate AI analysis with demo data
        const results = await this.aiEngine.analyzeStyleCompatibility(
            demoData.testItem,
            demoData.sampleWardrobe
        );

        // Display demo results
        this.displayDemoResults(results);
        
        // Show patent innovations
        this.highlightPatentInnovations();
    }

    /**
     * Show patent information
     */
    showPatentInfo() {
        const patentInfo = this.aiEngine.getPatentInfo();
        
        const modal = document.createElement('div');
        modal.className = 'patent-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🏆 Patent Information</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="modal-body">
                    <h4>${patentInfo.title}</h4>
                    <div class="innovations-list">
                        <h5>Key Innovations:</h5>
                        <ul>
                            ${patentInfo.innovations.map(innovation => 
                                `<li>✅ ${innovation}</li>`
                            ).join('')}
                        </ul>
                    </div>
                    <div class="patent-status">
                        <p><strong>Patentability Assessment:</strong> ${patentInfo.patentability}</p>
                        <p><strong>Market Value:</strong> ${patentInfo.marketValue}</p>
                    </div>
                    <div class="technical-details">
                        <h5>Technical Specifications:</h5>
                        <ul>
                            <li>Multi-dimensional style vector analysis (128 dimensions)</li>
                            <li>Cross-platform size translation algorithms</li>
                            <li>Real-time trend integration with social media analysis</li>
                            <li>Personalized learning from user behavior patterns</li>
                            <li>AI-powered wardrobe gap analysis</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Generate comprehensive style report
     */
    async generateStyleReport() {
        const report = await this.aiEngine.analyzeWardrobeGaps(
            this.userWardrobe,
            await this.getUserStyleGoals(),
            await this.getUserBudget()
        );

        this.displayStyleReport(report);
    }

    // =================================
    // UTILITY METHODS
    // =================================

    extractProductData(card) {
        return {
            id: card.dataset.productId || Date.now().toString(),
            name: card.querySelector('h3')?.textContent || 'Fashion Item',
            brand: card.dataset.brand || 'Unknown Brand',
            price: card.querySelector('.price')?.textContent || '$0',
            category: card.dataset.category || 'clothing',
            image: card.querySelector('img')?.src || '',
            description: card.querySelector('.product-description')?.textContent || '',
            colors: this.extractColors(card),
            style: this.extractStyle(card),
            formality: this.extractFormality(card)
        };
    }

    getScoreClass(score) {
        if (score >= 0.8) return 'excellent';
        if (score >= 0.6) return 'good';
        if (score >= 0.4) return 'fair';
        return 'poor';
    }

    renderCompatibilityBreakdown(breakdown) {
        if (!breakdown) return '<p>Analysis in progress...</p>';
        
        return Object.entries(breakdown).map(([factor, score]) => `
            <div class="breakdown-item">
                <span class="factor-name">${this.formatFactorName(factor)}</span>
                <div class="score-bar">
                    <div class="score-fill" style="width: ${score * 100}%"></div>
                </div>
                <span class="score-value">${Math.round(score * 100)}%</span>
            </div>
        `).join('');
    }

    formatFactorName(factor) {
        return factor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    createDemoData() {
        return {
            testItem: {
                id: 'demo-item-1',
                name: 'Designer Summer Dress',
                brand: 'Fashion House',
                category: 'dresses',
                colors: ['blue', 'white'],
                style: 'casual',
                formality: 0.3
            },
            sampleWardrobe: [
                { name: 'White Sneakers', category: 'shoes', style: 'casual' },
                { name: 'Denim Jacket', category: 'outerwear', style: 'casual' },
                { name: 'Gold Necklace', category: 'jewelry', style: 'elegant' }
            ]
        };
    }

    showAnalysisLoading() {
        const container = document.getElementById('analysis-container');
        if (container) {
            container.innerHTML = `
                <div class="analysis-loading">
                    <div class="ai-spinner">🤖</div>
                    <p>AI analyzing compatibility...</p>
                    <div class="loading-steps">
                        <div class="step active">Extracting style vectors</div>
                        <div class="step">Calculating compatibility</div>
                        <div class="step">Analyzing trends</div>
                        <div class="step">Generating insights</div>
                    </div>
                </div>
            `;
        }
    }

    async loadUserWardrobe() {
        // Load user's wardrobe from localStorage or API
        const savedWardrobe = localStorage.getItem('userWardrobe');
        this.userWardrobe = savedWardrobe ? JSON.parse(savedWardrobe) : [];
        this.renderWardrobeGrid();
    }

    renderWardrobeGrid() {
        const grid = document.getElementById('wardrobe-grid');
        if (!grid) return;

        if (this.userWardrobe.length === 0) {
            grid.innerHTML = `
                <div class="empty-wardrobe">
                    <p>👗 Add items to your virtual wardrobe to get AI compatibility analysis</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.userWardrobe.map(item => `
            <div class="wardrobe-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="item-info">
                    <h5>${item.name}</h5>
                    <p>${item.category}</p>
                </div>
            </div>
        `).join('');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if AI compatibility engine is available
    if (window.AIFashionCompatibilityEngine) {
        window.aiCompatibilityUI = new AIFashionCompatibilityUI();
    }
});

// Export for external use
window.AIFashionCompatibilityUI = AIFashionCompatibilityUI;
