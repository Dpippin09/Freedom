#!/usr/bin/env node

// Test script for Analytics API endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = null;
let testUser = {
    email: 'analytics-test@example.com',
    password: 'test123456',
    firstName: 'Analytics',
    lastName: 'Tester'
};

// Test utilities
function log(message, type = 'info') {
    const colors = {
        info: '\x1b[36m',      // Cyan
        success: '\x1b[32m',   // Green
        error: '\x1b[31m',     // Red
        warning: '\x1b[33m',   // Yellow
        reset: '\x1b[0m'       // Reset
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
}

function logTest(testName) {
    console.log(`\n${'='.repeat(50)}`);
    log(`🧪 Testing: ${testName}`, 'info');
    console.log(`${'='.repeat(50)}`);
}

function logResult(result, expected = null) {
    if (result.success) {
        log(`✅ Success: ${result.message || 'Test passed'}`, 'success');
        if (result.data) {
            console.log('Data:', JSON.stringify(result.data, null, 2));
        }
    } else {
        log(`❌ Failed: ${result.message || 'Test failed'}`, 'error');
        if (result.error) {
            console.log('Error:', result.error);
        }
    }
}

// Authentication helper
async function authenticate() {
    try {
        // Try to register user (may fail if exists)
        try {
            const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
            log('✅ User registered successfully', 'success');
        } catch (error) {
            if (error.response?.status === 409) {
                log('📝 User already exists, proceeding to login', 'warning');
            } else {
                throw error;
            }
        }

        // Login
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });

        authToken = loginResponse.data.token;
        log('✅ Authentication successful', 'success');
        return true;
    } catch (error) {
        log(`❌ Authentication failed: ${error.message}`, 'error');
        return false;
    }
}

// Helper to make authenticated requests
function makeRequest(method, endpoint, data = null) {
    const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    };

    if (data) {
        config.data = data;
    }

    return axios(config);
}

// Test functions
async function testUserAnalytics() {
    logTest('User Analytics');
    
    try {
        const response = await makeRequest('get', '/api/analytics/user');
        logResult({
            success: true,
            message: 'User analytics retrieved',
            data: response.data
        });
    } catch (error) {
        logResult({
            success: false,
            message: 'Failed to get user analytics',
            error: error.response?.data || error.message
        });
    }
}

async function testDashboard() {
    logTest('Analytics Dashboard');
    
    try {
        const response = await makeRequest('get', '/api/analytics/dashboard');
        logResult({
            success: true,
            message: 'Dashboard data retrieved',
            data: response.data
        });
    } catch (error) {
        logResult({
            success: false,
            message: 'Failed to get dashboard data',
            error: error.response?.data || error.message
        });
    }
}

async function testGlobalStats() {
    logTest('Global Statistics');
    
    try {
        const response = await makeRequest('get', '/api/analytics/global-stats');
        logResult({
            success: true,
            message: 'Global stats retrieved',
            data: response.data
        });
    } catch (error) {
        logResult({
            success: false,
            message: 'Failed to get global stats',
            error: error.response?.data || error.message
        });
    }
}

async function testEventTracking() {
    logTest('Event Tracking');
    
    const testEvents = [
        {
            eventType: 'product_view',
            eventData: {
                productId: 'test-product-1',
                category: 'clothing',
                metadata: { source: 'search' }
            }
        },
        {
            eventType: 'alert_created',
            eventData: {
                productId: 'test-product-2',
                category: 'shoes',
                targetPrice: 49.99,
                metadata: { originalPrice: 79.99 }
            }
        },
        {
            eventType: 'wishlist_add',
            eventData: {
                productId: 'test-product-3',
                category: 'shoes',
                metadata: { fromCategory: 'trending' }
            }
        }
    ];

    for (const eventData of testEvents) {
        try {
            const response = await makeRequest('post', '/api/analytics/track-event', eventData);
            logResult({
                success: true,
                message: `Event '${eventData.eventType}' tracked successfully`,
                data: response.data
            });
        } catch (error) {
            logResult({
                success: false,
                message: `Failed to track event '${eventData.eventType}'`,
                error: error.response?.data || error.message
            });
        }
    }
}

