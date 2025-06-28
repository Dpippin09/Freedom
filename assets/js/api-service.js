// API Service for Snatched It
class APIService {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
    }

    // Generic fetch method with error handling
    async fetchAPI(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Get all products with optional filters
    async getProducts(filters = {}) {
        const params = new URLSearchParams();
        
        if (filters.category) params.append('category', filters.category);
        if (filters.search) params.append('search', filters.search);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.limit) params.append('limit', filters.limit);

        const queryString = params.toString();
        const endpoint = `/products${queryString ? '?' + queryString : ''}`;
        
        return await this.fetchAPI(endpoint);
    }

    // Get single product by ID
    async getProduct(id) {
        return await this.fetchAPI(`/products/${id}`);
    }

    // Get price comparison for a product
    async getPriceComparison(id) {
        return await this.fetchAPI(`/products/${id}/prices`);
    }

    // Get search suggestions
    async getSearchSuggestions(query, limit = 5) {
        const params = new URLSearchParams({ query, limit });
        return await this.fetchAPI(`/products/search/suggestions?${params}`);
    }

    // Health check
    async healthCheck() {
        return await this.fetchAPI('/health');
    }
}

// Create global API instance
window.API = new APIService();
