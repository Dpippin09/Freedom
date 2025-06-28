const cron = require('node-cron');
const ScrapingManager = require('./scrapingManager');
const fs = require('fs').promises;
const path = require('path');

class ScrapingScheduler {
    constructor() {
        this.scrapingManager = new ScrapingManager();
        this.jobs = new Map();
        this.isRunning = false;
        this.dataDir = path.join(__dirname, '../data');
        this.priceHistoryFile = path.join(this.dataDir, 'price-history.json');
        this.lastScrapedFile = path.join(this.dataDir, 'last-scraped.json');
    }

    async initialize() {
        // Ensure data directory exists
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
        } catch (error) {
            console.error('Error creating data directory:', error);
        }

        // Initialize price history file if it doesn't exist
        try {
            await fs.access(this.priceHistoryFile);
        } catch (error) {
            await fs.writeFile(this.priceHistoryFile, JSON.stringify([], null, 2));
        }

        // Initialize last scraped file
        try {
            await fs.access(this.lastScrapedFile);
        } catch (error) {
            await fs.writeFile(this.lastScrapedFile, JSON.stringify({}, null, 2));
        }
    }

    async loadProducts() {
        try {
            const productsPath = path.join(this.dataDir, 'products.json');
            const data = await fs.readFile(productsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading products:', error);
            return [];
        }
    }

    async savePriceHistory(priceData) {
        try {
            const existingData = await fs.readFile(this.priceHistoryFile, 'utf8');
            const history = JSON.parse(existingData);
            
            history.push({
                ...priceData,
                timestamp: new Date().toISOString()
            });

            // Keep only last 1000 entries to prevent file from growing too large
            if (history.length > 1000) {
                history.splice(0, history.length - 1000);
            }

            await fs.writeFile(this.priceHistoryFile, JSON.stringify(history, null, 2));
        } catch (error) {
            console.error('Error saving price history:', error);
        }
    }

    async updateLastScraped(productId, results) {
        try {
            const data = await fs.readFile(this.lastScrapedFile, 'utf8');
            const lastScraped = JSON.parse(data);
            
            lastScraped[productId] = {
                timestamp: new Date().toISOString(),
                results: results.summary,
                retailerCount: results.retailers.length
            };

            await fs.writeFile(this.lastScrapedFile, JSON.stringify(lastScraped, null, 2));
        } catch (error) {
            console.error('Error updating last scraped data:', error);
        }
    }

    async scrapeAllProducts() {
        if (this.isRunning) {
            console.log('⚠️ Scraping already in progress, skipping...');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Starting scheduled scraping of all products...');

        try {
            const products = await this.loadProducts();
            
            for (const product of products) {
                if (product.retailerUrls && Object.keys(product.retailerUrls).length > 0) {
                    console.log(`📦 Scraping prices for: ${product.name}`);
                    
                    const results = await this.scrapingManager.getPriceComparison(product.retailerUrls);
                    
                    if (results.retailers.length > 0) {
                        // Save to price history
                        await this.savePriceHistory({
                            productId: product.id,
                            productName: product.name,
                            priceData: results
                        });

                        // Update last scraped info
                        await this.updateLastScraped(product.id, results);

                        console.log(`✅ Scraped ${results.retailers.length} retailers for ${product.name}`);
                    } else {
                        console.log(`⚠️ No prices found for ${product.name}`);
                    }

                    // Add delay between products to be respectful to retailers
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }

            console.log('✅ Scheduled scraping completed');
        } catch (error) {
            console.error('❌ Error during scheduled scraping:', error);
        } finally {
            this.isRunning = false;
        }
    }

    async scrapeSingleProduct(productId) {
        try {
            const products = await this.loadProducts();
            const product = products.find(p => p.id === productId);
            
            if (!product) {
                throw new Error(`Product with ID ${productId} not found`);
            }

            if (!product.retailerUrls || Object.keys(product.retailerUrls).length === 0) {
                throw new Error(`No retailer URLs configured for product ${productId}`);
            }

            console.log(`🔍 Scraping prices for: ${product.name}`);
            const results = await this.scrapingManager.getPriceComparison(product.retailerUrls);

            if (results.retailers.length > 0) {
                await this.savePriceHistory({
                    productId: product.id,
                    productName: product.name,
                    priceData: results
                });

                await this.updateLastScraped(product.id, results);
            }

            return results;
        } catch (error) {
            console.error(`Error scraping product ${productId}:`, error);
            throw error;
        }
    }

    startScheduledScraping() {
        if (this.jobs.has('daily-scraping')) {
            console.log('📅 Scheduled scraping already running');
            return;
        }

        // Schedule daily scraping at 6 AM
        const dailyJob = cron.schedule('0 6 * * *', async () => {
            await this.scrapeAllProducts();
        }, {
            scheduled: false,
            timezone: "America/New_York"
        });

        // Schedule hourly scraping for featured products (every 2 hours)
        const hourlyJob = cron.schedule('0 */2 * * *', async () => {
            console.log('🕐 Running hourly featured products scraping...');
            const products = await this.loadProducts();
            const featuredProducts = products.filter(p => p.featured).slice(0, 5);
            
            for (const product of featuredProducts) {
                if (product.retailerUrls && Object.keys(product.retailerUrls).length > 0) {
                    try {
                        await this.scrapeSingleProduct(product.id);
                    } catch (error) {
                        console.error(`Error scraping featured product ${product.id}:`, error);
                    }
                }
            }
        }, {
            scheduled: false,
            timezone: "America/New_York"
        });

        this.jobs.set('daily-scraping', dailyJob);
        this.jobs.set('hourly-scraping', hourlyJob);

        // Start the jobs
        dailyJob.start();
        hourlyJob.start();

        console.log('📅 Scheduled scraping started:');
        console.log('  - Daily full scraping at 6:00 AM');
        console.log('  - Hourly featured products scraping every 2 hours');
    }

    stopScheduledScraping() {
        for (const [name, job] of this.jobs) {
            job.stop();
            console.log(`⏹️ Stopped ${name}`);
        }
        this.jobs.clear();
    }

    async getPriceHistory(productId, days = 30) {
        try {
            const data = await fs.readFile(this.priceHistoryFile, 'utf8');
            const history = JSON.parse(data);
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            return history
                .filter(entry => 
                    entry.productId === productId && 
                    new Date(entry.timestamp) >= cutoffDate
                )
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        } catch (error) {
            console.error('Error loading price history:', error);
            return [];
        }
    }

    async getLastScrapedInfo(productId = null) {
        try {
            const data = await fs.readFile(this.lastScrapedFile, 'utf8');
            const lastScraped = JSON.parse(data);
            
            if (productId) {
                return lastScraped[productId] || null;
            }
            
            return lastScraped;
        } catch (error) {
            console.error('Error loading last scraped info:', error);
            return productId ? null : {};
        }
    }

    getSchedulerStatus() {
        return {
            isRunning: this.isRunning,
            activeJobs: Array.from(this.jobs.keys()),
            scrapingInProgress: this.isRunning
        };
    }

    async cleanup() {
        this.stopScheduledScraping();
        await this.scrapingManager.cleanup();
    }
}

module.exports = ScrapingScheduler;
