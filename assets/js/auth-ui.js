// Authentication UI Manager
class AuthUI {
    constructor() {
        this.authService = new AuthService();
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Check if user is already authenticated
        if (this.authService.isAuthenticated()) {
            try {
                const result = await this.authService.verifyToken();
                if (result.success) {
                    this.currentUser = result.user;
                    this.updateUIForAuthenticatedUser();
                } else {
                    this.updateUIForUnauthenticatedUser();
                }
            } catch (error) {
                console.error('Token verification failed:', error);
                this.updateUIForUnauthenticatedUser();
            }
        } else {
            this.updateUIForUnauthenticatedUser();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for auth state changes
        this.authService.onAuthStateChange((isAuthenticated, user) => {
            if (isAuthenticated) {
                this.currentUser = user;
                this.updateUIForAuthenticatedUser();
            } else {
                this.currentUser = null;
                this.updateUIForUnauthenticatedUser();
            }
        });
    }

    updateUIForAuthenticatedUser() {
        // Update navigation
        this.updateNavigation(true);
        
        // Add user menu
        this.addUserMenu();
        
        // Show user-specific features
        this.showUserFeatures();
        
        console.log('✅ User authenticated:', this.currentUser.firstName);
    }

    updateUIForUnauthenticatedUser() {
        // Update navigation
        this.updateNavigation(false);
        
        // Remove user menu
        this.removeUserMenu();
        
        // Hide user-specific features
        this.hideUserFeatures();
    }

    updateNavigation(isAuthenticated) {
        const loginSignupLink = document.querySelector('.login-signup');
        if (loginSignupLink) {
            if (isAuthenticated) {
                loginSignupLink.style.display = 'none';
            } else {
                loginSignupLink.style.display = 'block';
                loginSignupLink.onclick = (e) => {
                    e.preventDefault();
                    this.showLoginModal();
                };
            }
        }
    }

    addUserMenu() {
        // Remove existing user menu
        this.removeUserMenu();

        const navLinks = document.querySelector('.nav-links');
        if (navLinks && this.currentUser) {
            const userMenu = document.createElement('li');
            userMenu.className = 'user-menu dropdown';
            userMenu.innerHTML = `
                <a href="#" class="user-menu-toggle">
                    👤 ${this.currentUser.firstName}
                    <span class="dropdown-arrow">▼</span>
                </a>
                <div class="dropdown-content">
                    <a href="#" id="profileLink">My Profile</a>
                    <a href="#" id="wishlistLink">My Wishlist</a>
                    <a href="#" id="settingsLink">Settings</a>
                    <hr>
                    <a href="#" id="logoutLink">Logout</a>
                </div>
            `;

            navLinks.appendChild(userMenu);

            // Add event listeners
            document.getElementById('profileLink').onclick = (e) => {
                e.preventDefault();
                this.showProfileModal();
            };

            document.getElementById('wishlistLink').onclick = (e) => {
                e.preventDefault();
                this.showWishlistModal();
            };

            document.getElementById('settingsLink').onclick = (e) => {
                e.preventDefault();
                this.showSettingsModal();
            };

            document.getElementById('logoutLink').onclick = (e) => {
                e.preventDefault();
                this.handleLogout();
            };

            // Toggle dropdown
            const toggle = userMenu.querySelector('.user-menu-toggle');
            toggle.onclick = (e) => {
                e.preventDefault();
                userMenu.classList.toggle('active');
            };

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!userMenu.contains(e.target)) {
                    userMenu.classList.remove('active');
                }
            });
        }
    }

    removeUserMenu() {
        const existingMenu = document.querySelector('.user-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }

    showUserFeatures() {
        // Add wishlist buttons to product cards
        this.addWishlistButtons();
    }

    hideUserFeatures() {
        // Remove wishlist buttons
        this.removeWishlistButtons();
    }

    addWishlistButtons() {
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            if (!card.querySelector('.wishlist-btn')) {
                const productId = card.dataset.productId;
                if (productId) {
                    const wishlistBtn = document.createElement('button');
                    wishlistBtn.className = 'wishlist-btn';
                    wishlistBtn.innerHTML = '❤️ Add to Wishlist';
                    wishlistBtn.onclick = () => this.toggleWishlist(productId, wishlistBtn);

                    const cardActions = card.querySelector('.card-actions') || card;
                    cardActions.appendChild(wishlistBtn);
                }
            }
        });
    }

    removeWishlistButtons() {
        const wishlistBtns = document.querySelectorAll('.wishlist-btn');
        wishlistBtns.forEach(btn => btn.remove());
    }

    async toggleWishlist(productId, button) {
        try {
            const isInWishlist = button.classList.contains('in-wishlist');
            
            if (isInWishlist) {
                await this.authService.removeFromWishlist(productId);
                button.innerHTML = '❤️ Add to Wishlist';
                button.classList.remove('in-wishlist');
            } else {
                await this.authService.addToWishlist(productId);
                button.innerHTML = '💖 In Wishlist';
                button.classList.add('in-wishlist');
            }
        } catch (error) {
            console.error('Wishlist toggle error:', error);
            alert('Failed to update wishlist. Please try again.');
        }
    }

    showLoginModal() {
        const modal = this.createModal('Login to Snatched It', `
            <form id="loginForm">
                <div class="form-group">
                    <label for="loginEmail">Email:</label>
                    <input type="email" id="loginEmail" required>
                </div>
                <div class="form-group">
                    <label for="loginPassword">Password:</label>
                    <input type="password" id="loginPassword" required>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Login</button>
                    <button type="button" id="showRegisterBtn" class="btn-secondary">
                        Don't have an account? Register
                    </button>
                </div>
            </form>
        `);

        // Handle form submission
        document.getElementById('loginForm').onsubmit = async (e) => {
            e.preventDefault();
            await this.handleLogin();
        };

        // Show register modal
        document.getElementById('showRegisterBtn').onclick = () => {
            modal.remove();
            this.showRegisterModal();
        };
    }

    showRegisterModal() {
        const modal = this.createModal('Register for Snatched It', `
            <form id="registerForm">
                <div class="form-group">
                    <label for="registerFirstName">First Name:</label>
                    <input type="text" id="registerFirstName" required>
                </div>
                <div class="form-group">
                    <label for="registerLastName">Last Name:</label>
                    <input type="text" id="registerLastName" required>
                </div>
                <div class="form-group">
                    <label for="registerEmail">Email:</label>
                    <input type="email" id="registerEmail" required>
                </div>
                <div class="form-group">
                    <label for="registerPassword">Password:</label>
                    <input type="password" id="registerPassword" required minlength="6">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Register</button>
                    <button type="button" id="showLoginBtn" class="btn-secondary">
                        Already have an account? Login
                    </button>
                </div>
            </form>
        `);

        // Handle form submission
        document.getElementById('registerForm').onsubmit = async (e) => {
            e.preventDefault();
            await this.handleRegister();
        };

        // Show login modal
        document.getElementById('showLoginBtn').onclick = () => {
            modal.remove();
            this.showLoginModal();
        };
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const result = await this.authService.login(email, password);
            
            if (result.success) {
                this.currentUser = result.user;
                this.updateUIForAuthenticatedUser();
                this.closeModal();
                this.showSuccessMessage(`Welcome back, ${result.user.firstName}!`);
            } else {
                this.showErrorMessage(result.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showErrorMessage('Login failed. Please try again.');
        }
    }

    async handleRegister() {
        const firstName = document.getElementById('registerFirstName').value;
        const lastName = document.getElementById('registerLastName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            const result = await this.authService.register({
                firstName,
                lastName,
                email,
                password
            });
            
            if (result.success) {
                this.currentUser = result.user;
                this.updateUIForAuthenticatedUser();
                this.closeModal();
                this.showSuccessMessage(`Welcome to Snatched It, ${result.user.firstName}!`);
            } else {
                this.showErrorMessage(result.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showErrorMessage('Registration failed. Please try again.');
        }
    }

    async handleLogout() {
        try {
            await this.authService.logout();
            this.currentUser = null;
            this.updateUIForUnauthenticatedUser();
            this.showSuccessMessage('You have been logged out successfully.');
        } catch (error) {
            console.error('Logout error:', error);
            // Still update UI even if request fails
            this.currentUser = null;
            this.updateUIForUnauthenticatedUser();
        }
    }

    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal functionality
        modal.querySelector('.close-modal').onclick = () => {
            this.closeModal();
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        };

        return modal;
    }

    closeModal() {
        const modal = document.querySelector('.auth-modal');
        if (modal) {
            modal.remove();
        }
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1001;
            max-width: 300px;
            ${type === 'success' ? 'background: #4CAF50;' : 'background: #f44336;'}
        `;

        document.body.appendChild(messageEl);

        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 4000);
    }

    showProfileModal() {
        if (!this.currentUser) return;

        const modal = this.createModal('My Profile', `
            <div class="profile-info">
                <div class="profile-header">
                    <div class="profile-avatar">
                        <span class="avatar-text">${this.currentUser.firstName[0]}${this.currentUser.lastName[0]}</span>
                    </div>
                    <div class="profile-details">
                        <h4>${this.currentUser.firstName} ${this.currentUser.lastName}</h4>
                        <p class="email">${this.currentUser.email}</p>
                        <p class="member-since">Member since: ${new Date(this.currentUser.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                
                <div class="profile-stats">
                    <div class="stat-item">
                        <span class="stat-value">${this.currentUser.wishlist ? this.currentUser.wishlist.length : 0}</span>
                        <span class="stat-label">Wishlist Items</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="alertCount">0</span>
                        <span class="stat-label">Price Alerts</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="notificationCount">0</span>
                        <span class="stat-label">Notifications</span>
                    </div>
                </div>

                <div class="profile-actions">
                    <button id="editProfileBtn" class="btn-secondary">Edit Profile</button>
                    <button id="changePasswordBtn" class="btn-secondary">Change Password</button>
                    <button id="manageAlertsBtn" class="btn-secondary">Manage Alerts</button>
                </div>
            </div>
        `);

        // Load alert and notification stats
        this.loadProfileStats();

        // Add event listeners
        document.getElementById('editProfileBtn').onclick = () => {
            modal.remove();
            this.showEditProfileModal();
        };

        document.getElementById('changePasswordBtn').onclick = () => {
            modal.remove();
            this.showChangePasswordModal();
        };

        document.getElementById('manageAlertsBtn').onclick = () => {
            modal.remove();
            this.showManageAlertsModal();
        };
    }

    async loadProfileStats() {
        if (window.PriceAlertService) {
            try {
                const alertService = new PriceAlertService();
                
                // Load alert stats
                const alertStats = await alertService.getAlertStats();
                if (alertStats.success) {
                    const alertCountEl = document.getElementById('alertCount');
                    if (alertCountEl) {
                        alertCountEl.textContent = alertStats.stats.total || 0;
                    }
                }

                // Load notification stats
                const notificationStats = await alertService.getNotificationStats();
                if (notificationStats.success) {
                    const notificationCountEl = document.getElementById('notificationCount');
                    if (notificationCountEl) {
                        notificationCountEl.textContent = notificationStats.stats.unread || 0;
                    }
                }
            } catch (error) {
                console.error('Failed to load profile stats:', error);
            }
        }
    }

    showManageAlertsModal() {
        const modal = this.createModal('Manage Price Alerts', `
            <div class="alerts-management">
                <div class="alerts-header">
                    <div class="alerts-stats" id="alertsStats">
                        <div class="stat">
                            <span class="stat-number" id="activeAlerts">0</span>
                            <span class="stat-label">Active</span>
                        </div>
                        <div class="stat">
                            <span class="stat-number" id="triggeredAlerts">0</span>
                            <span class="stat-label">Triggered</span>
                        </div>
                        <div class="stat">
                            <span class="stat-number" id="pausedAlerts">0</span>
                            <span class="stat-label">Paused</span>
                        </div>
                    </div>
                    <div class="alerts-actions">
                        <button id="checkAllAlertsBtn" class="btn-secondary">Check All Alerts</button>
                        <button id="viewNotificationsBtn" class="btn-secondary">View Notifications</button>
                    </div>
                </div>
                
                <div class="alerts-list" id="alertsList">
                    <div class="loading">Loading alerts...</div>
                </div>
            </div>
        `);

        // Load alerts
        this.loadAlertsForManagement();

        // Add event listeners
        document.getElementById('checkAllAlertsBtn').onclick = () => this.handleCheckAllAlerts();
        document.getElementById('viewNotificationsBtn').onclick = () => {
            modal.remove();
            if (window.priceAlertUI) {
                window.priceAlertUI.showNotificationsModal();
            }
        };
    }

    async loadAlertsForManagement() {
        if (!window.PriceAlertService) return;

        try {
            const alertService = new PriceAlertService();
            const result = await alertService.getAlerts();
            
            if (result.success) {
                this.displayAlertsInManagement(result.alerts);
                this.updateAlertStats(result.alerts);
            }
        } catch (error) {
            console.error('Failed to load alerts:', error);
            const alertsList = document.getElementById('alertsList');
            if (alertsList) {
                alertsList.innerHTML = '<div class="error">Failed to load alerts</div>';
            }
        }
    }

    displayAlertsInManagement(alerts) {
        const alertsList = document.getElementById('alertsList');
        if (!alertsList) return;

        if (alerts.length === 0) {
            alertsList.innerHTML = `
                <div class="empty-alerts">
                    <p>No price alerts set</p>
                    <p>Start creating alerts on product cards!</p>
                </div>
            `;
            return;
        }

        alertsList.innerHTML = alerts.map(alert => `
            <div class="alert-card ${alert.isTriggered ? 'triggered' : alert.isActive ? 'active' : 'paused'}">
                <div class="alert-product">
                    <img src="${alert.productImage || '/assets/images/placeholder.jpg'}" alt="${alert.productName}" class="alert-product-image">
                    <div class="alert-product-info">
                        <h5>${alert.productName}</h5>
                        <p class="alert-type">${alert.alertType.replace('_', ' ').toUpperCase()}</p>
                    </div>
                </div>
                
                <div class="alert-prices">
                    <div class="price-info">
                        <span class="price-label">Target:</span>
                        <span class="price-value">$${alert.targetPrice.toFixed(2)}</span>
                    </div>
                    <div class="price-info">
                        <span class="price-label">Current:</span>
                        <span class="price-value">$${alert.currentPrice.toFixed(2)}</span>
                    </div>
                    ${alert.triggerPrice ? `
                        <div class="price-info">
                            <span class="price-label">Triggered at:</span>
                            <span class="price-value">$${alert.triggerPrice.toFixed(2)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="alert-status">
                    <span class="status-badge ${alert.isTriggered ? 'triggered' : alert.isActive ? 'active' : 'paused'}">
                        ${alert.isTriggered ? 'Triggered' : alert.isActive ? 'Active' : 'Paused'}
                    </span>
                    <small>Created: ${new Date(alert.createdAt).toLocaleDateString()}</small>
                </div>
                
                <div class="alert-actions">
                    ${alert.isTriggered ? 
                        `<button class="btn-sm btn-primary" onclick="authUI.reactivateAlert('${alert.id}')">Reactivate</button>` :
                        alert.isActive ?
                            `<button class="btn-sm btn-secondary" onclick="authUI.pauseAlert('${alert.id}')">Pause</button>` :
                            `<button class="btn-sm btn-primary" onclick="authUI.reactivateAlert('${alert.id}')">Activate</button>`
                    }
                    <button class="btn-sm btn-secondary" onclick="authUI.checkSingleAlert('${alert.id}')">Check</button>
                    <button class="btn-sm btn-danger" onclick="authUI.deleteAlert('${alert.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    updateAlertStats(alerts) {
        const activeCount = alerts.filter(a => a.isActive && !a.isTriggered).length;
        const triggeredCount = alerts.filter(a => a.isTriggered).length;
        const pausedCount = alerts.filter(a => !a.isActive).length;

        const activeEl = document.getElementById('activeAlerts');
        const triggeredEl = document.getElementById('triggeredAlerts');
        const pausedEl = document.getElementById('pausedAlerts');

        if (activeEl) activeEl.textContent = activeCount;
        if (triggeredEl) triggeredEl.textContent = triggeredCount;
        if (pausedEl) pausedEl.textContent = pausedCount;
    }

    async handleCheckAllAlerts() {
        if (!window.PriceAlertService) return;

        try {
            this.showSuccessMessage('Checking all alerts...');
            const alertService = new PriceAlertService();
            const result = await alertService.checkAlertsNow();
            
            if (result.success) {
                this.showSuccessMessage(`Alert check complete: ${result.result.checked} checked, ${result.result.triggered} triggered`);
                this.loadAlertsForManagement();
            }
        } catch (error) {
            console.error('Check all alerts error:', error);
            this.showErrorMessage('Failed to check alerts');
        }
    }

    async reactivateAlert(alertId) {
        if (!window.PriceAlertService) return;

        try {
            const alertService = new PriceAlertService();
            const result = await alertService.reactivateAlert(alertId);
            
            if (result.success) {
                this.showSuccessMessage('Alert reactivated successfully');
                this.loadAlertsForManagement();
            }
        } catch (error) {
            console.error('Reactivate alert error:', error);
            this.showErrorMessage('Failed to reactivate alert');
        }
    }

    async pauseAlert(alertId) {
        if (!window.PriceAlertService) return;

        try {
            const alertService = new PriceAlertService();
            const result = await alertService.pauseAlert(alertId);
            
            if (result.success) {
                this.showSuccessMessage('Alert paused successfully');
                this.loadAlertsForManagement();
            }
        } catch (error) {
            console.error('Pause alert error:', error);
            this.showErrorMessage('Failed to pause alert');
        }
    }

    async deleteAlert(alertId) {
        if (!confirm('Are you sure you want to delete this alert?')) return;
        if (!window.PriceAlertService) return;

        try {
            const alertService = new PriceAlertService();
            const result = await alertService.deleteAlert(alertId);
            
            if (result.success) {
                this.showSuccessMessage('Alert deleted successfully');
                this.loadAlertsForManagement();
            }
        } catch (error) {
            console.error('Delete alert error:', error);
            this.showErrorMessage('Failed to delete alert');
        }
    }

    async checkSingleAlert(alertId) {
        if (!window.PriceAlertService) return;

        try {
            const alertService = new PriceAlertService();
            const result = await alertService.checkAlert(alertId);
            
            if (result.success) {
                if (result.result.triggered) {
                    this.showSuccessMessage('Alert was triggered!');
                } else {
                    this.showSuccessMessage('Alert checked - no trigger');
                }
                this.loadAlertsForManagement();
            }
        } catch (error) {
            console.error('Check alert error:', error);
            this.showErrorMessage('Failed to check alert');
        }
    }

    showEditProfileModal() {
        if (!this.currentUser) return;

        const modal = this.createModal('Edit Profile', `
            <form id="editProfileForm">
                <div class="form-group">
                    <label for="editFirstName">First Name:</label>
                    <input type="text" id="editFirstName" value="${this.currentUser.firstName}" required>
                </div>
                <div class="form-group">
                    <label for="editLastName">Last Name:</label>
                    <input type="text" id="editLastName" value="${this.currentUser.lastName}" required>
                </div>
                <div class="form-group">
                    <label for="editEmail">Email:</label>
                    <input type="email" id="editEmail" value="${this.currentUser.email}" required>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Update Profile</button>
                    <button type="button" id="cancelEditBtn" class="btn-secondary">Cancel</button>
                </div>
            </form>
        `);

        // Handle form submission
        document.getElementById('editProfileForm').onsubmit = async (e) => {
            e.preventDefault();
            await this.handleUpdateProfile();
        };

        document.getElementById('cancelEditBtn').onclick = () => {
            modal.remove();
            this.showProfileModal();
        };
    }

    showChangePasswordModal() {
        const modal = this.createModal('Change Password', `
            <form id="changePasswordForm">
                <div class="form-group">
                    <label for="currentPassword">Current Password:</label>
                    <input type="password" id="currentPassword" required>
                </div>
                <div class="form-group">
                    <label for="newPassword">New Password:</label>
                    <input type="password" id="newPassword" required minlength="6">
                </div>
                <div class="form-group">
                    <label for="confirmPassword">Confirm New Password:</label>
                    <input type="password" id="confirmPassword" required minlength="6">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Change Password</button>
                    <button type="button" id="cancelPasswordBtn" class="btn-secondary">Cancel</button>
                </div>
            </form>
        `);

        // Handle form submission
        document.getElementById('changePasswordForm').onsubmit = async (e) => {
            e.preventDefault();
            await this.handleChangePassword();
        };

        document.getElementById('cancelPasswordBtn').onclick = () => {
            modal.remove();
            this.showProfileModal();
        };
    }

    async showWishlistModal() {
        if (!this.currentUser) return;

        try {
            // Get wishlist data
            const wishlistResult = await this.authService.getWishlist();
            let wishlistItems = [];
            
            if (wishlistResult.success && wishlistResult.wishlist) {
                wishlistItems = wishlistResult.wishlist;
            }

            const modal = this.createModal('My Wishlist', `
                <div class="wishlist-container">
                    ${wishlistItems.length === 0 ? `
                        <div class="empty-wishlist">
                            <p>Your wishlist is empty</p>
                            <p>Add items to your wishlist by clicking the heart button on product cards!</p>
                        </div>
                    ` : `
                        <div class="wishlist-items">
                            ${wishlistItems.map(item => `
                                <div class="wishlist-item" data-product-id="${item.id}">
                                    <img src="${item.image}" alt="${item.name}" class="wishlist-item-image">
                                    <div class="wishlist-item-details">
                                        <h4>${item.name}</h4>
                                        <p class="brand">${item.brand}</p>
                                        <p class="price">$${item.price}</p>
                                        <p class="category">${item.category}</p>
                                    </div>
                                    <div class="wishlist-item-actions">
                                        <button class="btn-primary view-product-btn" data-product-id="${item.id}">
                                            View Product
                                        </button>
                                        <button class="btn-danger remove-from-wishlist-btn" data-product-id="${item.id}">
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            `);

            // Add event listeners for wishlist actions
            modal.querySelectorAll('.remove-from-wishlist-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const productId = e.target.dataset.productId;
                    await this.handleRemoveFromWishlist(productId);
                    modal.remove();
                    this.showWishlistModal(); // Refresh
                };
            });

            modal.querySelectorAll('.view-product-btn').forEach(btn => {
                btn.onclick = (e) => {
                    const productId = e.target.dataset.productId;
                    modal.remove();
                    // Scroll to product or show product details
                    this.viewProduct(productId);
                };
            });

        } catch (error) {
            console.error('Error loading wishlist:', error);
            this.showErrorMessage('Failed to load wishlist');
        }
    }

    showSettingsModal() {
        const modal = this.createModal('Settings', `
            <div class="settings-container">
                <div class="settings-section">
                    <h4>Account Settings</h4>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="emailNotifications" checked>
                            Email notifications for price drops
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="weeklyDigest" checked>
                            Weekly deals digest
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="newProductAlerts">
                            New product alerts
                        </label>
                    </div>
                </div>

                <div class="settings-section">
                    <h4>Privacy Settings</h4>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="publicWishlist">
                            Make wishlist public
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="shareDeals" checked>
                            Share deals with friends
                        </label>
                    </div>
                </div>

                <div class="settings-section">
                    <h4>Display Settings</h4>
                    <div class="setting-item">
                        <label for="currency">Preferred Currency:</label>
                        <select id="currency">
                            <option value="USD" selected>USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                        </select>
                    </div>
                    <div class="setting-item">
                        <label for="priceRange">Price Range Filter:</label>
                        <select id="priceRange">
                            <option value="all" selected>All Prices</option>
                            <option value="0-50">$0 - $50</option>
                            <option value="50-100">$50 - $100</option>
                            <option value="100-200">$100 - $200</option>
                            <option value="200+">$200+</option>
                        </select>
                    </div>
                </div>

                <div class="settings-actions">
                    <button id="saveSettingsBtn" class="btn-primary">Save Settings</button>
                    <button id="resetSettingsBtn" class="btn-secondary">Reset to Default</button>
                </div>

                <div class="danger-zone">
                    <h4>Danger Zone</h4>
                    <button id="deleteAccountBtn" class="btn-danger">Delete Account</button>
                </div>
            </div>
        `);

        // Add event listeners
        document.getElementById('saveSettingsBtn').onclick = () => {
            this.saveSettings();
        };

        document.getElementById('resetSettingsBtn').onclick = () => {
            this.resetSettings();
        };

        document.getElementById('deleteAccountBtn').onclick = () => {
            this.confirmDeleteAccount();
        };
    }

    async handleUpdateProfile() {
        const firstName = document.getElementById('editFirstName').value;
        const lastName = document.getElementById('editLastName').value;
        const email = document.getElementById('editEmail').value;

        try {
            const result = await this.authService.updateProfile({
                firstName,
                lastName,
                email
            });

            if (result.success) {
                this.currentUser = result.user;
                this.updateUIForAuthenticatedUser();
                this.closeModal();
                this.showSuccessMessage('Profile updated successfully!');
            } else {
                this.showErrorMessage(result.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            this.showErrorMessage('Failed to update profile. Please try again.');
        }
    }

    async handleChangePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            this.showErrorMessage('New passwords do not match');
            return;
        }

        try {
            const result = await this.authService.changePassword({
                currentPassword,
                newPassword
            });

            if (result.success) {
                this.closeModal();
                this.showSuccessMessage('Password changed successfully!');
            } else {
                this.showErrorMessage(result.message || 'Failed to change password');
            }
        } catch (error) {
            console.error('Password change error:', error);
            this.showErrorMessage('Failed to change password. Please try again.');
        }
    }

    async handleRemoveFromWishlist(productId) {
        try {
            await this.authService.removeFromWishlist(productId);
            this.showSuccessMessage('Item removed from wishlist');
            
            // Update wishlist buttons if visible
            const wishlistBtn = document.querySelector(`[data-product-id="${productId}"] .wishlist-btn`);
            if (wishlistBtn) {
                wishlistBtn.innerHTML = '❤️ Add to Wishlist';
                wishlistBtn.classList.remove('in-wishlist');
            }
        } catch (error) {
            console.error('Remove from wishlist error:', error);
            this.showErrorMessage('Failed to remove item from wishlist');
        }
    }

    viewProduct(productId) {
        // Scroll to product card if it exists on the page
        const productCard = document.querySelector(`[data-product-id="${productId}"]`);
        if (productCard) {
            productCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            productCard.style.border = '2px solid #007bff';
            setTimeout(() => {
                productCard.style.border = '';
            }, 3000);
        }
    }

    saveSettings() {
        // Get all settings
        const settings = {
            emailNotifications: document.getElementById('emailNotifications').checked,
            weeklyDigest: document.getElementById('weeklyDigest').checked,
            newProductAlerts: document.getElementById('newProductAlerts').checked,
            publicWishlist: document.getElementById('publicWishlist').checked,
            shareDeals: document.getElementById('shareDeals').checked,
            currency: document.getElementById('currency').value,
            priceRange: document.getElementById('priceRange').value
        };

        // Save to localStorage for now (could be extended to save to backend)
        localStorage.setItem('userSettings', JSON.stringify(settings));
        this.showSuccessMessage('Settings saved successfully!');
        this.closeModal();
    }

    resetSettings() {
        localStorage.removeItem('userSettings');
        this.showSuccessMessage('Settings reset to default');
        this.closeModal();
    }

    confirmDeleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            this.deleteAccount();
        }
    }

    async deleteAccount() {
        try {
            const result = await this.authService.deleteAccount();
            if (result.success) {
                this.closeModal();
                this.currentUser = null;
                this.updateUIForUnauthenticatedUser();
                this.showSuccessMessage('Account deleted successfully');
            } else {
                this.showErrorMessage(result.message || 'Failed to delete account');
            }
        } catch (error) {
            console.error('Delete account error:', error);
            this.showErrorMessage('Failed to delete account. Please try again.');
        }
    }
}

// Export for use in other modules
window.AuthUI = AuthUI;
