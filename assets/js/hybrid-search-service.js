/**
 * Hybrid Search Service for Freedom Fashion
 * Seamlessly combines local product data with API search results
 * Provides a unified search experience with expandable API integration
 */

class HybridSearchService {
    constructor() {
        this.apiEnabled = false; // Toggle for API integration
        this.searchTimeout = null;
        this.minSearchLength = 2;
        this.debounceDelay = 300;
        
        // API endpoints configuration
        this.apiEndpoints = {
            amazon: {
                enabled: false,
                url: 'https://api.amazon.com/products/search',
                key: process.env.AMAZON_API_KEY || null
            },
            ebay: {
                enabled: false,
                url: 'https://api.ebay.com/find',
                key: process.env.EBAY_API_KEY || null
            },
            shopify: {
                enabled: false,
                url: 'https://api.shopify.com/search',
                key: process.env.SHOPIFY_API_KEY || null
            }
        };
        
        // Local product categories for enhanced search
        this.localCategories = [
            'dresses', 'tops', 'bottoms', 'shoes', 'accessories', 
            'outerwear', 'swimwear', 'lingerie', 'suits', 'activewear'
        ];
        
        // Search suggestions for empty results
        this.searchSuggestions = [
            'summer dresses', 'casual shoes', 'designer handbags',
            'winter coats', 'workout gear', 'formal wear',
            'vintage accessories', 'trending styles'
        ];
    }

    /**
     * Main search method - handles both local and API searches
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Search results
     */
    async performHybridSearch(query, options = {}) {
        const searchQuery = query.toLowerCase().trim();
        
        if (searchQuery.length < this.minSearchLength) {
            return this.getEmptyResults();
        }

        try {
            // Always search local products first
            const localResults = this.searchLocalProducts(searchQuery, options);
            
            // If APIs are enabled and we have few local results, search APIs
            const shouldSearchAPIs = this.apiEnabled && localResults.products.length < 5;
            
            if (shouldSearchAPIs) {
                const apiResults = await this.searchAPIs(searchQuery, options);
                return this.mergeResults(localResults, apiResults);
            }

            return localResults;
            
        } catch (error) {
            console.error('Hybrid search error:', error);
            return this.searchLocalProducts(searchQuery, options); // Fallback to local
        }
    }

    /**
     * Search local products with enhanced matching
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Object} Local search results
     */
    searchLocalProducts(query, options = {}) {
        const productCards = document.querySelectorAll('.product-card');
        const results = [];
        
        productCards.forEach(card => {
            const productData = this.extractProductData(card);
            const relevanceScore = this.calculateRelevance(query, productData);
            
            if (relevanceScore > 0) {
                results.push({
                    ...productData,
                    relevance: relevanceScore,
                    source: 'local'
                });
            }
        });

        // Sort by relevance score
        results.sort((a, b) => b.relevance - a.relevance);

        return {
            products: results,
            totalResults: results.length,
            searchTime: Date.now(),
            sources: ['local'],
            suggestions: this.generateSuggestions(query, results.length === 0)
        };
    }

