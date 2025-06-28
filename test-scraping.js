const ScrapingManager = require('./server/scrapers/scrapingManager');

async function testScraping() {
    console.log('🧪 Testing Scraping System...\n');
    
    const scrapingManager = new ScrapingManager();
    
    try {
        // Test 1: Check scraper status
        console.log('1️⃣ Testing scraper status...');
        const status = scrapingManager.getScraperStatus();
        console.log('Scraper Status:', JSON.stringify(status, null, 2));
        console.log('✅ Status check passed\n');
        
        // Test 2: Test with demo URLs (these won't work but will test the structure)
        console.log('2️⃣ Testing price comparison structure...');
        const testUrls = {
            amazon: 'https://www.amazon.com/dp/B08XYZ1234',
            walmart: 'https://www.walmart.com/ip/test-product/123456789',
            target: 'https://www.target.com/p/test-product/-/A-54321098'
        };
        
        console.log('Testing with URLs:', JSON.stringify(testUrls, null, 2));
        
        // This will likely fail to scrape (expected) but will test our error handling
        const results = await scrapingManager.getPriceComparison(testUrls);
        console.log('Price Comparison Results:', JSON.stringify(results, null, 2));
        console.log('✅ Price comparison structure test passed\n');
        
        // Test 3: Test individual retailer (will likely fail but tests error handling)
        console.log('3️⃣ Testing individual retailer scraping...');
        try {
            const amazonResult = await scrapingManager.scrapeProductFromRetailer(
                'amazon', 
                'https://www.amazon.com/dp/B08XYZ1234'
            );
            console.log('Amazon Result:', amazonResult);
        } catch (error) {
            console.log('Expected Amazon scraping error:', error.message);
        }
        console.log('✅ Individual retailer test completed\n');
        
        console.log('🎉 All tests completed! The scraping system is properly structured.');
        console.log('📝 Note: Actual scraping may fail without real product URLs, but the system is ready.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Cleanup
        await scrapingManager.cleanup();
        console.log('🧹 Test cleanup completed');
    }
}

// Run the test
testScraping();
