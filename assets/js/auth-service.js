// Authentication API service
class AuthService {
    constructor() {
        this.baseURL = '/api/auth';
        this.tokenKey = 'snatched_it_token';
        this.userKey = 'snatched_it_user';
    }

    // Get stored token
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    // Get stored user data
    getUser() {
        const userData = localStorage.getItem(this.userKey);
        return userData ? JSON.parse(userData) : null;
    }

    // Store token and user data
    setAuth(token, user) {
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    // Clear stored auth data
    clearAuth() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.getToken();
    }

    // Get authorization headers
    getAuthHeaders() {
        const token = this.getToken();
        return token ? {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        } : {
            'Content-Type': 'application/json'
        };
    }

    // Register new user
    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (data.success) {
                this.setAuth(data.token, data.user);
            }

            return data;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    // Login user
    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.setAuth(data.token, data.user);
            }

            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    // Logout user
    async logout() {
        try {
            const response = await fetch(`${this.baseURL}/logout`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            this.clearAuth();
            return data;
        } catch (error) {
            console.error('Logout error:', error);
            this.clearAuth(); // Clear local storage even if request fails
            throw error;
        }
    }

    // Get user profile
    async getProfile() {
        try {
            const response = await fetch(`${this.baseURL}/profile`, {
                headers: this.getAuthHeaders()
            });

            return await response.json();
        } catch (error) {
            console.error('Get profile error:', error);
            throw error;
        }
    }

    // Update user profile
    async updateProfile(updateData) {
        try {
            const response = await fetch(`${this.baseURL}/profile`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(updateData)
            });

            const data = await response.json();

            if (data.success) {
                // Update stored user data
                this.setAuth(this.getToken(), data.user);
            }

            return data;
        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        }
    }

    // Change password
    async changePassword(passwordData) {
        try {
            const response = await fetch(`${this.baseURL}/change-password`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(passwordData)
            });

            return await response.json();
        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    }

    // Delete user account
    async deleteAccount() {
        try {
            const response = await fetch(`${this.baseURL}/delete-account`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();

            if (data.success) {
                this.clearAuth();
            }

            return data;
        } catch (error) {
            console.error('Delete account error:', error);
            throw error;
        }
    }

    // Add product to wishlist
    async addToWishlist(productId) {
        try {
            const response = await fetch(`${this.baseURL}/wishlist/add`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ productId })
            });

            return await response.json();
        } catch (error) {
            console.error('Add to wishlist error:', error);
            throw error;
        }
    }

    // Remove product from wishlist
    async removeFromWishlist(productId) {
        try {
            const response = await fetch(`${this.baseURL}/wishlist/remove`, {
                method: 'DELETE',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ productId })
            });

            return await response.json();
        } catch (error) {
            console.error('Remove from wishlist error:', error);
            throw error;
        }
    }

    // Get user's wishlist
    async getWishlist() {
        try {
            const response = await fetch(`${this.baseURL}/wishlist`, {
                headers: this.getAuthHeaders()
            });

            return await response.json();
        } catch (error) {
            console.error('Get wishlist error:', error);
            throw error;
        }
    }

    // Verify token validity
    async verifyToken() {
        try {
            const response = await fetch(`${this.baseURL}/verify`, {
                headers: this.getAuthHeaders()
            });

            const data = await response.json();

            if (!data.success) {
                this.clearAuth();
            } else {
                // Update stored user data
                this.setAuth(this.getToken(), data.user);
            }

            return data;
        } catch (error) {
            console.error('Token verification error:', error);
            this.clearAuth();
            throw error;
        }
    }

    // Handle authentication state changes
    onAuthStateChange(callback) {
        // Listen for storage changes (for multi-tab sync)
        window.addEventListener('storage', (e) => {
            if (e.key === this.tokenKey || e.key === this.userKey) {
                callback(this.isAuthenticated(), this.getUser());
            }
        });
    }
}

// Export for use in other modules
window.AuthService = AuthService;
