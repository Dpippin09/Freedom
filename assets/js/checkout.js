/**
 * Checkout Page Functionality
 * Handles cart management, form validation, and payment processing
 */

class CheckoutManager {
    constructor() {
        this.cart = this.loadCart();
        this.shippingCost = 0;
        this.taxRate = 0.08; // 8% tax rate
        this.initializeCheckout();
    }

    /**
     * Initialize checkout functionality
     */
    initializeCheckout() {
        this.renderCartItems();
        this.setupEventListeners();
        this.calculateTotals();
        this.initializeFormValidation();
    }

    /**
     * Load cart from localStorage or create default cart for demo
     */
    loadCart() {
        const savedCart = localStorage.getItem('stylelink_cart');
        if (savedCart) {
            return JSON.parse(savedCart);
        }
        
        // Demo cart for development
        return [
            {
                id: 1,
                name: 'Designer Summer Dress',
                price: 89.99,
                quantity: 1,
                size: 'M',
                color: 'Lavender',
                image: './assets/images/Snatched.jpg',
                category: 'clothing'
            }
        ];
    }

    /**
     * Save cart to localStorage
     */
    saveCart() {
        localStorage.setItem('stylelink_cart', JSON.stringify(this.cart));
    }

    /**
     * Render cart items in the order summary
     */
    renderCartItems() {
        const cartItemsContainer = document.getElementById('cart-items');
        
        if (this.cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <p>Your cart is empty</p>
                    <a href="index.html" class="continue-shopping">Continue Shopping</a>
                </div>
            `;
            return;
        }

        cartItemsContainer.innerHTML = this.cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="item-image">
                <div class="item-details">
                    <h3>${item.name}</h3>
                    <p class="item-size">Size: ${item.size}</p>
                    <p class="item-color">Color: ${item.color}</p>
                    <div class="quantity-controls">
                        <button class="qty-btn" data-action="decrease" data-id="${item.id}">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="qty-btn" data-action="increase" data-id="${item.id}">+</button>
                    </div>
                </div>
                <div class="item-price">
                    <span class="price">$${(item.price * item.quantity).toFixed(2)}</span>
                    <button class="remove-item" data-id="${item.id}" aria-label="Remove item">×</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Setup event listeners for checkout interactions
     */
    setupEventListeners() {
        // Quantity controls
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('qty-btn')) {
                const action = e.target.dataset.action;
                const itemId = parseInt(e.target.dataset.id);
                this.updateQuantity(itemId, action);
            }
        });

        // Remove item
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item')) {
                const itemId = parseInt(e.target.dataset.id);
                this.removeItem(itemId);
            }
        });

        // Shipping method selection
        document.addEventListener('change', (e) => {
            if (e.target.name === 'shipping') {
                this.updateShipping(e.target.value);
            }
        });

        // Payment method selection
        document.addEventListener('change', (e) => {
            if (e.target.name === 'paymentMethod') {
                this.togglePaymentDetails(e.target.value);
            }
        });

        // Billing address toggle
        const sameAsShippingCheckbox = document.getElementById('sameAsShipping');
        if (sameAsShippingCheckbox) {
            sameAsShippingCheckbox.addEventListener('change', (e) => {
                this.toggleBillingAddress(e.target.checked);
            });
        }

        // Promo code application
        document.querySelector('.apply-promo').addEventListener('click', () => {
            this.applyPromoCode();
        });

        // Form submission
        document.getElementById('checkout-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.processOrder();
        });

        // Card number formatting
        const cardNumberInput = document.getElementById('cardNumber');
        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', this.formatCardNumber);
        }

        // Card expiry formatting
        const cardExpiryInput = document.getElementById('cardExpiry');
        if (cardExpiryInput) {
            cardExpiryInput.addEventListener('input', this.formatCardExpiry);
        }
    }

    /**
     * Update item quantity
     */
    updateQuantity(itemId, action) {
        const item = this.cart.find(item => item.id === itemId);
        if (!item) return;

        if (action === 'increase') {
            item.quantity += 1;
        } else if (action === 'decrease' && item.quantity > 1) {
            item.quantity -= 1;
        }

        this.saveCart();
        this.renderCartItems();
        this.calculateTotals();
    }

    /**
     * Remove item from cart
     */
    removeItem(itemId) {
        this.cart = this.cart.filter(item => item.id !== itemId);
        this.saveCart();
        this.renderCartItems();
        this.calculateTotals();
    }

    /**
     * Update shipping cost based on selected method
     */
    updateShipping(shippingMethod) {
        const shippingCosts = {
            'free': 0,
            'express': 9.99,
            'overnight': 19.99
        };

        this.shippingCost = shippingCosts[shippingMethod] || 0;
        this.calculateTotals();

        // Update shipping method display
        document.querySelectorAll('.shipping-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector(`input[value="${shippingMethod}"]`).closest('.shipping-option').classList.add('selected');
    }

    /**
     * Toggle payment method details
     */
    togglePaymentDetails(paymentMethod) {
        const cardDetails = document.getElementById('card-details');
        
        if (paymentMethod === 'card') {
            cardDetails.style.display = 'block';
        } else {
            cardDetails.style.display = 'none';
        }

        // Update payment method display
        document.querySelectorAll('.payment-method').forEach(method => {
            method.classList.remove('selected');
        });
        document.querySelector(`input[value="${paymentMethod}"]`).closest('.payment-method').classList.add('selected');
    }

    /**
     * Toggle billing address fields
     */
    toggleBillingAddress(sameAsShipping) {
        const billingFields = document.getElementById('billingFields');
        billingFields.style.display = sameAsShipping ? 'none' : 'block';
    }

    /**
     * Calculate and display order totals
     */
    calculateTotals() {
        const subtotal = this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        const tax = subtotal * this.taxRate;
        const total = subtotal + this.shippingCost + tax;

        // Update display
        document.querySelector('.subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.querySelector('.shipping').textContent = this.shippingCost === 0 ? 'FREE' : `$${this.shippingCost.toFixed(2)}`;
        document.querySelector('.tax').textContent = `$${tax.toFixed(2)}`;
        document.querySelector('.final-total').textContent = `$${total.toFixed(2)}`;
        
        // Update button total
        const completeOrderBtn = document.getElementById('completeOrderBtn');
        if (completeOrderBtn) {
            completeOrderBtn.querySelector('.btn-total').textContent = `$${total.toFixed(2)}`;
        }
    }

    /**
     * Apply promo code
     */
    applyPromoCode() {
        const promoInput = document.querySelector('.promo-input');
        const promoCode = promoInput.value.trim().toLowerCase();
        
        // Demo promo codes
        const promoCodes = {
            'welcome10': { discount: 0.10, description: '10% off your first order' },
            'save20': { discount: 0.20, description: '20% off everything' },
            'freeship': { discount: 0, freeShipping: true, description: 'Free shipping' }
        };

        if (promoCodes[promoCode]) {
            const promo = promoCodes[promoCode];
            
            if (promo.freeShipping) {
                this.shippingCost = 0;
                document.querySelector('input[value="free"]').checked = true;
                this.updateShipping('free');
            }
            
            // Show success message
            this.showPromoMessage(`✅ Promo code applied: ${promo.description}`, 'success');
            promoInput.value = '';
        } else {
            this.showPromoMessage('❌ Invalid promo code', 'error');
        }
    }

    /**
     * Show promo code message
     */
    showPromoMessage(message, type) {
        const existingMessage = document.querySelector('.promo-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageEl = document.createElement('div');
        messageEl.className = `promo-message ${type}`;
        messageEl.textContent = message;
        
        document.querySelector('.promo-code').appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }

    /**
     * Format card number input
     */
    formatCardNumber(e) {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
        e.target.value = value;
    }

    /**
     * Format card expiry input
     */
    formatCardExpiry(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
    }

    /**
     * Initialize form validation
     */
    initializeFormValidation() {
        const form = document.getElementById('checkout-form');
        const inputs = form.querySelectorAll('input[required]');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });
    }

    /**
     * Validate individual form field
     */
    validateField(field) {
        const isValid = field.checkValidity();
        
        if (isValid) {
            field.classList.remove('error');
            field.classList.add('valid');
        } else {
            field.classList.remove('valid');
            field.classList.add('error');
        }
        
        return isValid;
    }

    /**
     * Process order submission
     */
    async processOrder() {
        const form = document.getElementById('checkout-form');
        const formData = new FormData(form);
        
        // Validate form
        const isValid = form.checkValidity();
        if (!isValid) {
            form.reportValidity();
            return;
        }

        // Show loading state
        const submitBtn = document.getElementById('completeOrderBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
        submitBtn.disabled = true;

        try {
            // Simulate API call
            await this.submitOrder(formData);
            
            // Success - redirect to confirmation page
            this.showOrderSuccess();
            
        } catch (error) {
            console.error('Order submission failed:', error);
            this.showOrderError();
        } finally {
            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    /**
     * Submit order to backend (simulated)
     */
    async submitOrder(formData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const orderData = {
            items: this.cart,
            customer: {
                email: formData.get('email'),
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                phone: formData.get('phone')
            },
            shipping: {
                address: formData.get('address'),
                apartment: formData.get('apartment'),
                city: formData.get('city'),
                state: formData.get('state'),
                zip: formData.get('zip'),
                method: formData.get('shipping')
            },
            payment: {
                method: formData.get('paymentMethod')
            },
            totals: {
                subtotal: this.cart.reduce((total, item) => total + (item.price * item.quantity), 0),
                shipping: this.shippingCost,
                tax: this.cart.reduce((total, item) => total + (item.price * item.quantity), 0) * this.taxRate,
                total: this.cart.reduce((total, item) => total + (item.price * item.quantity), 0) + this.shippingCost + (this.cart.reduce((total, item) => total + (item.price * item.quantity), 0) * this.taxRate)
            }
        };

        // Store order for confirmation page
        localStorage.setItem('stylelink_last_order', JSON.stringify(orderData));
        
        // Clear cart
        this.cart = [];
        this.saveCart();
        
        return orderData;
    }

    /**
     * Show order success
     */
    showOrderSuccess() {
        // Create success modal
        const modal = document.createElement('div');
        modal.className = 'order-success-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="success-icon">✅</div>
                <h2>Order Confirmed!</h2>
                <p>Thank you for your purchase. You'll receive a confirmation email shortly.</p>
                <div class="success-actions">
                    <a href="index.html" class="btn-primary">Continue Shopping</a>
                    <button onclick="window.print()" class="btn-secondary">Print Receipt</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-redirect after 5 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 5000);
    }

    /**
     * Show order error
     */
    showOrderError() {
        const modal = document.createElement('div');
        modal.className = 'order-error-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="error-icon">❌</div>
                <h2>Order Failed</h2>
                <p>There was an issue processing your order. Please try again or contact support.</p>
                <button onclick="this.parentElement.parentElement.remove()" class="btn-primary">Try Again</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Add item to cart (for use from other pages)
     */
    static addToCart(item) {
        const cart = JSON.parse(localStorage.getItem('stylelink_cart') || '[]');
        
        // Check if item already exists
        const existingItem = cart.find(cartItem => cartItem.id === item.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                ...item,
                quantity: 1,
                id: item.id || Date.now()
            });
        }
        
        localStorage.setItem('stylelink_cart', JSON.stringify(cart));
        
        // Dispatch cart update event
        window.dispatchEvent(new CustomEvent('cartUpdated'));
        
        // Show added to cart notification
        CheckoutManager.showCartNotification(`${item.name} added to cart!`);
    }

    /**
     * Show cart notification
     */
    static showCartNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize checkout manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('checkout-page') || window.location.pathname.includes('checkout')) {
        window.checkoutManager = new CheckoutManager();
    }
});

// Export for use in other scripts
window.CheckoutManager = CheckoutManager;
