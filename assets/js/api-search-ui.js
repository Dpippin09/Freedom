/**
 * API Search UI - Handles search interface and results display
 * Integrates with APISearchService to show external product results
 */

class APISearchUI {
    constructor() {
        this.searchInput = null;
        this.searchButton = null;
        this.searchStatus = null;
        this.resultsContainer = null;
        this.currentQuery = '';
        this.isSearching = false;
        this.searchTimeout = null;
        
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.createResultsContainer();
    }

    setupElements() {
        this.searchInput = document.getElementById('searchInput');
        this.searchButton = document.getElementById('searchButton');
        this.searchStatus = document.getElementById('searchStatus');
        this.resultsCount = document.getElementById('resultsCount');
        this.searchTime = document.getElementById('searchTime');
    }

    setupEventListeners() {
        if (this.searchInput) {
            // Real-time search with debounce
            this.searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    const query = e.target.value.trim();
                    if (query.length >= 3) {
                        this.performSearch(query);
                    } else if (query.length === 0) {
                        this.clearResults();
                    }
                }, 500);
            });

            // Enter key search
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = e.target.value.trim();
                    if (query) {
                        this.performSearch(query);
                    }
                }
            });
        }

        if (this.searchButton) {
            this.searchButton.addEventListener('click', () => {
                const query = this.searchInput.value.trim();
                if (query) {
                    this.performSearch(query);
                }
            });
        }
    }

    createResultsContainer() {
        // Create a container for search results
        const existingContainer = document.getElementById('searchResults');
        if (existingContainer) {
            this.resultsContainer = existingContainer;
            return;
        }

        this.resultsContainer = document.createElement('div');
        this.resultsContainer.id = 'searchResults';
        this.resultsContainer.className = 'search-results-container';
        this.resultsContainer.style.display = 'none';

        // Insert after the filter tabs
        const filterTabs = document.querySelector('.filter-tabs');
        if (filterTabs) {
            filterTabs.parentNode.insertBefore(this.resultsContainer, filterTabs.nextSibling);
        }
    }

    async performSearch(query) {
        if (this.isSearching || !query.trim()) return;

        this.currentQuery = query;
        this.isSearching = true;
        this.showLoadingState();

        try {
            const results = await window.apiSearchService.searchProducts(query, {
                limit: 20,
                sortBy: 'relevance'
            });

            this.displayResults(results);
        } catch (error) {
            console.error('Search failed:', error);
            this.showError('Search failed. Please try again.');
        } finally {
            this.isSearching = false;
            this.hideLoadingState();
        }
    }

    showLoadingState() {
        if (this.searchButton) {
            this.searchButton.innerHTML = '<span class="loading-spinner">⏳</span>';
            this.searchButton.disabled = true;
        }

        if (this.searchStatus) {
            this.searchStatus.style.display = 'block';
            this.searchStatus.innerHTML = '<span class="results-count">Searching across retailers...</span>';
        }

        // Hide original products
        this.hideOriginalProducts();
    }

    hideLoadingState() {
        if (this.searchButton) {
            this.searchButton.innerHTML = '<span class="search-icon">🔍</span>';
            this.searchButton.disabled = false;
        }
    }

    displayResults(searchData) {
        const { results, totalResults, searchTime, sources, query, error } = searchData;

        // Update search status
        if (this.searchStatus) {
            this.searchStatus.style.display = 'block';
            
            if (error) {
                this.resultsCount.textContent = error;
                this.searchTime.textContent = '';
            } else {
                this.resultsCount.textContent = `Found ${results.length} products`;
                this.searchTime.textContent = `(${searchTime}ms across ${sources.length} retailers)`;
            }
        }

        // Clear and populate results
        this.resultsContainer.innerHTML = '';
        
        if (error) {
            this.showError(error);
            return;
        }

        if (results.length === 0) {
            this.showNoResults(query);
            return;
        }

        // Create results header
        const header = this.createResultsHeader(query, results.length, sources);
        this.resultsContainer.appendChild(header);

        // Create results grid
        const grid = document.createElement('div');
        grid.className = 'search-results-grid';
        
        results.forEach(product => {
            const card = this.createProductCard(product);
            grid.appendChild(card);
        });

        this.resultsContainer.appendChild(grid);
        this.resultsContainer.style.display = 'block';

        // Hide original products when showing search results
        this.hideOriginalProducts();
    }

    createResultsHeader(query, count, sources) {
        const header = document.createElement('div');
        header.className = 'search-results-header';
        
        header.innerHTML = `
            <div class="search-results-info">
                <h2>Search Results for "${query}"</h2>
                <p>Found ${count} products across ${sources.length} retailers</p>
                <div class="search-sources">
                    <span>Sources: ${sources.map(s => window.apiSearchService.searchEndpoints[s].name).join(', ')}</span>
                </div>
            </div>
            <div class="search-actions">
                <button class="clear-search-btn" onclick="apiSearchUI.clearResults()">
                    Show All Products
                </button>
                <select class="sort-select" onchange="apiSearchUI.sortResults(this.value)">
                    <option value="relevance">Sort by Relevance</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="reviews">Most Reviews</option>
                </select>
            </div>
        `;

        return header;
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card api-result';
        
        const discountPercent = Math.round((1 - product.price / product.originalPrice) * 100);
        
        card.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${product.title}" onerror="this.src='https://via.placeholder.com/200x200/BD10E0/ffffff?text=🛍️'">
                <div class="source-badge ${product.source}">${product.sourceName}</div>
                ${discountPercent > 0 ? `<div class="product-badge">-${discountPercent}%</div>` : ''}
            </div>
            <div class="product-info">
                <h3>${product.title}</h3>
                <div class="product-rating">
                    <span class="stars">${this.generateStars(product.rating)}</span>
                    <span class="rating-text">${product.rating}/5 (${product.reviews} reviews)</span>
                </div>
                <div class="product-price">
                    <span class="current-price">$${product.price}</span>
                    ${product.originalPrice > product.price ? `<span class="original-price">$${product.originalPrice}</span>` : ''}
                </div>
                <div class="product-features">
                    <span class="feature-tag">${product.availability}</span>
                    <span class="feature-tag">${product.shipping}</span>
                </div>
                <p class="product-description">${product.description}</p>
                <div class="product-actions">
                    <button class="compare-btn" onclick="window.open('${product.url}', '_blank')">
                        View on ${product.sourceName}
                    </button>
                    <button class="add-to-cart-btn" 
                            data-product-id="${product.id}" 
                            data-product-name="${product.title}" 
                            data-product-price="${product.price}" 
                            data-product-image="${product.image}"
                            data-product-source="${product.sourceName}">
                        Add to Compare
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        return '⭐'.repeat(fullStars) + 
               (hasHalfStar ? '⭐' : '') + 
               '☆'.repeat(emptyStars);
    }

    showNoResults(query) {
        this.resultsContainer.innerHTML = `
            <div class="no-results">
                <div class="no-results-content">
                    <span class="no-results-icon">🔍</span>
                    <h3>No products found</h3>
                    <p>We couldn't find any products matching "${query}". Try different keywords or browse our featured deals below.</p>
                    <div class="search-suggestions">
                        <p>Try searching for:</p>
                        <div class="suggestion-buttons">
                            <button class="suggestion-btn" onclick="performAPISearch('electronics')">Electronics</button>
                            <button class="suggestion-btn" onclick="performAPISearch('clothing')">Clothing</button>
                            <button class="suggestion-btn" onclick="performAPISearch('home decor')">Home & Garden</button>
                            <button class="suggestion-btn" onclick="performAPISearch('sports')">Sports</button>
                        </div>
                    </div>
                    <button class="clear-search-btn" onclick="apiSearchUI.clearResults()">
                        Browse All Products
                    </button>
                </div>
            </div>
        `;
        this.resultsContainer.style.display = 'block';
    }

    showError(message) {
        this.resultsContainer.innerHTML = `
            <div class="search-error">
                <span class="error-icon">⚠️</span>
                <h3>Search Error</h3>
                <p>${message}</p>
                <button class="clear-search-btn" onclick="apiSearchUI.clearResults()">
                    Try Again
                </button>
            </div>
        `;
        this.resultsContainer.style.display = 'block';
    }

    hideOriginalProducts() {
        const productsGrid = document.querySelector('.products-grid');
        if (productsGrid) {
            productsGrid.style.display = 'none';
        }
    }

    showOriginalProducts() {
        const productsGrid = document.querySelector('.products-grid');
        if (productsGrid) {
            productsGrid.style.display = 'block';
        }
    }

    clearResults() {
        this.resultsContainer.style.display = 'none';
        this.searchStatus.style.display = 'none';
        this.searchInput.value = '';
        this.currentQuery = '';
        this.showOriginalProducts();
    }

    async sortResults(sortBy) {
        if (!this.currentQuery) return;

        this.showLoadingState();
        
        try {
            const results = await window.apiSearchService.searchProducts(this.currentQuery, {
                limit: 20,
                sortBy: sortBy
            });

            this.displayResults(results);
        } catch (error) {
            console.error('Sort failed:', error);
        } finally {
            this.hideLoadingState();
        }
    }
}

// Global functions for onclick handlers
window.performAPISearch = function(query) {
    if (window.apiSearchUI) {
        window.apiSearchUI.searchInput.value = query;
        window.apiSearchUI.performSearch(query);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.apiSearchUI = new APISearchUI();
    console.log('🔍 API Search UI initialized - Ready to search across retailers!');
});
