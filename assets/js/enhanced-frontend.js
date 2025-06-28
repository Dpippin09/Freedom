// Enhanced frontend functionality with API integration
document.addEventListener('DOMContentLoaded', async function() {
    
    // Check if API is available
    try {
        await window.API.healthCheck();
        console.log('✅ API connection successful');
        
        // Initialize scraping service
        await initializeScrapingService();
    } catch (error) {
        console.warn('⚠️ API not available, using static data');
        return; // Fall back to existing functionality
    }

    // Global state
    let currentProducts = [];
    let currentFilters = {
        category: 'all',
        search: '',
        sortBy: 'relevance'
    };
    let scrapingService = null;
    let isScrapingInProgress = false;

    // DOM elements
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const productsContainer = document.querySelector('.products-container');
    const sectionTitle = document.querySelector('.section-title');

    // Load and display products
    async function loadProducts(filters = {}) {
        try {
            showLoading(true);
            const response = await window.API.getProducts(filters);
            currentProducts = response.products;
            displayProducts(response.products);
            updateSectionTitle(response);
            currentFilters = { ...currentFilters, ...filters };
        } catch (error) {
            console.error('Error loading products:', error);
            showError('Failed to load products. Please try again.');
        } finally {
            showLoading(false);
        }
    }

    // Display products in the grid
    function displayProducts(products) {
        if (!productsContainer) return;

        productsContainer.innerHTML = '';

        if (products.length === 0) {
            showNoResults();
            return;
        }

        products.forEach(product => {
            const productCard = createProductCard(product);
            productsContainer.appendChild(productCard);
        });
    }

    // Create product card HTML
    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-category', product.category);
        card.setAttribute('data-product-id', product.id);

        const savings = Math.round(((product.price.original - product.price.current) / product.price.original) * 100);
        const storeCount = product.stores ? product.stores.length : 0;

        card.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" loading="lazy">
                <div class="product-badge">${product.badge}</div>
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-features">
                    ${product.features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
                </div>
                <div class="product-stats">
                    <div class="stat">
                        <span class="stat-number">$${product.price.current}</span>
                        <span class="stat-label">Best Price</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${savings}%</span>
                        <span class="stat-label">Savings</span>
                    </div>
                </div>
                <div class="product-rating">
                    <span class="stars">${'⭐'.repeat(Math.floor(product.rating))}</span>
                    <span class="rating-text">${product.rating}/5 (${product.reviews} reviews)</span>
                </div>
                <div class="price-comparison">
                    <span class="store-count">${storeCount} stores compared</span>
                </div>
                <button class="product-button" onclick="viewPriceComparison(${product.id})">
                    Compare ${storeCount} Prices
                </button>
            </div>
        `;

        // Enhance product card with scraping features
        enhanceProductCard(card, product);

        return card;
    }

    // Update section title based on results
    function updateSectionTitle(response) {
        if (!sectionTitle) return;

        const { count, filters } = response;
        let title = '';

        if (filters.search) {
            title = `Search Results for "${filters.search}" (${count} found)`;
        } else if (filters.category !== 'all') {
            const categoryName = filters.category.charAt(0).toUpperCase() + filters.category.slice(1);
            title = `${categoryName} (${count} items)`;
        } else {
            title = 'Trending Searches & Best Deals';
        }

        sectionTitle.textContent = title;
    }

    // Show loading state
    function showLoading(show) {
        if (!productsContainer) return;
        
        if (show) {
            productsContainer.innerHTML = `
                <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">🔍</div>
                    <h3>Finding the best deals...</h3>
                    <p>Comparing prices across retailers</p>
                </div>
            `;
        }
    }

    // Show error message
    function showError(message) {
        if (!productsContainer) return;
        
        productsContainer.innerHTML = `
            <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #e74c3c;">
                <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                <h3>Oops! Something went wrong</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="
                    background: #764ba2; color: white; border: none; 
                    padding: 0.75rem 1.5rem; border-radius: 8px; 
                    cursor: pointer; margin-top: 1rem;
                ">Try Again</button>
            </div>
        `;
    }

    // Show no results message
    function showNoResults() {
        if (!productsContainer) return;
        
        productsContainer.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <div style="font-size: 2rem; margin-bottom: 1rem;">😔</div>
                <h3>No products found</h3>
                <p>Try adjusting your search or browse our categories</p>
                <button onclick="clearAllFilters()" style="
                    background: #764ba2; color: white; border: none; 
                    padding: 0.75rem 1.5rem; border-radius: 8px; 
                    cursor: pointer; margin-top: 1rem;
                ">Show All Products</button>
            </div>
        `;
    }

    // Search functionality
    async function performSearch() {
        const query = searchInput ? searchInput.value.trim() : '';
        await loadProducts({ 
            search: query, 
            category: currentFilters.category 
        });
    }

    // Clear all filters
    window.clearAllFilters = async function() {
        if (searchInput) searchInput.value = '';
        
        // Reset active filter tab
        filterTabs.forEach(tab => tab.classList.remove('active'));
        const allTab = document.querySelector('[data-filter="all"]');
        if (allTab) allTab.classList.add('active');
        
        await loadProducts({ category: 'all', search: '' });
    };

    // Price comparison modal
    window.viewPriceComparison = async function(productId) {
        try {
            const response = await window.API.getPriceComparison(productId);
            showPriceComparisonModal(response);
        } catch (error) {
            console.error('Error loading price comparison:', error);
            alert('Failed to load price comparison. Please try again.');
        }
    };

    // Initialize scraping service
    async function initializeScrapingService() {
        try {
            if (typeof ScrapingService !== 'undefined') {
                scrapingService = new ScrapingService();
                const status = await scrapingService.getScrapingStatus();
                console.log('✅ Scraping service initialized:', status);
                
                // Add scraping controls to the UI
                addScrapingControls();
            }
        } catch (error) {
            console.warn('⚠️ Scraping service not available:', error);
        }
    }

    // Add scraping controls to the UI
    function addScrapingControls() {
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer && !document.querySelector('.scraping-controls')) {
            const scrapingControls = document.createElement('div');
            scrapingControls.className = 'scraping-controls';
            scrapingControls.innerHTML = `
                <div class="scraping-status">
                    <span id="scrapingStatus">Ready to scrape prices</span>
                    <button id="refreshPricesBtn" class="scraping-btn">
                        🔄 Refresh All Prices
                    </button>
                </div>
            `;
            
            searchContainer.appendChild(scrapingControls);
            
            // Add event listeners
            document.getElementById('refreshPricesBtn').addEventListener('click', refreshAllPrices);
        }
    }

    // Refresh all prices
    async function refreshAllPrices() {
        if (isScrapingInProgress) {
            alert('Scraping is already in progress. Please wait...');
            return;
        }

        isScrapingInProgress = true;
        const statusEl = document.getElementById('scrapingStatus');
        const btnEl = document.getElementById('refreshPricesBtn');
        
        statusEl.textContent = 'Scraping prices...';
        btnEl.disabled = true;
        btnEl.textContent = '⏳ Scraping...';

        try {
            const result = await scrapingService.scrapeAllProducts();
            if (result.success) {
                statusEl.textContent = 'Price scraping started successfully!';
                
                // Reload products to show updated prices
                setTimeout(() => {
                    loadProducts(currentFilters);
                }, 3000);
            } else {
                statusEl.textContent = 'Failed to start price scraping';
            }
        } catch (error) {
            console.error('Error scraping prices:', error);
            statusEl.textContent = 'Error occurred while scraping prices';
        } finally {
            isScrapingInProgress = false;
            btnEl.disabled = false;
            btnEl.textContent = '🔄 Refresh All Prices';
            
            setTimeout(() => {
                statusEl.textContent = 'Ready to scrape prices';
            }, 5000);
        }
    }

    // Enhanced product rendering with scraping features
    function enhanceProductCard(productCard, product) {
        // Add individual product scraping button
        const priceSection = productCard.querySelector('.price-section');
        if (priceSection && product.retailerUrls) {
            const scrapeBtn = document.createElement('button');
            scrapeBtn.className = 'scrape-product-btn';
            scrapeBtn.innerHTML = '🔍 Check Prices';
            scrapeBtn.onclick = () => scrapeIndividualProduct(product.id);
            priceSection.appendChild(scrapeBtn);
        }

        // Add last scraped info if available
        if (scrapingService) {
            scrapingService.getLastScrapedInfo(product.id)
                .then(info => {
                    if (info && info.timestamp) {
                        const lastScraped = new Date(info.timestamp);
                        const timeAgo = getTimeAgo(lastScraped);
                        
                        const scrapedInfo = document.createElement('div');
                        scrapedInfo.className = 'last-scraped';
                        scrapedInfo.innerHTML = `
                            <small>Prices updated ${timeAgo}</small>
                        `;
                        priceSection.appendChild(scrapedInfo);
                    }
                })
                .catch(error => console.warn('Could not get last scraped info:', error));
        }
    }

    // Scrape individual product
    async function scrapeIndividualProduct(productId) {
        try {
            const result = await scrapingService.scrapeProduct(productId);
            if (result.success && result.results.retailers.length > 0) {
                showPriceComparisonModal(result.results);
            } else {
                alert('No current prices found for this product. Please try again later.');
            }
        } catch (error) {
            console.error('Error scraping product:', error);
            alert('Error occurred while checking prices.');
        }
    }

    // Show price comparison modal
    function showPriceComparisonModal(priceData) {
        const modal = document.createElement('div');
        modal.className = 'price-comparison-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Live Price Comparison</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="price-summary">
                        <div class="summary-item">
                            <span>Lowest Price:</span>
                            <strong>$${priceData.summary.lowestPrice || 'N/A'}</strong>
                        </div>
                        <div class="summary-item">
                            <span>Average Price:</span>
                            <strong>$${priceData.summary.averagePrice || 'N/A'}</strong>
                        </div>
                        <div class="summary-item">
                            <span>Retailers Found:</span>
                            <strong>${priceData.summary.retailerCount}</strong>
                        </div>
                    </div>
                    <div class="retailer-prices">
                        ${priceData.retailers.map(retailer => `
                            <div class="retailer-price">
                                <div class="retailer-name">${retailer.retailer}</div>
                                <div class="retailer-price-value">$${retailer.price || 'N/A'}</div>
                                <div class="retailer-availability">${retailer.availability}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="modal-footer">
                        <small>Scraped: ${new Date(priceData.timestamp).toLocaleString()}</small>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal functionality
        modal.querySelector('.close-modal').onclick = () => {
            document.body.removeChild(modal);
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
    }

    // Utility function for time ago
    function getTimeAgo(date) {
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'just now';
        if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} hours ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} days ago`;
    }

    // Event listeners
    if (searchInput) {
        searchInput.addEventListener('input', debounce(performSearch, 300));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }

    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }

    // Filter tabs
    filterTabs.forEach(tab => {
        tab.addEventListener('click', async function() {
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.dataset.filter;
            await loadProducts({ 
                category, 
                search: searchInput ? searchInput.value.trim() : '' 
            });
        });
    });

    // Utility function for debouncing
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Initial load
    await loadProducts();
    await initializeScrapingService();

    console.log('🎉 Snatched It frontend connected to API successfully!');
});

