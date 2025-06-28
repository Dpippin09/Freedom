// Price Alert UI Manager
class PriceAlertUI {
    constructor() {
        this.alertService = new PriceAlertService();
        this.authService = new AuthService();
        this.currentUser = null;
        this.alerts = [];
        this.notifications = [];
        this.init();
    }

    async init() {
        // Check if user is authenticated
        if (this.authService.isAuthenticated()) {
            this.currentUser = this.authService.getUser();
            await this.loadAlerts();
            await this.loadNotifications();
            this.setupUI();
            this.setupPeriodicUpdates();
        }
    }

    async loadAlerts() {
        try {
            const result = await this.alertService.getAlerts();
            if (result.success) {
                this.alerts = result.alerts;
                this.updateAlertUI();
            }
        } catch (error) {
            console.error('Failed to load alerts:', error);
        }
    }

    async loadNotifications() {
        try {
            const result = await this.alertService.getNotifications({ unreadOnly: true });
            if (result.success) {
                this.notifications = result.notifications;
                this.updateNotificationBadge();
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }

    setupUI() {
        this.addPriceAlertButtons();
        this.addNotificationBell();
    }

    setupPeriodicUpdates() {
        // Update notifications every 30 seconds
        setInterval(async () => {
            await this.loadNotifications();
        }, 30000);

        // Update alerts every 2 minutes
        setInterval(async () => {
            await this.loadAlerts();
        }, 120000);
    }

    addPriceAlertButtons() {
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            this.addPriceAlertButtonToCard(card);
        });
    }

    addPriceAlertButtonToCard(card) {
        if (!this.currentUser || card.querySelector('.price-alert-btn')) return;

        const productId = card.dataset.productId;
        if (!productId) return;

        const productName = card.querySelector('.card-title')?.textContent || 'Unknown Product';
        const productPrice = card.querySelector('.current-price')?.textContent?.replace(/[^0-9.]/g, '') || '0';
        const productImage = card.querySelector('.card-image')?.src || '';

        const alertBtn = document.createElement('button');
        alertBtn.className = 'price-alert-btn';
        alertBtn.innerHTML = '🔔 Set Price Alert';
        
        // Check if alert already exists
        const existingAlert = this.alerts.find(alert => 
            alert.productId === productId && alert.isActive
        );

        if (existingAlert) {
            alertBtn.innerHTML = '🔔 Alert Set';
            alertBtn.classList.add('alert-active');
            alertBtn.title = `Alert set for $${existingAlert.targetPrice}`;
        }

        alertBtn.onclick = (e) => {
            e.stopPropagation();
            if (existingAlert) {
                this.showAlertManagementModal(existingAlert);
            } else {
                this.showCreateAlertModal({
                    productId,
                    productName,
                    currentPrice: parseFloat(productPrice),
                    productImage
                });
            }
        };

        const cardActions = card.querySelector('.card-actions') || card;
        cardActions.appendChild(alertBtn);
    }

    addNotificationBell() {
        const nav = document.querySelector('.nav-links');
        if (!nav || nav.querySelector('.notification-bell')) return;

        const bellContainer = document.createElement('li');
        bellContainer.className = 'notification-bell-container';
        bellContainer.innerHTML = `
            <button class="notification-bell" title="Notifications">
                🔔
                <span class="notification-badge" style="display: none;">0</span>
            </button>
        `;

        nav.appendChild(bellContainer);

        const bell = bellContainer.querySelector('.notification-bell');
        bell.onclick = () => this.showNotificationsModal();
    }

    updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            const unreadCount = this.notifications.length;
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    updateAlertUI() {
        // Update price alert buttons
        const alertButtons = document.querySelectorAll('.price-alert-btn');
        alertButtons.forEach(btn => {
            const card = btn.closest('.product-card');
            const productId = card?.dataset.productId;
            
            if (productId) {
                const existingAlert = this.alerts.find(alert => 
                    alert.productId === productId && alert.isActive
                );

                if (existingAlert) {
                    btn.innerHTML = '🔔 Alert Set';
                    btn.classList.add('alert-active');
                    btn.title = `Alert set for $${existingAlert.targetPrice}`;
                } else {
                    btn.innerHTML = '🔔 Set Price Alert';
                    btn.classList.remove('alert-active');
                    btn.title = 'Set a price alert for this product';
                }
            }
        });
    }

