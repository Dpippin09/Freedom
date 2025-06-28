// Test API endpoints
async function testAPI() {
    try {
        // Test health endpoint
        console.log('Testing /api/health...');
        const healthResponse = await fetch('http://localhost:3000/api/health');
        const health = await healthResponse.json();
        console.log('Health check:', health);

        // Test products endpoint
        console.log('\nTesting /api/products...');
        const productsResponse = await fetch('http://localhost:3000/api/products');
        const products = await productsResponse.json();
        console.log(`Products count: ${products.count}`);
        console.log('First product:', products.products[0].name);

        // Test search
        console.log('\nTesting search for "dress"...');
        const searchResponse = await fetch('http://localhost:3000/api/products?search=dress');
        const searchResults = await searchResponse.json();
        console.log(`Search results: ${searchResults.count} items`);

        // Test category filter
        console.log('\nTesting category filter "shoes"...');
        const categoryResponse = await fetch('http://localhost:3000/api/products?category=shoes');
        const categoryResults = await categoryResponse.json();
        console.log(`Shoes category: ${categoryResults.count} items`);

    } catch (error) {
        console.error('Error testing API:', error);
    }
}

testAPI();