// Navigation functionality (keeping existing)
document.addEventListener('DOMContentLoaded', function() {
    const nav = document.querySelector('nav');
    if (nav) {
        window.addEventListener('scroll', function() {
            if (window.scrollY === 0) {
                nav.style.top = '0';
            } else {
                nav.style.top = '-170px';
            }
        });

        document.addEventListener('mousemove', function(event) {
            if (event.clientY < 50) {
                nav.style.top = '0';
            }
        });
    }

    // Smooth scrolling for navigation links
    const links = document.querySelectorAll('a[href^="#"]');
    for (const link of links) {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    }

    // Contact form handling
    const form = document.getElementById('contact-form');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            const formData = new FormData(form);
            // Handle form submission
            alert('Message sent! We\'ll get back to you soon.');
            form.reset();
        });
    }

    // Scraping Dashboard Functions
    async function initializeScrapingDashboard() {
        try {
            // Add scraping controls to the page
            addScrapingControls();
            
            // Load scraping status
            await updateScrapingStatus();
            
            // Set up periodic status updates
            setInterval(updateScrapingStatus, 30000); // Update every 30 seconds
        } catch (error) {
            console.error('Error initializing scraping dashboard:', error);
        }
    }

    function addScrapingControls() {
        // Create scraping dashboard HTML
        const scrapingDashboard = document.createElement('div');
        scrapingDashboard.id = 'scraping-dashboard';
        scrapingDashboard.innerHTML = `
            <div class="scraping-controls" style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 8px; border: 1px solid #dee2e6;">
                <h4 style="margin: 0 0 15px 0; color: #333;">🔍 Price Scraping Dashboard</h4>
                
                <div class="scraping-status" style="margin-bottom: 15px;">
                    <span id="scraping-status-indicator" style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #28a745; margin-right: 8px;"></span>
                    <span id="scraping-status-text">Checking status...</span>
                </div>
                
                <div class="scraping-buttons" style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="scrape-all-btn" class="btn btn-primary" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        🔄 Scrape All Products
                    </button>
                    <button id="start-schedule-btn" class="btn btn-success" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        ⏰ Start Scheduled Scraping
                    </button>
                    <button id="stop-schedule-btn" class="btn btn-warning" style="background: #ffc107; color: #212529; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        ⏹️ Stop Scheduled Scraping
                    </button>
                    <button id="view-history-btn" class="btn btn-info" style="background: #17a2b8; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        📊 View Price History
                    </button>
                </div>
                
                <div id="scraping-progress" style="margin-top: 15px; display: none;">
                    <div style="background: #e9ecef; border-radius: 4px; overflow: hidden;">
                        <div id="progress-bar" style="background: #007bff; height: 20px; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                    <p id="progress-text" style="margin: 8px 0 0 0; font-size: 14px; color: #666;"></p>
                </div>
            </div>
        `;

        // Insert before the products container
        const productsContainer = document.querySelector('.products-container');
        if (productsContainer && productsContainer.parentNode) {
            productsContainer.parentNode.insertBefore(scrapingDashboard, productsContainer);
        }

        // Add event listeners
        document.getElementById('scrape-all-btn').addEventListener('click', handleScrapeAll);
        document.getElementById('start-schedule-btn').addEventListener('click', handleStartSchedule);
        document.getElementById('stop-schedule-btn').addEventListener('click', handleStopSchedule);
        document.getElementById('view-history-btn').addEventListener('click', handleViewHistory);
    }

    async function updateScrapingStatus() {
        try {
            const status = await scrapingService.getScrapingStatus();
            const indicator = document.getElementById('scraping-status-indicator');
            const text = document.getElementById('scraping-status-text');
            
            if (status.success) {
                const scheduler = status.scheduler;
                const scrapers = status.scrapers;
                
                // Update status indicator
                if (scheduler.isRunning) {
                    indicator.style.background = '#ffc107'; // Yellow for running
                    text.textContent = 'Scraping in progress...';
                } else if (scheduler.activeJobs.length > 0) {
                    indicator.style.background = '#28a745'; // Green for scheduled
                    text.textContent = `Scheduled: ${scheduler.activeJobs.join(', ')}`;
                } else {
                    indicator.style.background = '#6c757d'; // Gray for idle
                    text.textContent = 'Ready to scrape';
                }
                
                console.log('Scraping status:', status);
            } else {
                indicator.style.background = '#dc3545'; // Red for error
                text.textContent = 'Error checking status';
            }
        } catch (error) {
            console.error('Error updating scraping status:', error);
            const indicator = document.getElementById('scraping-status-indicator');
            const text = document.getElementById('scraping-status-text');
            if (indicator && text) {
                indicator.style.background = '#dc3545';
                text.textContent = 'Connection error';
            }
        }
    }

    async function handleScrapeAll() {
        if (isScrapingInProgress) {
            alert('Scraping is already in progress. Please wait...');
            return;
        }

        isScrapingInProgress = true;
        const button = document.getElementById('scrape-all-btn');
        const originalText = button.textContent;
        
        try {
            button.textContent = '🔄 Scraping...';
            button.disabled = true;
            
            showProgress('Starting price scraping for all products...', 10);
            
            const result = await scrapingService.scrapeAllProducts();
            
            if (result.success) {
                showProgress('Scraping started successfully!', 100);
                setTimeout(() => hideProgress(), 3000);
                alert('Price scraping has been started! Check back in a few minutes for updated prices.');
            } else {
                throw new Error(result.message || 'Scraping failed');
            }
        } catch (error) {
            console.error('Error starting scraping:', error);
            alert('Failed to start scraping: ' + error.message);
            hideProgress();
        } finally {
            button.textContent = originalText;
            button.disabled = false;
            isScrapingInProgress = false;
        }
    }

    async function handleStartSchedule() {
        try {
            const result = await scrapingService.startScheduledScraping();
            if (result.success) {
                alert('Scheduled scraping started! Prices will be updated automatically.');
                await updateScrapingStatus();
            } else {
                throw new Error(result.message || 'Failed to start scheduled scraping');
            }
        } catch (error) {
            console.error('Error starting scheduled scraping:', error);
            alert('Failed to start scheduled scraping: ' + error.message);
        }
    }

    async function handleStopSchedule() {
        try {
            const result = await scrapingService.stopScheduledScraping();
            if (result.success) {
                alert('Scheduled scraping stopped.');
                await updateScrapingStatus();
            } else {
                throw new Error(result.message || 'Failed to stop scheduled scraping');
            }
        } catch (error) {
            console.error('Error stopping scheduled scraping:', error);
            alert('Failed to stop scheduled scraping: ' + error.message);
        }
    }

    async function handleViewHistory() {
        try {
            // For demo purposes, show price history for the first product
            const products = await window.API.getProducts();
            if (products.length > 0) {
                const history = await scrapingService.getPriceHistory(products[0].id);
                if (history.success && history.history.length > 0) {
                    showPriceHistoryModal(products[0], history.history);
                } else {
                    alert('No price history available yet. Try scraping some products first!');
                }
            } else {
                alert('No products available to show history for.');
            }
        } catch (error) {
            console.error('Error viewing price history:', error);
            alert('Failed to load price history: ' + error.message);
        }
    }

    function showProgress(message, percentage = 0) {
        const progressContainer = document.getElementById('scraping-progress');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        if (progressContainer && progressBar && progressText) {
            progressContainer.style.display = 'block';
            progressBar.style.width = percentage + '%';
            progressText.textContent = message;
        }
    }

    function hideProgress() {
        const progressContainer = document.getElementById('scraping-progress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    function showPriceHistoryModal(product, history) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            margin: 20px;
        `;

        modalContent.innerHTML = `
            <h3 style="margin: 0 0 20px 0;">📊 Price History: ${product.name}</h3>
            <div class="price-history-list">
                ${history.map(entry => `
                    <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                        <div style="font-weight: bold;">${new Date(entry.timestamp).toLocaleDateString()}</div>
                        <div>Retailers found: ${entry.priceData.retailers.length}</div>
                        <div>Lowest price: $${entry.priceData.summary.lowestPrice || 'N/A'}</div>
                        <div>Average price: $${entry.priceData.summary.averagePrice || 'N/A'}</div>
                    </div>
                `).join('')}
            </div>
            <button id="close-history-modal" style="margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Close
            </button>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Close modal handlers
        document.getElementById('close-history-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // Add real-time price update functionality to existing product cards
    function enhanceProductCardsWithScraping() {
        const productCards = document.querySelectorAll('.product-card');
        
        productCards.forEach(card => {
            const productId = card.dataset.productId;
            if (productId) {
                // Add scrape button to each product card
                const scrapeButton = document.createElement('button');
                scrapeButton.textContent = '🔄 Update Prices';
                scrapeButton.className = 'scrape-product-btn';
                scrapeButton.style.cssText = `
                    background: #17a2b8;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    margin-top: 8px;
                `;
                
                scrapeButton.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await handleScrapeProduct(productId, scrapeButton);
                });
                
                const cardActions = card.querySelector('.card-actions') || card;
                cardActions.appendChild(scrapeButton);
            }
        });
    }

    async function handleScrapeProduct(productId, button) {
        const originalText = button.textContent;
        
        try {
            button.textContent = '🔄 Scraping...';
            button.disabled = true;
            
            const result = await scrapingService.scrapeProduct(productId);
            
            if (result.success && result.results.retailers.length > 0) {
                button.textContent = '✅ Updated!';
                
                // Update the product card with new price info
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 2000);
                
                // Optionally refresh the product data
                await loadProducts(currentFilters);
            } else {
                button.textContent = '❌ Failed';
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 2000);
            }
        } catch (error) {
            console.error('Error scraping product:', error);
            button.textContent = '❌ Error';
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 2000);
        }
    }

    // Enhance existing product loading to include scraping buttons
    const originalLoadProducts = window.loadProducts;
    if (originalLoadProducts) {
        window.loadProducts = async function(...args) {
            await originalLoadProducts.apply(this, args);
            if (scrapingService) {
                enhanceProductCardsWithScraping();
            }
        };
    }
});