    showCreateAlertModal(productData) {
        const modal = this.createModal('Create Price Alert', `
            <div class="alert-form">
                <div class="product-info">
                    <img src="${productData.productImage}" alt="${productData.productName}" class="product-thumb">
                    <div class="product-details">
                        <h4>${productData.productName}</h4>
                        <p class="current-price-display">Current Price: $${productData.currentPrice.toFixed(2)}</p>
                    </div>
                </div>
                
                <form id="createAlertForm">
                    <div class="form-group">
                        <label for="alertType">Alert Type:</label>
                        <select id="alertType" required>
                            <option value="price_drop">Price Drop Alert</option>
                            <option value="percentage_drop">Percentage Drop Alert</option>
                        </select>
                    </div>
                    
                    <div class="form-group" id="targetPriceGroup">
                        <label for="targetPrice">Target Price ($):</label>
                        <input type="number" id="targetPrice" step="0.01" min="0.01" 
                               max="${productData.currentPrice}" 
                               value="${(productData.currentPrice * 0.9).toFixed(2)}" required>
                        <small>Alert when price drops to or below this amount</small>
                    </div>
                    
                    <div class="form-group" id="thresholdGroup" style="display: none;">
                        <label for="threshold">Percentage Drop (%):</label>
                        <input type="number" id="threshold" min="1" max="99" value="10">
                        <small>Alert when price drops by this percentage</small>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="emailNotification" checked>
                            Send email notifications
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="pushNotification" checked>
                            Send push notifications
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Create Alert</button>
                        <button type="button" class="btn-secondary" onclick="this.closest('.auth-modal').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `);

        // Handle alert type change
        const alertTypeSelect = document.getElementById('alertType');
        const targetPriceGroup = document.getElementById('targetPriceGroup');
        const thresholdGroup = document.getElementById('thresholdGroup');

        alertTypeSelect.onchange = () => {
            if (alertTypeSelect.value === 'percentage_drop') {
                targetPriceGroup.style.display = 'none';
                thresholdGroup.style.display = 'block';
            } else {
                targetPriceGroup.style.display = 'block';
                thresholdGroup.style.display = 'none';
            }
        };

        // Handle form submission
        document.getElementById('createAlertForm').onsubmit = async (e) => {
            e.preventDefault();
            await this.handleCreateAlert(productData);
        };
    }

    async handleCreateAlert(productData) {
        const alertType = document.getElementById('alertType').value;
        const targetPrice = alertType === 'price_drop' ? parseFloat(document.getElementById('targetPrice').value) : null;
        const threshold = alertType === 'percentage_drop' ? parseFloat(document.getElementById('threshold').value) : null;
        const emailNotification = document.getElementById('emailNotification').checked;
        const pushNotification = document.getElementById('pushNotification').checked;

        const alertData = {
            productId: productData.productId,
            productName: productData.productName,
            productImage: productData.productImage,
            currentPrice: productData.currentPrice,
            targetPrice: targetPrice || productData.currentPrice,
            alertType,
            threshold,
            emailNotification,
            pushNotification
        };

        try {
            const result = await this.alertService.createAlert(alertData);
            
            if (result.success) {
                this.closeModal();
                this.showSuccessMessage('Price alert created successfully!');
                await this.loadAlerts();
            } else {
                this.showErrorMessage(result.message || 'Failed to create price alert');
            }
        } catch (error) {
            console.error('Create alert error:', error);
            this.showErrorMessage('Failed to create price alert. Please try again.');
        }
    }

    showAlertManagementModal(alert) {
        const modal = this.createModal('Manage Price Alert', `
            <div class="alert-management">
                <div class="alert-info">
                    <h4>${alert.productName}</h4>
                    <div class="alert-details">
                        <p><strong>Alert Type:</strong> ${alert.alertType.replace('_', ' ').toUpperCase()}</p>
                        <p><strong>Target Price:</strong> $${alert.targetPrice.toFixed(2)}</p>
                        <p><strong>Current Price:</strong> $${alert.currentPrice.toFixed(2)}</p>
                        ${alert.threshold ? `<p><strong>Threshold:</strong> ${alert.threshold}%</p>` : ''}
                        <p><strong>Status:</strong> 
                            <span class="status ${alert.isTriggered ? 'triggered' : 'active'}">
                                ${alert.isTriggered ? 'Triggered' : 'Active'}
                            </span>
                        </p>
                        <p><strong>Created:</strong> ${new Date(alert.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                
                <div class="alert-actions">
                    ${alert.isTriggered ? 
                        `<button id="reactivateBtn" class="btn-primary">Reactivate Alert</button>` :
                        `<button id="pauseBtn" class="btn-secondary">Pause Alert</button>`
                    }
                    <button id="editBtn" class="btn-secondary">Edit Alert</button>
                    <button id="deleteBtn" class="btn-danger">Delete Alert</button>
                    <button id="checkNowBtn" class="btn-secondary">Check Now</button>
                </div>
            </div>
        `);

        // Add event listeners
        const reactivateBtn = document.getElementById('reactivateBtn');
        if (reactivateBtn) {
            reactivateBtn.onclick = () => this.handleReactivateAlert(alert.id);
        }

        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.onclick = () => this.handlePauseAlert(alert.id);
        }

        document.getElementById('editBtn').onclick = () => {
            modal.remove();
            this.showEditAlertModal(alert);
        };