    /**
     * Search multiple APIs in parallel
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Object>} API search results
     */
    async searchAPIs(query, options = {}) {
        const promises = [];
        const activeSources = [];

        // Amazon Product API
        if (this.apiEndpoints.amazon.enabled) {
            promises.push(this.searchAmazonAPI(query, options));
            activeSources.push('amazon');
        }

        // eBay Finding API
        if (this.apiEndpoints.ebay.enabled) {
            promises.push(this.searchEbayAPI(query, options));
            activeSources.push('ebay');
        }

        // Shopify Partner API
        if (this.apiEndpoints.shopify.enabled) {
            promises.push(this.searchShopifyAPI(query, options));
            activeSources.push('shopify');
        }

        try {
            const results = await Promise.allSettled(promises);
            const apiProducts = [];

            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value.products) {
                    apiProducts.push(...result.value.products.map(product => ({
                        ...product,
                        source: activeSources[index]
                    })));
                }
            });

            return {
                products: apiProducts,
                totalResults: apiProducts.length,
                searchTime: Date.now(),
                sources: activeSources
            };

        } catch (error) {
            console.error('API search failed:', error);
            return { products: [], totalResults: 0, sources: [] };
        }
    }

    /**
     * Amazon Product API search implementation
     */
    async searchAmazonAPI(query, options = {}) {
        if (!this.apiEndpoints.amazon.key) {
            throw new Error('Amazon API key not configured');
        }

        const params = {
            'SearchIndex': 'Fashion',
            'Keywords': query,
            'ResponseGroup': 'ItemAttributes,Offers,Images',
            'ItemPage': options.page || 1,
            'Sort': options.sort || 'relevancerank'
        };

        const response = await fetch(this.apiEndpoints.amazon.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiEndpoints.amazon.key}`
            },
            body: JSON.stringify(params)
        });

        const data = await response.json();
        return this.parseAmazonResults(data);
    }

    /**
     * eBay Finding API search implementation
     */
    async searchEbayAPI(query, options = {}) {
        const params = new URLSearchParams({
            'OPERATION-NAME': 'findItemsByKeywords',
            'SERVICE-VERSION': '1.0.0',
            'SECURITY-APPNAME': this.apiEndpoints.ebay.key,
            'RESPONSE-DATA-FORMAT': 'JSON',
            'keywords': query,
            'categoryId': '11450', // Fashion category
            'paginationInput.entriesPerPage': options.limit || 20,
            'sortOrder': options.sort || 'BestMatch'
        });

        const response = await fetch(`${this.apiEndpoints.ebay.url}?${params}`);
        const data = await response.json();
        return this.parseEbayResults(data);
    }

    /**
     * Shopify Partner API search implementation
     */
    async searchShopifyAPI(query, options = {}) {
        const response = await fetch(`${this.apiEndpoints.shopify.url}/products.json`, {
            method: 'GET',
            headers: {
                'X-Shopify-Access-Token': this.apiEndpoints.shopify.key,
                'Content-Type': 'application/json'
            },
            params: {
                query: query,
                limit: options.limit || 20,
                fields: 'id,title,handle,images,variants,product_type,vendor'
            }
        });

        const data = await response.json();
        return this.parseShopifyResults(data);
    }

    /**
     * Merge local and API results intelligently
     */
    mergeResults(localResults, apiResults) {
        const allProducts = [
            ...localResults.products,
            ...apiResults.products
        ];

        // Remove duplicates based on product name similarity
        const uniqueProducts = this.removeDuplicates(allProducts);

        // Re-sort by relevance and source preference
        uniqueProducts.sort((a, b) => {
            // Prioritize local products slightly
            if (a.source === 'local' && b.source !== 'local') return -0.1;
            if (b.source === 'local' && a.source !== 'local') return 0.1;
            
            return b.relevance - a.relevance;
        });

        return {
            products: uniqueProducts,
            totalResults: uniqueProducts.length,
            searchTime: Date.now(),
            sources: [...new Set([...localResults.sources, ...apiResults.sources])],
            suggestions: localResults.suggestions
        };
    }

    /**
     * Calculate relevance score for search matching
     */
    calculateRelevance(query, product) {
        const searchTerms = query.split(' ').filter(term => term.length > 1);
        let score = 0;

        searchTerms.forEach(term => {
            // Exact matches in name get highest score
            if (product.name.toLowerCase().includes(term)) {
                score += 10;
            }
            
            // Category matches get medium score
            if (product.category.toLowerCase().includes(term)) {
                score += 7;
            }
            
            // Description matches get lower score
            if (product.description && product.description.toLowerCase().includes(term)) {
                score += 3;
            }
            
            // Brand matches get medium score
            if (product.brand && product.brand.toLowerCase().includes(term)) {
                score += 5;
            }
        });

        return score;
    }

    /**
     * Extract product data from DOM element
     */
    extractProductData(cardElement) {
        return {
            name: cardElement.querySelector('h3')?.textContent || '',
            category: cardElement.dataset.category || '',
            description: cardElement.querySelector('.product-description')?.textContent || '',
            brand: cardElement.dataset.brand || '',
            price: cardElement.querySelector('.price')?.textContent || '',
            image: cardElement.querySelector('img')?.src || '',
            element: cardElement
        };
    }

    /**
     * Generate search suggestions
     */
    generateSuggestions(query, noResults) {
        if (!noResults) return [];

        // Return category-based suggestions
        const relatedCategories = this.localCategories.filter(cat => 
            !query.includes(cat) && cat.includes(query.substring(0, 3))
        );

        if (relatedCategories.length > 0) {
            return relatedCategories.slice(0, 3);
        }

        // Return general suggestions
        return this.searchSuggestions.slice(0, 4);
    }

    /**
     * Remove duplicate products
     */
    removeDuplicates(products) {
        const seen = new Set();
        return products.filter(product => {
            const key = product.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * Get empty results structure
     */
    getEmptyResults() {
        return {
            products: [],
            totalResults: 0,
            searchTime: Date.now(),
            sources: [],
            suggestions: this.searchSuggestions.slice(0, 4)
        };
    }

    /**
     * Enable API integration
     */
    enableAPIs(apiConfig = {}) {
        this.apiEnabled = true;
        
        // Update API configurations
        Object.keys(apiConfig).forEach(apiName => {
            if (this.apiEndpoints[apiName]) {
                this.apiEndpoints[apiName] = {
                    ...this.apiEndpoints[apiName],
                    ...apiConfig[apiName]
                };
            }
        });

        console.log('Hybrid Search: API integration enabled');
    }

    /**
     * Disable API integration (local search only)
     */
    disableAPIs() {
        this.apiEnabled = false;
        console.log('Hybrid Search: Using local search only');
    }
}

// Export for use in other modules
window.HybridSearchService = HybridSearchService;
