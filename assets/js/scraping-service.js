// Scraping API service
class ScrapingService {
    constructor() {
        this.baseURL = '/api/scraping';
    }

    async getScrapingStatus() {
        try {
            const response = await fetch(`${this.baseURL}/status`);
            return await response.json();
        } catch (error) {
            console.error('Error getting scraping status:', error);
            throw error;
        }
    }

    async scrapeProduct(productId) {
        try {
            const response = await fetch(`${this.baseURL}/product/${productId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error scraping product:', error);
            throw error;
        }
    }

    async scrapeAllProducts() {
        try {
            const response = await fetch(`${this.baseURL}/all`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error scraping all products:', error);
            throw error;
        }
    }

    async getPriceHistory(productId, days = 30) {
        try {
            const response = await fetch(`${this.baseURL}/history/${productId}?days=${days}`);
            return await response.json();
        } catch (error) {
            console.error('Error getting price history:', error);
            throw error;
        }
    }

    async getLastScrapedInfo(productId = null) {
        try {
            const url = productId 
                ? `${this.baseURL}/last-scraped?productId=${productId}`
                : `${this.baseURL}/last-scraped`;
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error getting last scraped info:', error);
            throw error;
        }
    }

    async startScheduledScraping() {
        try {
            const response = await fetch(`${this.baseURL}/schedule/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error starting scheduled scraping:', error);
            throw error;
        }
    }

    async stopScheduledScraping() {
        try {
            const response = await fetch(`${this.baseURL}/schedule/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error stopping scheduled scraping:', error);
            throw error;
        }
    }

    async testRetailerScraping(retailer, url) {
        try {
            const response = await fetch(`${this.baseURL}/retailer/${retailer}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });
            return await response.json();
        } catch (error) {
            console.error('Error testing retailer scraping:', error);
            throw error;
        }
    }
}

// Export for use in other modules
window.ScrapingService = ScrapingService;
