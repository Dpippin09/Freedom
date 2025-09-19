const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Enhanced External Product Service
 * Handles product discovery, comparison, and data enrichment from external retailers
 */
class ExternalProductService {
    constructor() {
        this.supportedRetailers = {
            amazon: {
                name: 'Amazon',
                searchUrl: 'https://www.amazon.com/s?k=',
                productSelectors: {
                    container: '[data-component-type="s-search-result"]',
                    title: 'h2 a span',
                    price: '.a-price-current .a-offscreen',
                    image: '.s-image',
                    link: 'h2 a',
                    rating: '.a-icon-alt'
                }
            },
            walmart: {
                name: 'Walmart',
                searchUrl: 'https://www.walmart.com/search?q=',
                productSelectors: {
                    container: '[data-testid="item"]',
                    title: '[data-testid="product-title"]',
                    price: '[data-testid="price-current"]',
                    image: 'img[data-testid="productTileImage"]',
                    link: 'a'
                }
            },
            target: {
                name: 'Target',
                searchUrl: 'https://www.target.com/s?searchTerm=',
                productSelectors: {
                    container: '[data-test="@web/site/top/ProductCard"]',
                    title: '[data-test="product-title"]',
                    price: '[data-test="product-price"]',
                    image: 'picture img',
                    link: 'a'
                }
            }
        };

        this.requestHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };
    }

    /**
     * Search for products across multiple retailers
     */
    async searchProducts(query, options = {}) {
        const {
            retailers = Object.keys(this.supportedRetailers),
            limit = 10,
            minPrice,
            maxPrice,
            category
        } = options;

        const results = {};
        const errors = {};

        for (const retailer of retailers) {
            try {
                if (!this.supportedRetailers[retailer]) {
                    errors[retailer] = 'Retailer not supported';
                    continue;
                }

                console.log(`🔍 Searching ${retailer} for: ${query}`);
                const products = await this.searchRetailer(retailer, query, limit);
                
                // Apply filters
                let filteredProducts = products;
                if (minPrice || maxPrice) {
                    filteredProducts = products.filter(product => {
                        const price = this.extractPrice(product.price);
                        return (!minPrice || price >= parseFloat(minPrice)) && 
                               (!maxPrice || price <= parseFloat(maxPrice));
                    });
                }

                results[retailer] = {
                    count: filteredProducts.length,
                    products: filteredProducts.slice(0, limit)
                };

            } catch (error) {
                console.error(`Search error for ${retailer}:`, error);
                errors[retailer] = error.message;
            }
        }

        return { results, errors };
    }

    /**
     * Search a specific retailer
     */
    async searchRetailer(retailer, query, limit = 10) {
        const retailerConfig = this.supportedRetailers[retailer];
        if (!retailerConfig) {
            throw new Error(`Retailer ${retailer} not supported`);
        }

        const searchUrl = retailerConfig.searchUrl + encodeURIComponent(query);
        
        try {
            const response = await axios.get(searchUrl, {
                headers: this.requestHeaders,
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            const products = [];
            const selectors = retailerConfig.productSelectors;

            $(selectors.container).each((index, element) => {
                if (index >= limit) return false;

                const $el = $(element);
                const product = {
                    title: this.extractText($el, selectors.title),
                    price: this.extractText($el, selectors.price),
                    image: this.extractAttribute($el, selectors.image, 'src'),
                    link: this.extractAttribute($el, selectors.link, 'href'),
                    retailer: retailerConfig.name,
                    rating: this.extractText($el, selectors.rating)
                };

                // Clean up the link to be absolute
                if (product.link && !product.link.startsWith('http')) {
                    const baseUrl = new URL(searchUrl).origin;
                    product.link = baseUrl + product.link;
                }

                // Only add if we have essential data
                if (product.title && product.price) {
                    products.push(product);
                }
            });

            return products;

        } catch (error) {
            console.error(`Failed to search ${retailer}:`, error);
            return [];
        }
    }

    /**
     * Get detailed product information from a URL
     */
    async getProductDetails(url) {
        try {
            const retailer = this.detectRetailer(url);
            if (!retailer) {
                throw new Error('Retailer not supported or could not be detected');
            }

            const response = await axios.get(url, {
                headers: this.requestHeaders,
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            
            // Use retailer-specific selectors for detailed scraping
            return this.extractProductDetails($, retailer, url);

        } catch (error) {
            console.error(`Failed to get product details from ${url}:`, error);
            throw error;
        }
    }

    /**
     * Compare prices across retailers for similar products
     */
    async comparePrices(productUrls) {
        const comparisons = [];
        const errors = [];

        for (const url of productUrls) {
            try {
                const productData = await this.getProductDetails(url);
                comparisons.push({
                    ...productData,
                    url
                });
            } catch (error) {
                errors.push({ url, error: error.message });
            }
        }

        // Sort by price (lowest first)
        comparisons.sort((a, b) => {
            const priceA = this.extractPrice(a.price);
            const priceB = this.extractPrice(b.price);
            return priceA - priceB;
        });

        return { comparisons, errors };
    }

    /**
     * Detect retailer from URL
     */
    detectRetailer(url) {
        const urlLower = url.toLowerCase();
        
        if (urlLower.includes('amazon.com')) return 'amazon';
        if (urlLower.includes('walmart.com')) return 'walmart';
        if (urlLower.includes('target.com')) return 'target';
        if (urlLower.includes('ebay.com')) return 'ebay';
        
        return null;
    }

    /**
     * Extract product details using retailer-specific selectors
     */
    extractProductDetails($, retailer, url) {
        const selectors = {
            amazon: {
                title: '#productTitle',
                price: '.a-price-current .a-offscreen, .a-price .a-offscreen',
                originalPrice: '.a-price.a-text-price .a-offscreen',
                availability: '#availability span',
                rating: '.a-icon-alt',
                reviews: '#acrCustomerReviewText',
                description: '#feature-bullets ul',
                images: '#landingImage, .a-dynamic-image'
            },
            walmart: {
                title: '[data-testid="product-title"]',
                price: '[data-testid="price-current"]',
                originalPrice: '[data-testid="price-was"]',
                availability: '[data-testid="fulfillment-shipping-text"]',
                rating: '.average-rating',
                reviews: '.review-count',
                description: '[data-testid="product-description"]'
            },
            target: {
                title: '[data-test="product-title"]',
                price: '[data-test="product-price"]',
                originalPrice: '[data-test="product-price-strikethrough"]',
                availability: '[data-test="fulfillment-shipping-text"]',
                rating: '[data-test="rating-stars"]',
                reviews: '[data-test="rating-count"]'
            }
        };

        const retailerSelectors = selectors[retailer] || {};
        
        return {
            title: this.extractText($, retailerSelectors.title),
            price: this.extractText($, retailerSelectors.price),
            originalPrice: this.extractText($, retailerSelectors.originalPrice),
            availability: this.extractText($, retailerSelectors.availability),
            rating: this.extractText($, retailerSelectors.rating),
            reviews: this.extractText($, retailerSelectors.reviews),
            description: this.extractText($, retailerSelectors.description),
            retailer: this.supportedRetailers[retailer]?.name || retailer,
            url,
            scrapedAt: new Date().toISOString()
        };
    }

    /**
     * Helper method to extract text from elements
     */
    extractText($, selector) {
        if (!selector) return null;
        const element = $(selector).first();
        return element.length ? element.text().trim() : null;
    }

    /**
     * Helper method to extract attributes from elements
     */
    extractAttribute($element, selector, attribute) {
        if (!selector) return null;
        const element = $element.find(selector).first();
        return element.length ? element.attr(attribute) : null;
    }

    /**
     * Extract numeric price from price string
     */
    extractPrice(priceString) {
        if (!priceString) return 0;
        const price = priceString.replace(/[^0-9.]/g, '');
        return parseFloat(price) || 0;
    }

    /**
     * Get trending products based on search popularity (placeholder)
     */
    async getTrendingProducts(category = null, limit = 20) {
        // This would require integration with trending data sources
        // For now, return sample trending fashion terms
        const trendingQueries = [
            'sustainable fashion',
            'vintage denim',
            'minimalist jewelry',
            'athleisure wear',
            'boho chic dress',
            'leather boots',
            'statement earrings',
            'cozy sweaters'
        ];

        if (category) {
            // Filter by category in the future
        }

        return {
            category,
            trending: trendingQueries.slice(0, limit),
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = ExternalProductService;
