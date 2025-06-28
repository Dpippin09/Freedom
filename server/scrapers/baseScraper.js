const puppeteer = require('puppeteer');
const axios = require('axios');

class BaseScraper {
    constructor(options = {}) {
        this.options = {
            timeout: 30000,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            ...options
        };
        this.browser = null;
    }

    async initBrowser() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
        }
        return this.browser;
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async scrapeWithPuppeteer(url, selectors) {
        const browser = await this.initBrowser();
        const page = await browser.newPage();
        
        try {
            await page.setUserAgent(this.options.userAgent);
            await page.setViewport(this.options.viewport);
            
            // Block images and fonts to speed up loading
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (req.resourceType() === 'image' || req.resourceType() === 'font') {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            await page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: this.options.timeout 
            });

            // Wait for content to load
            await page.waitForTimeout(2000);

            const result = await page.evaluate((selectors) => {
                const data = {};
                
                for (const [key, selector] of Object.entries(selectors)) {
                    const element = document.querySelector(selector);
                    if (element) {
                        data[key] = element.textContent.trim();
                    }
                }
                
                return data;
            }, selectors);

            return result;
        } catch (error) {
            console.error(`Puppeteer scraping error for ${url}:`, error.message);
            throw error;
        } finally {
            await page.close();
        }
    }

    async scrapeWithAxios(url, selectors) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': this.options.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: this.options.timeout
            });

            // Simple HTML parsing without cheerio
            const html = response.data;
            const result = {};

            for (const [key, selector] of Object.entries(selectors)) {
                // Basic regex-based extraction for demo purposes
                // This is a simplified approach and won't work for complex selectors
                const match = html.match(new RegExp(`<[^>]*class=[^>]*${selector}[^>]*>([^<]*)</`, 'i'));
                if (match) {
                    result[key] = match[1].trim();
                }
            }

            return result;
        } catch (error) {
            console.error(`Axios scraping error for ${url}:`, error.message);
            throw error;
        }
    }

    extractPrice(priceText) {
        if (!priceText) return null;
        
        // Remove currency symbols and extract numeric value
        const cleanPrice = priceText.replace(/[^\d.,]/g, '');
        const price = parseFloat(cleanPrice.replace(',', ''));
        
        return isNaN(price) ? null : price;
    }

    formatProductData(rawData, retailer, url) {
        return {
            retailer,
            url,
            price: this.extractPrice(rawData.price),
            originalPrice: this.extractPrice(rawData.originalPrice),
            title: rawData.title || '',
            availability: rawData.availability || 'Unknown',
            rating: rawData.rating || null,
            reviews: rawData.reviews || null,
            scrapedAt: new Date().toISOString(),
            currency: 'USD' // Default, can be extracted from price text
        };
    }

    async scrape(url, selectors, usePuppeteer = false) {
        try {
            const rawData = usePuppeteer 
                ? await this.scrapeWithPuppeteer(url, selectors)
                : await this.scrapeWithAxios(url, selectors);
            
            return rawData;
        } catch (error) {
            console.error(`Scraping failed for ${url}:`, error);
            return null;
        }
    }
}

module.exports = BaseScraper;
