/**
 * API Test Script
 * Run this in browser console to test API functionality
 */

async function testAPIIntegration() {
    console.log('🧪 Starting API Integration Test...');
    
    // Check if API service is loaded
    if (!window.apiSearchService) {
        console.error('❌ API Search Service not loaded');
        return;
    }
    
    const service = window.apiSearchService;
    console.log('✅ API Search Service loaded');
    
    // Check configuration
    const config = window.API_CONFIG || {};
    console.log('📊 Configuration:', {
        mockMode: config.USE_MOCK_DATA !== false,
        loggingEnabled: config.ENABLE_LOGGING !== false,
        apiKeysConfigured: Object.keys(service.apiKeys).filter(k => 
            service.apiKeys[k] && !service.apiKeys[k].startsWith('YOUR_')
        )
    });
    
    // Test search
    console.log('🔍 Testing search for "Nike shoes"...');
    try {
        const results = await service.searchProducts('Nike shoes', { limit: 5 });
        console.log('✅ Search completed:', {
            query: results.query,
            resultsCount: results.results.length,
            searchTime: results.searchTime + 'ms',
            sources: results.sources,
            hasError: !!results.error
        });
        
        if (results.results.length > 0) {
            console.log('📦 Sample product:', results.results[0]);
        }
        
        return results;
    } catch (error) {
        console.error('❌ Search failed:', error);
        return null;
    }
}

// Run the test
testAPIIntegration().then(results => {
    if (results) {
        console.log('🎉 API Integration Test Completed Successfully!');
    } else {
        console.log('⚠️ API Integration Test Failed');
    }
});

// Helper function to switch between mock and real data
function toggleMockMode() {
    if (window.API_CONFIG) {
        window.API_CONFIG.USE_MOCK_DATA = !window.API_CONFIG.USE_MOCK_DATA;
        console.log(`🔄 Mock mode ${window.API_CONFIG.USE_MOCK_DATA ? 'enabled' : 'disabled'}`);
        console.log('🔄 Reload the page to apply changes');
    }
}

console.log('🧪 API Test Script Loaded');
console.log('Run testAPIIntegration() to test the APIs');
console.log('Run toggleMockMode() to switch between mock and real data');
