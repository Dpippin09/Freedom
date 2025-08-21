/**
 * API Search Service - Multi-Platform Product Search
 * Searches across multiple retail APIs to find products and prices
 */

class APISearchService {
    constructor() {
        // Load configuration
        const config = window.API_CONFIG || {};
        
        // Real API Configuration
        this.apiKeys = {
            rapidapi: config.RAPIDAPI_KEY || 'YOUR_RAPIDAPI_KEY',
            ebay: config.EBAY_CLIENT_ID || 'YOUR_EBAY_CLIENT_ID',
            walmart: config.WALMART_API_KEY || 'YOUR_WALMART_KEY'
        };

        this.searchEndpoints = {
            amazon: {
                name: 'Amazon',
                baseUrl: 'https://amazon-products1.p.rapidapi.com/search',
                headers: {
                    'X-RapidAPI-Key': this.apiKeys.rapidapi,
                    'X-RapidAPI-Host': 'amazon-products1.p.rapidapi.com'
                },
                enabled: true,
                type: 'rapidapi'
            },
            ebay: {
                name: 'eBay',
                baseUrl: 'https://api.ebay.com/buy/browse/v1/item_summary/search',
                headers: {
                    'Authorization': `Bearer ${this.apiKeys.ebay}`,
                    'Content-Type': 'application/json'
                },
                enabled: true,
                type: 'official'
            },
            walmart: {
                name: 'Walmart',
                baseUrl: 'https://walmart-com1.p.rapidapi.com/search',
                headers: {
                    'X-RapidAPI-Key': this.apiKeys.rapidapi,
                    'X-RapidAPI-Host': 'walmart-com1.p.rapidapi.com'
                },
                enabled: true,
                type: 'rapidapi'
            },
            target: {
                name: 'Target',
                baseUrl: 'https://target1.p.rapidapi.com/search',
                headers: {
                    'X-RapidAPI-Key': this.apiKeys.rapidapi,
                    'X-RapidAPI-Host': 'target1.p.rapidapi.com'
                },
                enabled: true,
                type: 'rapidapi'
            },
            etsy: {
                name: 'Etsy',
                baseUrl: 'https://etsy2.p.rapidapi.com/search',
                headers: {
                    'X-RapidAPI-Key': this.apiKeys.rapidapi,
                    'X-RapidAPI-Host': 'etsy2.p.rapidapi.com'
                },
                enabled: true,
                type: 'rapidapi'
            }
        };
        
        this.searchCache = new Map();
        this.searchTimeout = null;
        this.currentSearch = null;
        this.useMockData = config.USE_MOCK_DATA !== false; // Default to true for safety
        this.enableLogging = config.ENABLE_LOGGING !== false;
        
        if (this.enableLogging) {
            console.log('🔍 API Search Service initialized');
            console.log('📊 Mock data mode:', this.useMockData);
            console.log('🔑 API keys configured:', Object.keys(this.apiKeys).filter(k => 
                this.apiKeys[k] && !this.apiKeys[k].startsWith('YOUR_')
            ));
        }
    }

    /**
     * Perform search across multiple APIs
     */
    async searchProducts(query, options = {}) {
        const {
            minPrice = 0,
            maxPrice = 10000,
            category = 'all',
            sortBy = 'relevance',
            limit = 20
        } = options;

        // Check cache first
        const cacheKey = `${query}-${minPrice}-${maxPrice}-${category}-${sortBy}`;
        if (this.searchCache.has(cacheKey)) {
            return this.searchCache.get(cacheKey);
        }

        const searchResults = {
            query,
            results: [],
            totalResults: 0,
            searchTime: 0,
            sources: []
        };

        const startTime = Date.now();

        try {
            // Create search promises for all enabled APIs
            const searchPromises = Object.entries(this.searchEndpoints)
                .filter(([key, endpoint]) => endpoint.enabled)
                .map(([key, endpoint]) => this.searchAPI(key, query, options));

            // Execute searches in parallel with timeout
            const results = await Promise.allSettled(searchPromises);
            
            // Process results from each API
            results.forEach((result, index) => {
                const apiKey = Object.keys(this.searchEndpoints)[index];
                
                if (result.status === 'fulfilled' && result.value) {
                    searchResults.results.push(...result.value.products);
                    searchResults.sources.push(apiKey);
                    searchResults.totalResults += result.value.count || 0;
                }
            });

            // Sort and deduplicate results
            searchResults.results = this.processResults(searchResults.results, sortBy, limit);
            searchResults.searchTime = Date.now() - startTime;

            // Cache results for 5 minutes
            this.searchCache.set(cacheKey, searchResults);
            setTimeout(() => this.searchCache.delete(cacheKey), 5 * 60 * 1000);

            return searchResults;

        } catch (error) {
            console.error('Search error:', error);
            return {
                query,
                results: [],
                totalResults: 0,
                searchTime: Date.now() - startTime,
                sources: [],
                error: 'Search failed. Please try again.'
            };
        }
    }