        document.getElementById('deleteBtn').onclick = () => this.handleDeleteAlert(alert.id);
        document.getElementById('checkNowBtn').onclick = () => this.handleCheckAlert(alert.id);
    }

    async handleReactivateAlert(alertId) {
        try {
            const result = await this.alertService.reactivateAlert(alertId);
            if (result.success) {
                this.closeModal();
                this.showSuccessMessage('Alert reactivated successfully!');
                await this.loadAlerts();
            } else {
                this.showErrorMessage(result.message || 'Failed to reactivate alert');
            }
        } catch (error) {
            console.error('Reactivate alert error:', error);
            this.showErrorMessage('Failed to reactivate alert. Please try again.');
        }
    }

    async handlePauseAlert(alertId) {
        try {
            const result = await this.alertService.pauseAlert(alertId);
            if (result.success) {
                this.closeModal();
                this.showSuccessMessage('Alert paused successfully!');
                await this.loadAlerts();
            } else {
                this.showErrorMessage(result.message || 'Failed to pause alert');
            }
        } catch (error) {
            console.error('Pause alert error:', error);
            this.showErrorMessage('Failed to pause alert. Please try again.');
        }
    }

    async handleDeleteAlert(alertId) {
        if (!confirm('Are you sure you want to delete this price alert?')) {
            return;
        }

        try {
            const result = await this.alertService.deleteAlert(alertId);
            if (result.success) {
                this.closeModal();
                this.showSuccessMessage('Alert deleted successfully!');
                await this.loadAlerts();
            } else {
                this.showErrorMessage(result.message || 'Failed to delete alert');
            }
        } catch (error) {
            console.error('Delete alert error:', error);
            this.showErrorMessage('Failed to delete alert. Please try again.');
        }
    }

    async handleCheckAlert(alertId) {
        try {
            this.showSuccessMessage('Checking alert...');
            const result = await this.alertService.checkAlert(alertId);
            
            if (result.success) {
                if (result.result.triggered) {
                    this.showSuccessMessage('Alert check complete - Alert was triggered!');
                } else {
                    this.showSuccessMessage('Alert check complete - No trigger conditions met');
                }
                await this.loadAlerts();
                await this.loadNotifications();
            } else {
                this.showErrorMessage(result.message || 'Failed to check alert');
            }
        } catch (error) {
            console.error('Check alert error:', error);
            this.showErrorMessage('Failed to check alert. Please try again.');
        }
    }

    showNotificationsModal() {
        const modal = this.createModal('Notifications', `
            <div class="notifications-container">
                <div class="notifications-header">
                    <div class="notifications-actions">
                        <button id="markAllReadBtn" class="btn-secondary">Mark All Read</button>
                        <button id="clearAllBtn" class="btn-danger">Clear All</button>
                    </div>
                </div>
                
                <div class="notifications-list" id="notificationsList">
                    ${this.renderNotifications()}
                </div>
            </div>
        `);

        // Add event listeners
        document.getElementById('markAllReadBtn').onclick = () => this.handleMarkAllRead();
        document.getElementById('clearAllBtn').onclick = () => this.handleClearAllNotifications();
    }

    renderNotifications() {
        if (this.notifications.length === 0) {
            return `
                <div class="empty-notifications">
                    <p>No new notifications</p>
                </div>
            `;
        }

        return this.notifications.map(notification => `
            <div class="notification-item ${notification.isRead ? 'read' : 'unread'}" data-id="${notification.id}">
                <div class="notification-content">
                    <h5>${notification.title}</h5>
                    <p>${notification.message}</p>
                    <small>${new Date(notification.createdAt).toLocaleString()}</small>
                </div>
                <div class="notification-actions">
                    ${!notification.isRead ? `<button class="mark-read-btn" onclick="priceAlertUI.markNotificationRead('${notification.id}')">Mark Read</button>` : ''}
                    <button class="delete-notification-btn" onclick="priceAlertUI.deleteNotification('${notification.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async markNotificationRead(notificationId) {
        try {
            const result = await this.alertService.markNotificationRead(notificationId);
            if (result.success) {
                await this.loadNotifications();
                this.updateNotificationsDisplay();
            }
        } catch (error) {
            console.error('Mark notification read error:', error);
        }
    }

    async deleteNotification(notificationId) {
        try {
            const result = await this.alertService.deleteNotification(notificationId);
            if (result.success) {
                await this.loadNotifications();
                this.updateNotificationsDisplay();
            }
        } catch (error) {
            console.error('Delete notification error:', error);
        }
    }

    async handleMarkAllRead() {
        try {
            const result = await this.alertService.markAllNotificationsRead();
            if (result.success) {
                await this.loadNotifications();
                this.updateNotificationsDisplay();
                this.showSuccessMessage('All notifications marked as read');
            }
        } catch (error) {
            console.error('Mark all read error:', error);
            this.showErrorMessage('Failed to mark notifications as read');
        }
    }

    async handleClearAllNotifications() {
        if (!confirm('Are you sure you want to delete all notifications?')) {
            return;
        }

        try {
            const result = await this.alertService.deleteAllNotifications();
            if (result.success) {
                await this.loadNotifications();
                this.updateNotificationsDisplay();
                this.showSuccessMessage('All notifications deleted');
            }
        } catch (error) {
            console.error('Clear all notifications error:', error);
            this.showErrorMessage('Failed to clear notifications');
        }
    }

    updateNotificationsDisplay() {
        const notificationsList = document.getElementById('notificationsList');
        if (notificationsList) {
            notificationsList.innerHTML = this.renderNotifications();
        }
    }

    // Utility methods
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
}

// Export for use in other modules
window.PriceAlertUI = PriceAlertUI;
