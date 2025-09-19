const express = require('express');
const router = express.Router();
const { AmazonScraper, EbayScraper, WalmartScraper, TargetScraper } = require('../scrapers/retailerScrapers');
const ExternalProductService = require('../services/externalProductService');

// Initialize scrapers and service
const scrapers = {
    amazon: new AmazonScraper(),
    ebay: new EbayScraper(),
    walmart: new WalmartScraper(),
    target: new TargetScraper()
};

const externalProductService = new ExternalProductService();

// GET /api/external-products/search - Search for products across multiple retailers
router.get('/search', async (req, res) => {
    try {
        const { query, retailers, limit = 10, category, minPrice, maxPrice } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        console.log(`🔍 External product search: "${query}"`);

        const searchOptions = {
            retailers: retailers ? retailers.split(',') : undefined,
            limit: parseInt(limit),
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            category
        };

        const { results, errors } = await externalProductService.searchProducts(query, searchOptions);

        res.json({
            success: true,
            query,
            filters: { category, minPrice, maxPrice },
            results,
            errors: Object.keys(errors).length > 0 ? errors : undefined,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('External product search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search external products',
            error: error.message
        });
    }
});

// POST /api/external-products/scrape-url - Scrape product info from a specific URL
router.post('/scrape-url', async (req, res) => {
    try {
        const { url, retailer } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'Product URL is required'
            });
        }

        console.log(`🔍 Scraping product from URL: ${url}`);
        
        // Use the enhanced service for better scraping
        const productData = await externalProductService.getProductDetails(url);

        res.json({
            success: true,
            retailer: productData.retailer,
            url,
            product: productData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('URL scraping error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to scrape product URL',
            error: error.message
        });
    }
});

// POST /api/external-products/bulk-import - Import multiple products from URLs
router.post('/bulk-import', async (req, res) => {
    try {
        const { urls, autoDetectRetailer = true } = req.body;

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'URLs array is required'
            });
        }

        if (urls.length > 50) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 50 URLs allowed per request'
            });
        }

        const results = [];
        const errors = [];

        // Process URLs in batches to avoid overwhelming the servers
        const batchSize = 5;
        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (urlItem, index) => {
                try {
                    const url = typeof urlItem === 'string' ? urlItem : urlItem.url;
                    const retailer = typeof urlItem === 'object' ? urlItem.retailer : null;

                    // Auto-detect retailer
                    let detectedRetailer = retailer;
                    if (!detectedRetailer && autoDetectRetailer) {
                        const urlLower = url.toLowerCase();
                        if (urlLower.includes('amazon.com')) detectedRetailer = 'amazon';
                        else if (urlLower.includes('ebay.com')) detectedRetailer = 'ebay';
                        else if (urlLower.includes('walmart.com')) detectedRetailer = 'walmart';
                        else if (urlLower.includes('target.com')) detectedRetailer = 'target';
                    }

                    if (!detectedRetailer || !scrapers[detectedRetailer]) {
                        errors.push({
                            url,
                            error: 'Unsupported retailer'
                        });
                        return;
                    }

                    const productData = await scrapers[detectedRetailer].scrapeProduct(url);
                    
                    if (productData) {
                        results.push({
                            url,
                            retailer: detectedRetailer,
                            product: productData
                        });
                    } else {
                        errors.push({
                            url,
                            error: 'Failed to scrape product data'
                        });
                    }

                } catch (error) {
                    errors.push({
                        url: typeof urlItem === 'string' ? urlItem : urlItem.url,
                        error: error.message
                    });
                }
            });

            await Promise.all(batchPromises);
            
            // Add delay between batches to be respectful to the servers
            if (i + batchSize < urls.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        res.json({
            success: true,
            summary: {
                total: urls.length,
                successful: results.length,
                failed: errors.length
            },
            results,
            errors: errors.length > 0 ? errors : undefined,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to bulk import products',
            error: error.message
        });
    }
});

// GET /api/external-products/retailers - Get supported retailers info
router.get('/retailers', (req, res) => {
    const retailerInfo = Object.keys(scrapers).map(key => ({
        id: key,
        name: scrapers[key].retailer,
        baseUrl: scrapers[key].baseUrl,
        supported: true
    }));

    res.json({
        success: true,
        retailers: retailerInfo,
        count: retailerInfo.length
    });
});

// POST /api/external-products/compare-prices - Compare prices across retailers for similar products
router.post('/compare-prices', async (req, res) => {
    try {
        const { productName, urls } = req.body;

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'URLs array is required for price comparison'
            });
        }

        console.log(`💰 Comparing prices for ${urls.length} products`);
        
        const { comparisons, errors } = await externalProductService.comparePrices(urls);

        res.json({
            success: true,
            productName,
            comparisons,
            lowestPrice: comparisons.length > 0 ? comparisons[0] : null,
            priceRange: comparisons.length > 0 ? {
                min: comparisons[0].price,
                max: comparisons[comparisons.length - 1].price
            } : null,
            errors: errors.length > 0 ? errors : undefined,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Price comparison error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to compare prices',
            error: error.message
        });
    }
});

// GET /api/external-products/trending - Get trending products
router.get('/trending', async (req, res) => {
    try {
        const { category, limit = 20 } = req.query;

        console.log(`📈 Getting trending products for category: ${category || 'all'}`);
        const trendingData = await externalProductService.getTrendingProducts(category, parseInt(limit));

        res.json({
            success: true,
            ...trendingData
        });

    } catch (error) {
        console.error('Trending products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get trending products',
            error: error.message
        });
    }
});

module.exports = router;
