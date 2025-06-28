#!/usr/bin/env node

// Quick Analytics API test
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function quickTest() {
    console.log('🧪 Quick Analytics Test');
    
    try {
        // Test global stats (no auth required)
        const globalResponse = await axios.get(`${BASE_URL}/api/analytics/global-stats`);
        console.log('✅ Global stats:', globalResponse.data.success);
        
        // Test market trends (no auth required) 
        const trendsResponse = await axios.get(`${BASE_URL}/api/analytics/market-trends`);
        console.log('✅ Market trends:', trendsResponse.data.success);
        
        console.log('🎉 Public analytics endpoints working!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

quickTest();
