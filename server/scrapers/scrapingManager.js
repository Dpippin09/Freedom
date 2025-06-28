const { RateLimiterMemory } = require('rate-limiter-flexible');
const { 
    AmazonScraper, 
    EbayScraper, 
    WalmartScraper, 
    TargetScraper 
} = require('./retailerScrapers');

class ScrapingManager {
    constructor() {
        this.scrapers = {
            amazon: new AmazonScraper(),
            ebay: new EbayScraper(),
            walmart: new WalmartScraper(),
            target: new TargetScraper()
        };

        // Rate limiting: 1 request per second per retailer
        this.rateLimiters = {};
        Object.keys(this.scrapers).forEach(retailer => {
            this.rateLimiters[retailer] = new RateLimiterMemory({
                keyType: 'string',
                points: 1, // Number of requests
                duration: 2, // Per 2 seconds
            });
        });

        this.concurrentLimit = 3; // Max concurrent scraping operations
        this.retryAttempts = 3;
        this.retryDelay = 5000; // 5 seconds
    }

    async scrapeProductFromRetailer(retailer, productUrl) {
        if (!this.scrapers[retailer]) {
            throw new Error(`Unsupported retailer: ${retailer}`);
        }

        try {
            // Apply rate limiting
            await this.rateLimiters[retailer].consume(retailer);
            
            const scraper = this.scrapers[retailer];
            const result = await scraper.scrapeProduct(productUrl);
            
            if (result && result.price) {
                console.log(`✅ Successfully scraped ${retailer}: $${result.price}`);
                return result;
            } else {
                console.log(`⚠️ No price found for ${retailer}`);
                return null;
            }
        } catch (error) {
            if (error.remainingHits !== undefined) {
                // Rate limit error
                console.log(`⏰ Rate limited for ${retailer}, waiting...`);
                await new Promise(resolve => setTimeout(resolve, error.msBeforeNext));
                return this.scrapeProductFromRetailer(retailer, productUrl);
            }
            
            console.error(`❌ Error scraping ${retailer}:`, error.message);
            return null;
        }
    }

    async scrapeProductFromMultipleRetailers(productUrls, maxConcurrent = 3) {
        const results = [];
        const promises = [];

        for (const [retailer, url] of Object.entries(productUrls)) {
            if (url && this.scrapers[retailer]) {
                const promise = this.scrapeProductFromRetailer(retailer, url)
                    .then(result => ({ retailer, result, url }))
                    .catch(error => ({ retailer, error: error.message, url }));
                
                promises.push(promise);

                // Limit concurrent operations
                if (promises.length >= maxConcurrent) {
                    const batch = await Promise.allSettled(promises.splice(0, maxConcurrent));
                    results.push(...batch.map(p => p.value || p.reason));
                }
            }
        }

        // Process remaining promises
        if (promises.length > 0) {
            const batch = await Promise.allSettled(promises);
            results.push(...batch.map(p => p.value || p.reason));
        }

        return results.filter(r => r && r.result && !r.error);
    }

    async scrapeProductWithRetry(retailer, productUrl, attempts = 0) {
        try {
            return await this.scrapeProductFromRetailer(retailer, productUrl);
        } catch (error) {
            if (attempts < this.retryAttempts) {
                console.log(`🔄 Retrying ${retailer} (attempt ${attempts + 1}/${this.retryAttempts})`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.scrapeProductWithRetry(retailer, productUrl, attempts + 1);
            }
            throw error;
        }
    }

    async searchProductAcrossRetailers(query, limit = 5) {
        const searchResults = {};
        
        for (const [retailer, scraper] of Object.entries(this.scrapers)) {
            try {
                if (scraper.searchProducts) {
                    await this.rateLimiters[retailer].consume(retailer);
                    searchResults[retailer] = await scraper.searchProducts(query, limit);
                }
            } catch (error) {
                console.error(`Search failed for ${retailer}:`, error.message);
                searchResults[retailer] = [];
            }
        }

        return searchResults;
    }

    async getPriceComparison(productUrls) {
        console.log('🔍 Starting price comparison scraping...');
        
        const results = await this.scrapeProductFromMultipleRetailers(productUrls);
        
        const priceComparison = {
            timestamp: new Date().toISOString(),
            retailers: results.map(r => r.result).filter(Boolean),
            summary: {
                lowestPrice: null,
                highestPrice: null,
                averagePrice: null,
                retailerCount: 0
            }
        };

        if (priceComparison.retailers.length > 0) {
            const prices = priceComparison.retailers
                .map(r => r.price)
                .filter(p => p && p > 0);

            if (prices.length > 0) {
                priceComparison.summary = {
                    lowestPrice: Math.min(...prices),
                    highestPrice: Math.max(...prices),
                    averagePrice: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
                    retailerCount: prices.length
                };
            }
        }

        console.log(`✅ Price comparison complete: ${priceComparison.retailers.length} retailers scraped`);
        return priceComparison;
    }

    async cleanup() {
        console.log('🧹 Cleaning up scrapers...');
        
        for (const scraper of Object.values(this.scrapers)) {
            if (scraper.closeBrowser) {
                await scraper.closeBrowser();
            }
        }
    }

    // Get scraper health status
    getScraperStatus() {
        return Object.keys(this.scrapers).map(retailer => ({
            retailer,
            status: 'active',
            rateLimitRemaining: this.rateLimiters[retailer].points || 0
        }));
    }
}

module.exports = ScrapingManager;
