// Demo Helper - Price Alert Demonstration
// This script helps demonstrate the price alert system by simulating price changes

class PriceAlertDemo {
    constructor() {
        this.demoMode = false;
        this.originalPrices = new Map();
    }

    // Enable demo mode with simulated price changes
    enableDemoMode() {
        this.demoMode = true;
        console.log('🎭 Demo mode enabled - simulating price changes');
        
        // Store original prices
        const priceElements = document.querySelectorAll('.current-price');
        priceElements.forEach((element, index) => {
            const price = element.textContent;
            this.originalPrices.set(index, price);
        });

        // Add demo controls
        this.addDemoControls();
    }

    // Disable demo mode and restore original prices
    disableDemoMode() {
        this.demoMode = false;
        console.log('🎭 Demo mode disabled - restoring original prices');
        
        // Restore original prices
        const priceElements = document.querySelectorAll('.current-price');
        priceElements.forEach((element, index) => {
            if (this.originalPrices.has(index)) {
                element.textContent = this.originalPrices.get(index);
            }
        });

        // Remove demo controls
        this.removeDemoControls();
    }

    // Simulate a price drop for demonstration
    simulatePriceDrop(productCard) {
        if (!this.demoMode) return;

        const priceElement = productCard.querySelector('.current-price');
        if (!priceElement) return;

        const currentPrice = parseFloat(priceElement.textContent.replace(/[^0-9.]/g, ''));
        const newPrice = Math.max(currentPrice * 0.7, 5); // 30% discount, minimum $5
        
        // Update the display
        priceElement.textContent = `$${newPrice.toFixed(2)}`;
        priceElement.style.color = '#e74c3c';
        priceElement.style.fontWeight = 'bold';
        
        // Add "PRICE DROP" indicator
        let indicator = productCard.querySelector('.price-drop-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'price-drop-indicator';
            indicator.innerHTML = '🔥 PRICE DROP!';
            indicator.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                background: #e74c3c;
                color: white;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: bold;
                animation: pulse 1.5s infinite;
                z-index: 10;
            `;
            productCard.style.position = 'relative';
            productCard.appendChild(indicator);
        }

        console.log(`💰 Simulated price drop: $${currentPrice.toFixed(2)} → $${newPrice.toFixed(2)}`);
        
        // Simulate alert notification
        this.simulateAlertNotification(productCard, currentPrice, newPrice);
    }

    simulateAlertNotification(productCard, oldPrice, newPrice) {
        const productName = productCard.querySelector('.card-title')?.textContent || 'Product';
        
        // Show notification
        const notification = document.createElement('div');
        notification.className = 'demo-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <strong>🎯 Price Alert Triggered!</strong><br>
                <span class="product-name">${productName}</span><br>
                <span class="price-change">$${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)}</span><br>
                <small>Savings: $${(oldPrice - newPrice).toFixed(2)}</small>
            </div>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            max-width: 300px;
            animation: slideInRight 0.5s ease-out;
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.5s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 500);
            }
        }, 5000);

        // Update notification bell if exists
        const notificationBadge = document.querySelector('.notification-badge');
        if (notificationBadge) {
            const currentCount = parseInt(notificationBadge.textContent) || 0;
            notificationBadge.textContent = currentCount + 1;
            notificationBadge.style.display = 'inline';
        }
    }

    addDemoControls() {
        const demoPanel = document.createElement('div');
        demoPanel.id = 'demoPanel';
        demoPanel.innerHTML = `
            <div class="demo-controls">
                <h4>🎭 Demo Controls</h4>
                <button id="simulateDropBtn" class="demo-btn">Simulate Random Price Drop</button>
                <button id="simulateAllDropsBtn" class="demo-btn">Simulate All Price Drops</button>
                <button id="resetPricesBtn" class="demo-btn">Reset Prices</button>
                <button id="disableDemoBtn" class="demo-btn danger">Disable Demo</button>
            </div>
        `;
        demoPanel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 1001;
            min-width: 250px;
        `;

        document.body.appendChild(demoPanel);

        // Add event listeners
        document.getElementById('simulateDropBtn').onclick = () => this.simulateRandomDrop();
        document.getElementById('simulateAllDropsBtn').onclick = () => this.simulateAllDrops();
        document.getElementById('resetPricesBtn').onclick = () => this.resetAllPrices();
        document.getElementById('disableDemoBtn').onclick = () => this.disableDemoMode();

        // Add CSS for animations
        this.addDemoCSS();
    }

    removeDemoControls() {
        const demoPanel = document.getElementById('demoPanel');
        if (demoPanel) {
            demoPanel.remove();
        }
    }

    simulateRandomDrop() {
        const productCards = document.querySelectorAll('.product-card');
        if (productCards.length > 0) {
            const randomIndex = Math.floor(Math.random() * productCards.length);
            this.simulatePriceDrop(productCards[randomIndex]);
        }
    }

    simulateAllDrops() {
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach((card, index) => {
            setTimeout(() => {
                this.simulatePriceDrop(card);
            }, index * 500); // Stagger the drops
        });
    }

    resetAllPrices() {
        const priceElements = document.querySelectorAll('.current-price');
        priceElements.forEach((element, index) => {
            if (this.originalPrices.has(index)) {
                element.textContent = this.originalPrices.get(index);
                element.style.color = '';
                element.style.fontWeight = '';
            }
        });

        // Remove price drop indicators
        document.querySelectorAll('.price-drop-indicator').forEach(indicator => {
            indicator.remove();
        });
    }

    addDemoCSS() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            
            .demo-btn {
                display: block;
                width: 100%;
                margin: 5px 0;
                padding: 8px 15px;
                border: none;
                border-radius: 5px;
                background: #667eea;
                color: white;
                cursor: pointer;
                font-size: 14px;
            }
            
            .demo-btn:hover {
                background: #5a67d8;
            }
            
            .demo-btn.danger {
                background: #e74c3c;
            }
            
            .demo-btn.danger:hover {
                background: #c0392b;
            }
            
            .demo-controls h4 {
                margin: 0 0 15px 0;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize demo helper
window.PriceAlertDemo = PriceAlertDemo;

// Add demo enabler to console
console.log(`
🎭 Price Alert Demo Helper Available!

To enable demo mode, run:
const demo = new PriceAlertDemo();
demo.enableDemoMode();

This will add demo controls to simulate price drops and alert notifications.
`);
