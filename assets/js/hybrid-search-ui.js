/**
 * Hybrid Search UI Controller
 * Manages the search interface and integrates with HybridSearchService
 */

class HybridSearchUI {
    constructor() {
        this.searchService = new HybridSearchService();
        this.searchInput = document.getElementById('searchInput');
        this.searchButton = document.getElementById('searchButton');
        this.resultsContainer = document.querySelector('.products-grid');
        this.filterTabs = document.querySelectorAll('.filter-tab');
        
        this.currentResults = null;
        this.isSearching = false;
        
        this.init();
    }

    /**
     * Initialize search UI and event listeners
     */
    init() {
        this.setupEventListeners();
        this.createSearchStatus();
        this.createSearchSuggestions();
        
        // Add API toggle for development
        this.createAPIToggle();
        
        console.log('Hybrid Search UI initialized');
    }

    /**
     * Setup all search-related event listeners
     */
    setupEventListeners() {
        // Search button click
        this.searchButton?.addEventListener('click', (e) => {
            e.preventDefault();
            this.performSearch();
        });

        // Search input events
        this.searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch();
            }
        });

        // Real-time search with debouncing
        this.searchInput?.addEventListener('input', (e) => {
            this.debounceSearch(e.target.value);
        });

        // Clear search when input is empty
        this.searchInput?.addEventListener('input', (e) => {
            if (e.target.value.trim() === '') {
                this.clearSearch();
            }
        });

        // Example search buttons
        this.setupExampleSearches();
    }

    /**
     * Debounced search function
     */
    debounceSearch(query) {
        clearTimeout(this.searchTimeout);
        
        if (query.trim().length >= 2) {
            this.searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 300);
        }
    }

    /**
     * Main search function
     */
    async performSearch(query = null) {
        const searchQuery = query || this.searchInput?.value || '';
        
        if (searchQuery.trim().length < 2) {
            return;
        }

        this.setSearching(true);
        this.hideNoResults();
        
        try {
            const startTime = Date.now();
            const results = await this.searchService.performHybridSearch(searchQuery);
            const searchTime = Date.now() - startTime;
            
            this.currentResults = results;
            this.displayResults(results);
            this.updateSearchStatus(results, searchTime);
            
            // Update URL without page reload
            this.updateURL(searchQuery);
            
        } catch (error) {
            console.error('Search failed:', error);
            this.showSearchError();
        } finally {
            this.setSearching(false);
        }
    }

    /**
     * Display search results in the UI
     */
    displayResults(results) {
        const { products, totalResults } = results;
        
        // Hide all existing product cards
        const allCards = document.querySelectorAll('.product-card');
        allCards.forEach(card => {
            card.style.display = 'none';
            card.classList.add('search-hidden');
        });

        let visibleCount = 0;
        
        // Show matching local products
        products.forEach(product => {
            if (product.source === 'local' && product.element) {
                product.element.style.display = 'block';
                product.element.classList.remove('search-hidden');
                this.highlightSearchTerms(product.element, this.searchInput.value);
                visibleCount++;
            }
        });

        // Add API results if any
        this.renderAPIResults(products.filter(p => p.source !== 'local'));

        // Show no results message if needed
        if (totalResults === 0) {
            this.showNoResults(results.suggestions);
        }

        // Reset filter tabs
        this.resetFilterTabs();
    }

    /**
     * Render API search results as new cards
     */
    renderAPIResults(apiProducts) {
        // Remove existing API result cards
        const existingAPICards = document.querySelectorAll('.product-card[data-source]');
        existingAPICards.forEach(card => card.remove());

        apiProducts.forEach((product, index) => {
            const card = this.createAPIProductCard(product, index);
            this.resultsContainer.appendChild(card);
        });
    }

    /**
     * Create a product card for API results
     */
    createAPIProductCard(product, index) {
        const card = document.createElement('div');
        card.className = 'product-card api-result';
        card.setAttribute('data-source', product.source);
        card.setAttribute('data-category', product.category || 'fashion');

        const sourceIcon = this.getSourceIcon(product.source);
        const sourceBadge = `<span class="source-badge ${product.source}">${sourceIcon} ${product.source}</span>`;

        card.innerHTML = `
            <div class="product-image">
                <img src="${product.image || './assets/images/placeholder.jpg'}" 
                     alt="${product.name}" 
                     loading="lazy">
                ${sourceBadge}
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-brand">${product.brand || 'Fashion Item'}</p>
                <p class="product-description">${product.description || ''}</p>
                <div class="product-price">
                    <span class="current-price">${product.price}</span>
                    ${product.originalPrice ? `<span class="original-price">${product.originalPrice}</span>` : ''}
                </div>
                <div class="product-actions">
                    <button class="shop-btn" onclick="window.open('${product.url}', '_blank')">
                        Shop Now
                    </button>
                    <button class="add-to-cart-btn" data-product-name="${product.name}" 
                            data-product-price="${product.price.replace(/[^0-9.]/g, '')}" 
                            data-product-image="${product.image}">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    /**
     * Get source icon for API results
     */
    getSourceIcon(source) {
        const icons = {
            amazon: '🛒',
            ebay: '🏪',
            shopify: '🛍️',
            local: '⭐'
        };
        return icons[source] || '🔍';
    }

    /**
     * Highlight search terms in product cards
     */
    highlightSearchTerms(cardElement, searchQuery) {
        if (!searchQuery) return;

        const terms = searchQuery.toLowerCase().split(' ').filter(term => term.length > 1);
        const textElements = cardElement.querySelectorAll('h3, .product-description, .product-brand');

        textElements.forEach(element => {
            let html = element.innerHTML;
            
            terms.forEach(term => {
                const regex = new RegExp(`(${term})`, 'gi');
                html = html.replace(regex, '<mark class="search-highlight">$1</mark>');
            });
            
            element.innerHTML = html;
        });
    }

    /**
     * Show no results message with suggestions
     */
    showNoResults(suggestions = []) {
        let noResultsEl = document.getElementById('no-results');
        
        if (!noResultsEl) {
            noResultsEl = document.createElement('div');
            noResultsEl.id = 'no-results';
            noResultsEl.className = 'no-results';
            this.resultsContainer.parentNode.appendChild(noResultsEl);
        }

        const suggestionButtons = suggestions.map(suggestion => 
            `<button class="suggestion-btn" onclick="hybridSearchUI.searchSuggestion('${suggestion}')">${suggestion}</button>`
        ).join('');

        noResultsEl.innerHTML = `
            <div class="no-results-content">
                <span class="no-results-icon">🔍</span>
                <h3>No products found</h3>
                <p>We couldn't find any products matching "${this.searchInput?.value || ''}"</p>
                ${suggestions.length > 0 ? `
                    <div class="search-suggestions">
                        <p>Try searching for:</p>
                        <div class="suggestion-buttons">
                            ${suggestionButtons}
                        </div>
                    </div>
                ` : ''}
                <button class="clear-search-btn" onclick="hybridSearchUI.clearSearch()">Clear Search</button>
            </div>
        `;

        noResultsEl.style.display = 'block';
    }

    /**
     * Hide no results message
     */
    hideNoResults() {
        const noResultsEl = document.getElementById('no-results');
        if (noResultsEl) {
            noResultsEl.style.display = 'none';
        }
    }

    /**
     * Clear search and show all products
     */
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }

        // Show all local product cards
        const allCards = document.querySelectorAll('.product-card');
        allCards.forEach(card => {
            if (!card.hasAttribute('data-source')) { // Local products only
                card.style.display = 'block';
                card.classList.remove('search-hidden');
            } else {
                card.remove(); // Remove API result cards
            }
        });

        // Remove search highlights
        const highlights = document.querySelectorAll('.search-highlight');
        highlights.forEach(mark => {
            mark.outerHTML = mark.innerHTML;
        });

        this.hideNoResults();
        this.clearSearchStatus();
        this.updateURL('');
        this.resetFilterTabs();

        if (this.searchInput) {
            this.searchInput.focus();
        }
    }

    /**
     * Search from suggestion button
     */
    searchSuggestion(suggestion) {
        if (this.searchInput) {
            this.searchInput.value = suggestion;
        }
        this.performSearch(suggestion);
    }

    /**
     * Create search status indicator
     */
    createSearchStatus() {
        const statusEl = document.createElement('div');
        statusEl.id = 'search-status';
        statusEl.className = 'search-status';
        
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
            searchContainer.appendChild(statusEl);
        }
    }

    /**
     * Update search status
     */
    updateSearchStatus(results, searchTime) {
        const statusEl = document.getElementById('search-status');
        if (!statusEl) return;

        const { totalResults, sources } = results;
        const sourceText = sources.length > 1 ? `from ${sources.join(', ')}` : '';
        
        statusEl.innerHTML = `
            <span class="results-count">${totalResults} results found ${sourceText}</span>
            <span class="search-time">(${searchTime}ms)</span>
        `;
        statusEl.style.display = 'block';
    }

    /**
     * Clear search status
     */
    clearSearchStatus() {
        const statusEl = document.getElementById('search-status');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }

    /**
     * Set searching state
     */
    setSearching(searching) {
        this.isSearching = searching;
        
        if (this.searchButton) {
            this.searchButton.disabled = searching;
            this.searchButton.innerHTML = searching ? 
                '<span class="loading-spinner">⏳</span> Searching...' : 
                'Search';
        }

        if (this.searchInput) {
            this.searchInput.disabled = searching;
        }
    }

    /**
     * Show search error
     */
    showSearchError() {
        const statusEl = document.getElementById('search-status');
        if (statusEl) {
            statusEl.innerHTML = '<span class="error">Search temporarily unavailable</span>';
            statusEl.style.display = 'block';
        }
    }

    /**
     * Reset filter tabs
     */
    resetFilterTabs() {
        this.filterTabs.forEach(tab => tab.classList.remove('active'));
        const allTab = document.querySelector('[data-filter="all"]');
        if (allTab) {
            allTab.classList.add('active');
        }
    }

    /**
     * Update URL with search query
     */
    updateURL(query) {
        const url = new URL(window.location);
        if (query) {
            url.searchParams.set('search', query);
        } else {
            url.searchParams.delete('search');
        }
        window.history.replaceState(null, '', url);
    }

    /**
     * Setup example search buttons
     */
    setupExampleSearches() {
        const examples = [
            'dresses', 'sneakers', 'handbags', 'jackets', 
            'summer wear', 'formal attire', 'accessories'
        ];

        const container = document.querySelector('.search-examples');
        if (container) {
            examples.forEach(example => {
                const button = document.createElement('button');
                button.className = 'example-search-btn';
                button.textContent = example;
                button.onclick = () => this.searchSuggestion(example);
                container.appendChild(button);
            });
        }
    }

    /**
     * Create API toggle for development/testing
     */
    createAPIToggle() {
        if (window.location.hostname === 'localhost' || window.location.search.includes('debug=true')) {
            const toggle = document.createElement('div');
            toggle.className = 'api-toggle-container';
            toggle.innerHTML = `
                <label class="api-toggle">
                    <input type="checkbox" id="api-toggle" onchange="hybridSearchUI.toggleAPIMode(this.checked)">
                    <span>Enable API Search</span>
                </label>
            `;
            
            const header = document.querySelector('header');
            if (header) {
                header.appendChild(toggle);
            }
        }
    }

    /**
     * Toggle API mode for testing
     */
    toggleAPIMode(enabled) {
        if (enabled) {
            this.searchService.enableAPIs({
                amazon: { enabled: true },
                ebay: { enabled: true },
                shopify: { enabled: true }
            });
            console.log('API search mode enabled');
        } else {
            this.searchService.disableAPIs();
            console.log('Local search mode only');
        }
    }

    /**
     * Initialize from URL parameters
     */
    initFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('search');
        
        if (searchQuery && this.searchInput) {
            this.searchInput.value = searchQuery;
            this.performSearch(searchQuery);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.hybridSearchUI = new HybridSearchUI();
    hybridSearchUI.initFromURL();
});

// Export for external use
window.HybridSearchUI = HybridSearchUI;
