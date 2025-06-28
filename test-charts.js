#!/usr/bin/env node

// Charts Integration Test
const puppeteer = require('puppeteer');

async function testChartsIntegration() {
    console.log('🎨 Testing Charts Integration...');
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    try {
        const page = await browser.newPage();
        
        // Navigate to the site
        console.log('📱 Opening site...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        
        // Check if Chart.js is loaded
        const chartJsLoaded = await page.evaluate(() => {
            return typeof window.Chart !== 'undefined';
        });
        
        console.log(`📊 Chart.js loaded: ${chartJsLoaded ? '✅' : '❌'}`);
        
        // Check if our chart services are loaded
        const chartsServiceLoaded = await page.evaluate(() => {
            return typeof window.ChartsService !== 'undefined';
        });
        
        console.log(`🔧 ChartsService loaded: ${chartsServiceLoaded ? '✅' : '❌'}`);
        
        const chartsUILoaded = await page.evaluate(() => {
            return typeof window.ChartsUI !== 'undefined';
        });
        
        console.log(`🎨 ChartsUI loaded: ${chartsUILoaded ? '✅' : '❌'}`);
        
        // Try to register a test user
        console.log('👤 Attempting to register test user...');
        
        // Click Login/Signup
        await page.click('a[href="login-signup.html"]');
        await page.waitForTimeout(1000);
        
        // Check if we have a login modal or need to navigate
        const modalExists = await page.$('.auth-modal');
        
        if (modalExists) {
            // Fill registration form in modal
            await page.type('#registerEmail', 'charttest@example.com');
            await page.type('#registerPassword', 'test123456');
            await page.type('#registerFirstName', 'Chart');
            await page.type('#registerLastName', 'Tester');
            
            // Submit registration
            await page.click('#registerForm button[type="submit"]');
            await page.waitForTimeout(2000);
        } else {
            console.log('⚠️ Modal not found, charts testing will be limited');
        }
        
        // Look for analytics button
        const analyticsButton = await page.$('.analytics-btn');
        if (analyticsButton) {
            console.log('📊 Analytics button found! ✅');
            
            // Click analytics button
            await page.click('.analytics-btn');
            await page.waitForTimeout(2000);
            
            // Check for charts section
            const chartsSection = await page.$('.analytics-charts-section');
            if (chartsSection) {
                console.log('🎨 Charts section found! ✅');
                
                // Check for chart tabs
                const chartTabs = await page.$$('.chart-tab');
                console.log(`📋 Chart tabs found: ${chartTabs.length}`);
                
                // Check for chart containers
                const chartContainers = await page.$$('.chart-container');
                console.log(`📊 Chart containers found: ${chartContainers.length}`);
                
                // Test tab switching
                if (chartTabs.length > 1) {
                    console.log('🔄 Testing tab switching...');
                    await chartTabs[1].click();
                    await page.waitForTimeout(1000);
                    
                    await chartTabs[2]?.click();
                    await page.waitForTimeout(1000);
                    
                    console.log('✅ Tab switching tested');
                }
                
                // Check for actual chart canvases
                const chartCanvases = await page.$$('canvas');
                console.log(`🎨 Chart canvases found: ${chartCanvases.length}`);
                
                if (chartCanvases.length > 0) {
                    console.log('✅ Charts are rendering!');
                } else {
                    console.log('⚠️ Charts may not be rendering properly');
                }
                
            } else {
                console.log('❌ Charts section not found');
            }
        } else {
            console.log('❌ Analytics button not found');
        }
        
        console.log('\n🎉 Charts integration test completed!');
        console.log('💡 Check the browser window to see the visual results');
        
        // Keep browser open for manual inspection
        console.log('🔍 Browser kept open for manual inspection...');
        await page.waitForTimeout(10000);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

// Check if puppeteer is available
try {
    testChartsIntegration();
} catch (error) {
    console.log('⚠️ Puppeteer not available, manual testing required');
    console.log('📱 Please open http://localhost:3000 and test charts manually:');
    console.log('1. Register/login to an account');
    console.log('2. Click the Analytics button (📊)');
    console.log('3. Look for the Visual Analytics section with charts');
    console.log('4. Test the Overview, Trends, and Goals tabs');
    console.log('5. Verify charts are rendering properly');
}
