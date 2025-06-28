const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Load products from JSON file
const loadProducts = () => {
    try {
        const productsPath = path.join(__dirname, '../data/products.json');
        const data = fs.readFileSync(productsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
};

// GET /api/products - Get all products
router.get('/', (req, res) => {
    try {
        const products = loadProducts();
        const { category, search, sortBy, limit } = req.query;
        
        let filteredProducts = [...products];

        // Filter by category
        if (category && category !== 'all') {
            if (category === 'deals') {
                filteredProducts = filteredProducts.filter(product => {
                    const savings = ((product.price.original - product.price.current) / product.price.original) * 100;
                    return savings >= 20; // Products with 20% or more savings
                });
            } else {
                filteredProducts = filteredProducts.filter(product => 
                    product.category === category
                );
            }
        }

        // Search functionality
        if (search) {
            const searchTerm = search.toLowerCase();
            filteredProducts = filteredProducts.filter(product => {
                const searchableText = [
                    product.name,
                    product.description,
                    ...product.keywords
                ].join(' ').toLowerCase();
                
                return searchableText.includes(searchTerm);
            });
        }

        // Sort products
        switch (sortBy) {
            case 'price_low':
                filteredProducts.sort((a, b) => a.price.current - b.price.current);
                break;
            case 'price_high':
                filteredProducts.sort((a, b) => b.price.current - a.price.current);
                break;
            case 'rating':
                filteredProducts.sort((a, b) => b.rating - a.rating);
                break;
            case 'savings':
                filteredProducts.sort((a, b) => {
                    const savingsA = ((a.price.original - a.price.current) / a.price.original) * 100;
                    const savingsB = ((b.price.original - b.price.current) / b.price.original) * 100;
                    return savingsB - savingsA;
                });
                break;
            default:
                // Keep original order (relevance)
                break;
        }

        // Limit results
        if (limit) {
            filteredProducts = filteredProducts.slice(0, parseInt(limit));
        }

        res.json({
            success: true,
            count: filteredProducts.length,
            total: products.length,
            products: filteredProducts,
            filters: {
                category: category || 'all',
                search: search || '',
                sortBy: sortBy || 'relevance'
            }
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch products',
            message: error.message
        });
    }
});

// GET /api/products/:id - Get single product
router.get('/:id', (req, res) => {
    try {
        const products = loadProducts();
        const product = products.find(p => p.id === parseInt(req.params.id));
        
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        res.json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch product',
            message: error.message
        });
    }
});

// GET /api/products/:id/prices - Get price comparison for a product
router.get('/:id/prices', (req, res) => {
    try {
        const products = loadProducts();
        const product = products.find(p => p.id === parseInt(req.params.id));
        
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        const stores = product.stores.sort((a, b) => a.price - b.price);
        const lowestPrice = stores[0].price;
        const highestPrice = stores[stores.length - 1].price;
        const averagePrice = stores.reduce((sum, store) => sum + store.price, 0) / stores.length;

        res.json({
            success: true,
            product: {
                id: product.id,
                name: product.name,
                image: product.image
            },
            priceComparison: {
                stores,
                statistics: {
                    lowest: lowestPrice,
                    highest: highestPrice,
                    average: Math.round(averagePrice * 100) / 100,
                    savings: Math.round(((highestPrice - lowestPrice) / highestPrice) * 100)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching price comparison:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch price comparison',
            message: error.message
        });
    }
});

// GET /api/products/search/suggestions - Get search suggestions
router.get('/search/suggestions', (req, res) => {
    try {
        const { query, limit = 5 } = req.query;
        
        if (!query || query.trim() === '') {
            return res.json({
                success: true,
                suggestions: []
            });
        }

        const products = loadProducts();
        const searchTerm = query.toLowerCase();
        const suggestions = new Set();

        products.forEach(product => {
            // Add product name if it matches
            if (product.name.toLowerCase().includes(searchTerm)) {
                suggestions.add(product.name);
            }

            // Add matching keywords
            product.keywords.forEach(keyword => {
                if (keyword.toLowerCase().includes(searchTerm)) {
                    suggestions.add(keyword);
                }
            });
        });

        res.json({
            success: true,
            suggestions: Array.from(suggestions).slice(0, parseInt(limit))
        });
    } catch (error) {
        console.error('Error getting suggestions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get suggestions',
            message: error.message
        });
    }
});

module.exports = router;