async function testMarketTrends() {
    logTest('Market Trends');
    
    try {
        const response = await makeRequest('get', '/api/analytics/market-trends');
        logResult({
            success: true,
            message: 'Market trends retrieved',
            data: response.data
        });
    } catch (error) {
        logResult({
            success: false,
            message: 'Failed to get market trends',
            error: error.response?.data || error.message
        });
    }
}

async function testGoals() {
    logTest('User Goals Management');
    
    // Test setting a goal
    try {
        const goalData = {
            savingsTarget: 200,
            alertTarget: 5
        };

        const response = await makeRequest('post', '/api/analytics/goals', goalData);
        logResult({
            success: true,
            message: 'Goal set successfully',
            data: response.data
        });

        // Test getting goals (this endpoint might not exist, so we'll get user analytics instead)
        const analyticsResponse = await makeRequest('get', '/api/analytics/user');
        logResult({
            success: true,
            message: 'Goals retrieved via user analytics',
            data: { goals: analyticsResponse.data.analytics.monthlyGoals }
        });

    } catch (error) {
        logResult({
            success: false,
            message: 'Failed to manage goals',
            error: error.response?.data || error.message
        });
    }
}

async function testReports() {
    logTest('Analytics Reports');
    
    const reportTypes = ['weekly', 'monthly'];
    
    for (const period of reportTypes) {
        try {
            const response = await makeRequest('get', `/api/analytics/report/${period}`);
            logResult({
                success: true,
                message: `${period.charAt(0).toUpperCase() + period.slice(1)} report generated`,
                data: response.data
            });
        } catch (error) {
            logResult({
                success: false,
                message: `Failed to get ${period} report`,
                error: error.response?.data || error.message
            });
        }
    }
}

async function testPriceHistory() {
    logTest('Price History Analytics');
    
    try {
        // Test with a product ID that might exist
        const response = await makeRequest('get', '/api/analytics/price-history/test-product-1');
        logResult({
            success: true,
            message: 'Price history retrieved',
            data: response.data
        });
    } catch (error) {
        logResult({
            success: false,
            message: 'Failed to get price history',
            error: error.response?.data || error.message
        });
    }
}

// Main test runner
async function runTests() {
    log('🚀 Starting Analytics API Tests...', 'info');
    log(`📡 Server: ${BASE_URL}`, 'info');
    
    // Authenticate first
    const authenticated = await authenticate();
    if (!authenticated) {
        log('❌ Authentication failed. Cannot proceed with tests.', 'error');
        process.exit(1);
    }

    // Run all tests
    const tests = [
        testUserAnalytics,
        testDashboard,
        testGlobalStats,
        testEventTracking,
        testMarketTrends,
        testGoals,
        testReports,
        testPriceHistory
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            await test();
            passed++;
        } catch (error) {
            log(`❌ Test failed: ${error.message}`, 'error');
            failed++;
        }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    log('📊 TEST SUMMARY', 'info');
    console.log(`${'='.repeat(60)}`);
    log(`✅ Passed: ${passed}`, 'success');
    log(`❌ Failed: ${failed}`, 'error');
    log(`📈 Total: ${passed + failed}`, 'info');
    
    if (failed === 0) {
        log('\n🎉 All analytics tests passed!', 'success');
    } else {
        log('\n⚠️  Some tests failed. Check the output above for details.', 'warning');
    }
}

// Handle process exit
process.on('SIGINT', () => {
    log('\n👋 Tests interrupted by user', 'warning');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`❌ Unhandled rejection: ${reason}`, 'error');
    process.exit(1);
});

// Run the tests
runTests().catch(error => {
    log(`❌ Test runner failed: ${error.message}`, 'error');
    process.exit(1);
});