    /**
     * Search individual API
     */
    async searchAPI(apiKey, query, options = {}) {
        const endpoint = this.searchEndpoints[apiKey];
        if (!endpoint || !endpoint.enabled) return null;

        // Use mock data if API keys not configured or useMockData is true
        if (this.useMockData || !this.apiKeys.rapidapi || this.apiKeys.rapidapi === 'YOUR_RAPIDAPI_KEY') {
            console.log(`Using mock data for ${endpoint.name} (API key not configured)`);
            return await this.simulateAPISearch(apiKey, query, options);
        }

        try {
            console.log(`Searching ${endpoint.name} for: ${query}`);
            
            if (endpoint.type === 'rapidapi') {
                return await this.searchRapidAPI(apiKey, endpoint, query, options);
            } else if (endpoint.type === 'official') {
                return await this.searchOfficialAPI(apiKey, endpoint, query, options);
            }
            
        } catch (error) {
            console.error(`${endpoint.name} search error:`, error);
            // Fallback to mock data on error
            return await this.simulateAPISearch(apiKey, query, options);
        }
    }

    /**
     * Search RapidAPI endpoints
     */
    async searchRapidAPI(apiKey, endpoint, query, options = {}) {
        const { limit = 10 } = options;
        
        let url = endpoint.baseUrl;
        let searchParams = new URLSearchParams();

        // Configure parameters based on API
        switch (apiKey) {
            case 'amazon':
                searchParams.append('query', query);
                searchParams.append('page', '1');
                searchParams.append('country', 'US');
                break;
            case 'walmart':
                searchParams.append('query', query);
                searchParams.append('page', '1');
                searchParams.append('sortBy', 'best_match');
                break;
            case 'target':
                searchParams.append('query', query);
                searchParams.append('limit', limit.toString());
                break;
            case 'etsy':
                searchParams.append('query', query);
                searchParams.append('limit', limit.toString());
                searchParams.append('sort_on', 'relevancy');
                break;
        }

        const fullUrl = `${url}?${searchParams.toString()}`;
        console.log(`Making API call to: ${fullUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: endpoint.headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return this.parseRapidAPIResponse(apiKey, data, query);

        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Search official APIs (like eBay)
     */
    async searchOfficialAPI(apiKey, endpoint, query, options = {}) {
        const { limit = 10 } = options;
        
        if (apiKey === 'ebay') {
            const searchParams = new URLSearchParams({
                q: query,
                limit: limit.toString(),
                offset: '0',
                category_ids: '281', // Fashion category
                filter: 'price:[1..],priceCurrency:USD'
            });

            const fullUrl = `${endpoint.baseUrl}?${searchParams.toString()}`;
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: endpoint.headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return this.parseEbayResponse(data, query);
        }

        return null;
    }

    /**
     * Parse RapidAPI responses
     */
    parseRapidAPIResponse(apiKey, data, query) {
        const products = [];
        
        try {
            let items = [];
            
            // Handle different response formats
            switch (apiKey) {
                case 'amazon':
                    items = data.results || data.products || [];
                    break;
                case 'walmart':
                    items = data.items || data.results || [];
                    break;
                case 'target':
                    items = data.data?.search?.products || data.products || [];
                    break;
                case 'etsy':
                    items = data.results || [];
                    break;
            }

            items.forEach((item, index) => {
                try {
                    const product = this.normalizeProduct(apiKey, item, query);
                    if (product) products.push(product);
                } catch (error) {
                    console.warn(`Error parsing product ${index} from ${apiKey}:`, error);
                }
            });

        } catch (error) {
            console.error(`Error parsing ${apiKey} response:`, error);
        }

        return {
            products,
            count: products.length,
            source: apiKey
        };
    }

    /**
     * Parse eBay official API response
     */
    parseEbayResponse(data, query) {
        const products = [];
        
        if (data.itemSummaries) {
            data.itemSummaries.forEach((item, index) => {
                try {
                    const product = this.normalizeProduct('ebay', item, query);
                    if (product) products.push(product);
                } catch (error) {
                    console.warn(`Error parsing eBay product ${index}:`, error);
                }
            });
        }

        return {
            products,
            count: products.length,
            source: 'ebay'
        };
    }

    /**
     * Normalize product data from different APIs
     */
    normalizeProduct(source, item, query) {
        const endpoint = this.searchEndpoints[source];
        let product = {
            id: `${source}-${item.id || item.asin || item.itemId || Date.now()}`,
            source: source,
            sourceName: endpoint.name,
            title: '',
            price: 0,
            originalPrice: 0,
            image: '',
            rating: 0,
            reviews: 0,
            url: '',
            availability: 'Available',
            shipping: 'Standard shipping',
            description: ''
        };

        try {
            switch (source) {
                case 'amazon':
                    product.title = item.title || item.name || 'Unknown Product';
                    product.price = parseFloat(item.price?.value || item.current_price || 0);
                    product.originalPrice = parseFloat(item.original_price || item.price?.value || product.price * 1.2);
                    product.image = item.image || item.main_image;
                    product.rating = parseFloat(item.rating || item.reviews?.rating || 4);
                    product.reviews = parseInt(item.reviews?.total_reviews || item.review_count || 0);
                    product.url = item.url || item.link || `https://amazon.com/dp/${item.asin}`;
                    product.description = item.description || `${product.title} from Amazon`;
                    break;

                case 'walmart':
                    product.title = item.name || item.title || 'Unknown Product';
                    product.price = parseFloat(item.price || item.current_price || 0);
                    product.originalPrice = parseFloat(item.list_price || product.price * 1.15);
                    product.image = item.image || item.thumbnail;
                    product.rating = parseFloat(item.rating || 4);
                    product.reviews = parseInt(item.reviews_count || 0);
                    product.url = item.url || `https://walmart.com/ip/${item.id}`;
                    product.description = item.description || `${product.title} from Walmart`;
                    break;

                case 'target':
                    product.title = item.title || item.name || 'Unknown Product';
                    product.price = parseFloat(item.price?.current || item.current_price || 0);
                    product.originalPrice = parseFloat(item.price?.regular || product.price * 1.1);
                    product.image = item.image || item.images?.[0];
                    product.rating = parseFloat(item.rating || 4);
                    product.reviews = parseInt(item.review_count || 0);
                    product.url = item.url || `https://target.com/p/${item.tcin}`;
                    product.description = item.description || `${product.title} from Target`;
                    break;

                case 'etsy':
                    product.title = item.title || 'Unknown Product';
                    product.price = parseFloat(item.price?.amount || item.price || 0) / 100; // Etsy prices in cents
                    product.originalPrice = product.price * 1.1;
                    product.image = item.Images?.[0]?.url_570xN || item.image;
                    product.rating = parseFloat(item.rating || 4);
                    product.reviews = parseInt(item.num_favorers || 0);
                    product.url = item.url || `https://etsy.com/listing/${item.listing_id}`;
                    product.description = item.description || `${product.title} from Etsy`;
                    break;

                case 'ebay':
                    product.title = item.title || 'Unknown Product';
                    product.price = parseFloat(item.price?.value || 0);
                    product.originalPrice = product.price * 1.1;
                    product.image = item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl;
                    product.rating = 4; // eBay doesn't provide ratings in search
                    product.reviews = 0;
                    product.url = item.itemWebUrl || `https://ebay.com/itm/${item.itemId}`;
                    product.availability = item.availabilityStatus || 'Available';
                    product.shipping = item.shippingOptions?.[0]?.shippingCost?.value ? 
                                     `$${item.shippingOptions[0].shippingCost.value} shipping` : 
                                     'See details';
                    product.description = item.shortDescription || `${product.title} from eBay`;
                    break;
            }

            // Ensure required fields
            if (!product.title || product.price <= 0) {
                return null;
            }

            // Format prices
            product.price = product.price.toFixed(2);
            product.originalPrice = product.originalPrice.toFixed(2);

            return product;

        } catch (error) {
            console.error(`Error normalizing ${source} product:`, error, item);
            return null;
        }
    }

    /**
     * Simulate API search with realistic mock data
     */
    async simulateAPISearch(apiKey, query, options = {}) {
        // Add realistic delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

        const mockProducts = this.generateMockProducts(apiKey, query, options.limit || 20);
        
        return {
            products: mockProducts,
            count: mockProducts.length,
            source: apiKey
        };
    }

    /**
     * Generate realistic mock products
     */
    generateMockProducts(source, query, limit) {
        const products = [];
        const basePrice = Math.random() * 200 + 50;
        
        for (let i = 0; i < Math.min(limit, 10); i++) {
            const priceVariation = (Math.random() - 0.5) * 0.4; // ±20% variation
            const price = basePrice * (1 + priceVariation);
            
            products.push({
                id: `${source}-${Date.now()}-${i}`,
                title: `${query} - ${this.getProductVariant()} (${this.searchEndpoints[source].name})`,
                price: price.toFixed(2),
                originalPrice: (price * (1 + Math.random() * 0.3)).toFixed(2),
                image: this.getPlaceholderImage(query),
                source: source,
                sourceName: this.searchEndpoints[source].name,
                rating: (4 + Math.random()).toFixed(1),
                reviews: Math.floor(Math.random() * 1000) + 50,
                shipping: Math.random() > 0.5 ? 'Free shipping' : '$5.99 shipping',
                url: `https://${source}.com/product/${Date.now()}`,
                availability: Math.random() > 0.1 ? 'In Stock' : 'Limited Stock',
                description: `High-quality ${query} with excellent features and customer satisfaction.`
            });
        }
        
        return products;
    }

    /**
     * Get product variant names
     */
    getProductVariant() {
        const variants = [
            'Premium Edition', 'Classic Model', 'Pro Version', 'Standard',
            'Deluxe', 'Essential', 'Advanced', 'Basic', 'Elite', 'Limited Edition'
        ];
        return variants[Math.floor(Math.random() * variants.length)];
    }

    /**
     * Get placeholder image based on search query
     */
    getPlaceholderImage(query) {
        const imageCategories = {
            'phone': 'https://via.placeholder.com/200x200/4A90E2/ffffff?text=📱',
            'laptop': 'https://via.placeholder.com/200x200/50C8A3/ffffff?text=💻',
            'shoes': 'https://via.placeholder.com/200x200/F5A623/ffffff?text=👟',
            'dress': 'https://via.placeholder.com/200x200/D0021B/ffffff?text=👗',
            'watch': 'https://via.placeholder.com/200x200/7ED321/ffffff?text=⌚',
            'headphones': 'https://via.placeholder.com/200x200/9013FE/ffffff?text=🎧'
        };

        const queryLower = query.toLowerCase();
        for (const [key, image] of Object.entries(imageCategories)) {
            if (queryLower.includes(key)) return image;
        }
        
        return 'https://via.placeholder.com/200x200/BD10E0/ffffff?text=🛍️';
    }

    /**
     * Process and sort search results
     */
    processResults(results, sortBy, limit) {
        // Remove duplicates based on title similarity
        const unique = this.removeDuplicates(results);
        
        // Sort results
        let sorted;
        switch (sortBy) {
            case 'price_low':
                sorted = unique.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                break;
            case 'price_high':
                sorted = unique.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
                break;
            case 'rating':
                sorted = unique.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
                break;
            case 'reviews':
                sorted = unique.sort((a, b) => parseInt(b.reviews) - parseInt(a.reviews));
                break;
            default: // relevance
                sorted = unique;
        }
        
        return sorted.slice(0, limit);
    }

    /**
     * Remove duplicate products
     */
    removeDuplicates(products) {
        const seen = new Set();
        return products.filter(product => {
            const key = product.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * Get search suggestions
     */
    async getSearchSuggestions(query) {
        // Simulate suggestions
        const suggestions = [
            `${query} deals`,
            `${query} sale`,
            `${query} best price`,
            `${query} reviews`,
            `${query} comparison`
        ];
        
        return suggestions.slice(0, 5);
    }

    /**
     * Clear search cache
     */
    clearCache() {
        this.searchCache.clear();
    }

    /**
     * Cancel current search
     */
    cancelSearch() {
        if (this.currentSearch) {
            this.currentSearch.abort();
            this.currentSearch = null;
        }
    }
}

// Global instance
window.apiSearchService = new APISearchService();
