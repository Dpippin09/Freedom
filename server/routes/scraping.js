const express = require('express');
const router = express.Router();
const ScrapingScheduler = require('../scrapers/scrapingScheduler');

let scrapingScheduler = null;

// Initialize scraping scheduler
const initializeScheduler = async () => {
    if (!scrapingScheduler) {
        scrapingScheduler = new ScrapingScheduler();
        await scrapingScheduler.initialize();
        
        // Start scheduled scraping if enabled in environment
        if (process.env.ENABLE_SCHEDULED_SCRAPING === 'true') {
            scrapingScheduler.startScheduledScraping();
        }
    }
    return scrapingScheduler;
};

// GET /api/scraping/status - Get scraping system status
router.get('/status', async (req, res) => {
    try {
        const scheduler = await initializeScheduler();
        const status = scheduler.getSchedulerStatus();
        const scraperStatus = scheduler.scrapingManager.getScraperStatus();
        
        res.json({
            success: true,
            scheduler: status,
            scrapers: scraperStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting scraping status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get scraping status',
            error: error.message
        });
    }
});

// POST /api/scraping/product/:id - Scrape prices for a specific product
router.post('/product/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const scheduler = await initializeScheduler();
        
        console.log(`🔍 Manual scraping requested for product ID: ${productId}`);
        
        const results = await scheduler.scrapeSingleProduct(productId);
        
        res.json({
            success: true,
            productId,
            results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error scraping product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to scrape product prices',
            error: error.message
        });
    }
});

// POST /api/scraping/all - Trigger scraping for all products
router.post('/all', async (req, res) => {
    try {
        const scheduler = await initializeScheduler();
        
        // Start scraping in background
        scheduler.scrapeAllProducts().catch(error => {
            console.error('Background scraping error:', error);
        });
        
        res.json({
            success: true,
            message: 'Scraping started for all products',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error starting scraping:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start scraping',
            error: error.message
        });
    }
});

// GET /api/scraping/history/:productId - Get price history for a product
router.get('/history/:productId', async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        const days = parseInt(req.query.days) || 30;
        
        const scheduler = await initializeScheduler();
        const history = await scheduler.getPriceHistory(productId, days);
        
        res.json({
            success: true,
            productId,
            days,
            history,
            count: history.length
        });
    } catch (error) {
        console.error('Error getting price history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get price history',
            error: error.message
        });
    }
});

// GET /api/scraping/last-scraped - Get last scraped information
router.get('/last-scraped', async (req, res) => {
    try {
        const productId = req.query.productId ? parseInt(req.query.productId) : null;
        const scheduler = await initializeScheduler();
        
        const lastScraped = await scheduler.getLastScrapedInfo(productId);
        
        res.json({
            success: true,
            lastScraped
        });
    } catch (error) {
        console.error('Error getting last scraped info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get last scraped information',
            error: error.message
        });
    }
});

// POST /api/scraping/schedule/start - Start scheduled scraping
router.post('/schedule/start', async (req, res) => {
    try {
        const scheduler = await initializeScheduler();
        scheduler.startScheduledScraping();
        
        res.json({
            success: true,
            message: 'Scheduled scraping started',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error starting scheduled scraping:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start scheduled scraping',
            error: error.message
        });
    }
});

// POST /api/scraping/schedule/stop - Stop scheduled scraping
router.post('/schedule/stop', async (req, res) => {
    try {
        const scheduler = await initializeScheduler();
        scheduler.stopScheduledScraping();
        
        res.json({
            success: true,
            message: 'Scheduled scraping stopped',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error stopping scheduled scraping:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to stop scheduled scraping',
            error: error.message
        });
    }
});

// POST /api/scraping/retailer/:retailer - Test scraping a specific retailer
router.post('/retailer/:retailer', async (req, res) => {
    try {
        const retailer = req.params.retailer.toLowerCase();
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL is required in request body'
            });
        }
        
        const scheduler = await initializeScheduler();
        const result = await scheduler.scrapingManager.scrapeProductFromRetailer(retailer, url);
        
        res.json({
            success: true,
            retailer,
            url,
            result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error testing retailer scraping:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test retailer scraping',
            error: error.message
        });
    }
});

// Cleanup on server shutdown
process.on('SIGINT', async () => {
    if (scrapingScheduler) {
        console.log('🧹 Cleaning up scraping resources...');
        await scrapingScheduler.cleanup();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    if (scrapingScheduler) {
        await scrapingScheduler.cleanup();
    }
    process.exit(0);
});

module.exports = router;
