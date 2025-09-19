const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Simple file-based storage for wishlists (can be replaced with database later)
const WISHLIST_FILE = path.join(__dirname, '../data/wishlists.json');

// Ensure data directory exists
async function ensureDataDirectory() {
    const dataDir = path.join(__dirname, '../data');
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

// Load wishlists from file
async function loadWishlists() {
    try {
        await ensureDataDirectory();
        const data = await fs.readFile(WISHLIST_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // File doesn't exist or is empty, return empty structure
        return {};
    }
}

// Save wishlists to file
async function saveWishlists(wishlists) {
    await ensureDataDirectory();
    await fs.writeFile(WISHLIST_FILE, JSON.stringify(wishlists, null, 2));
}

// Generate unique ID for wishlist items
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// GET /api/wishlist/:userId - Get user's wishlist
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const wishlists = await loadWishlists();
        const userWishlist = wishlists[userId] || [];

        res.json({
            success: true,
            userId,
            wishlist: userWishlist,
            count: userWishlist.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get wishlist',
            error: error.message
        });
    }
});

// POST /api/wishlist/:userId/add - Add item to wishlist
router.post('/:userId/add', async (req, res) => {
    try {
        const { userId } = req.params;
        const { productUrl, title, price, image, retailer, description, category } = req.body;

        if (!productUrl || !title) {
            return res.status(400).json({
                success: false,
                message: 'Product URL and title are required'
            });
        }

        const wishlists = await loadWishlists();
        if (!wishlists[userId]) {
            wishlists[userId] = [];
        }

        // Check if item already exists
        const existingItem = wishlists[userId].find(item => item.productUrl === productUrl);
        if (existingItem) {
            return res.status(409).json({
                success: false,
                message: 'Item already in wishlist',
                item: existingItem
            });
        }

        // Create new wishlist item
        const newItem = {
            id: generateId(),
            productUrl,
            title,
            price,
            image,
            retailer,
            description,
            category,
            addedAt: new Date().toISOString(),
            notes: ''
        };

        wishlists[userId].push(newItem);
        await saveWishlists(wishlists);

        res.status(201).json({
            success: true,
            message: 'Item added to wishlist',
            item: newItem,
            wishlistCount: wishlists[userId].length
        });

    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add item to wishlist',
            error: error.message
        });
    }
});

// DELETE /api/wishlist/:userId/:itemId - Remove item from wishlist
router.delete('/:userId/:itemId', async (req, res) => {
    try {
        const { userId, itemId } = req.params;
        const wishlists = await loadWishlists();

        if (!wishlists[userId]) {
            return res.status(404).json({
                success: false,
                message: 'User wishlist not found'
            });
        }

        const itemIndex = wishlists[userId].findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in wishlist'
            });
        }

        const removedItem = wishlists[userId].splice(itemIndex, 1)[0];
        await saveWishlists(wishlists);

        res.json({
            success: true,
            message: 'Item removed from wishlist',
            removedItem,
            wishlistCount: wishlists[userId].length
        });

    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove item from wishlist',
            error: error.message
        });
    }
});

// PUT /api/wishlist/:userId/:itemId - Update wishlist item (e.g., add notes)
router.put('/:userId/:itemId', async (req, res) => {
    try {
        const { userId, itemId } = req.params;
        const { notes, category } = req.body;
        
        const wishlists = await loadWishlists();

        if (!wishlists[userId]) {
            return res.status(404).json({
                success: false,
                message: 'User wishlist not found'
            });
        }

        const item = wishlists[userId].find(item => item.id === itemId);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in wishlist'
            });
        }

        // Update item
        if (notes !== undefined) item.notes = notes;
        if (category !== undefined) item.category = category;
        item.updatedAt = new Date().toISOString();

        await saveWishlists(wishlists);

        res.json({
            success: true,
            message: 'Wishlist item updated',
            item
        });

    } catch (error) {
        console.error('Error updating wishlist item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update wishlist item',
            error: error.message
        });
    }
});

// POST /api/wishlist/:userId/clear - Clear entire wishlist
router.post('/:userId/clear', async (req, res) => {
    try {
        const { userId } = req.params;
        const wishlists = await loadWishlists();
        
        const itemCount = wishlists[userId] ? wishlists[userId].length : 0;
        wishlists[userId] = [];
        
        await saveWishlists(wishlists);

        res.json({
            success: true,
            message: 'Wishlist cleared',
            itemsRemoved: itemCount
        });

    } catch (error) {
        console.error('Error clearing wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear wishlist',
            error: error.message
        });
    }
});

// GET /api/wishlist/:userId/categories - Get wishlist items grouped by category
router.get('/:userId/categories', async (req, res) => {
    try {
        const { userId } = req.params;
        const wishlists = await loadWishlists();
        const userWishlist = wishlists[userId] || [];

        // Group items by category
        const categories = {};
        userWishlist.forEach(item => {
            const category = item.category || 'Uncategorized';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(item);
        });

        res.json({
            success: true,
            userId,
            categories,
            totalItems: userWishlist.length,
            categoryCount: Object.keys(categories).length
        });

    } catch (error) {
        console.error('Error getting wishlist categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get wishlist categories',
            error: error.message
        });
    }
});

// POST /api/wishlist/:userId/import-from-search - Add item from external search
router.post('/:userId/import-from-search', async (req, res) => {
    try {
        const { userId } = req.params;
        const { searchResult, category = 'Fashion' } = req.body;

        if (!searchResult || !searchResult.title) {
            return res.status(400).json({
                success: false,
                message: 'Valid search result with title is required'
            });
        }

        // Convert search result to wishlist item format
        const wishlistItem = {
            productUrl: searchResult.link || searchResult.url || '#',
            title: searchResult.title,
            price: searchResult.price,
            image: searchResult.image,
            retailer: searchResult.retailer,
            description: searchResult.description || '',
            category
        };

        // Use the add endpoint logic
        const wishlists = await loadWishlists();
        if (!wishlists[userId]) {
            wishlists[userId] = [];
        }

        // Check if item already exists
        const existingItem = wishlists[userId].find(item => 
            item.title === wishlistItem.title && item.retailer === wishlistItem.retailer
        );
        
        if (existingItem) {
            return res.status(409).json({
                success: false,
                message: 'Similar item already in wishlist',
                item: existingItem
            });
        }

        const newItem = {
            id: generateId(),
            ...wishlistItem,
            addedAt: new Date().toISOString(),
            notes: '',
            source: 'external_search'
        };

        wishlists[userId].push(newItem);
        await saveWishlists(wishlists);

        res.status(201).json({
            success: true,
            message: 'Item imported to wishlist from search',
            item: newItem,
            wishlistCount: wishlists[userId].length
        });

    } catch (error) {
        console.error('Error importing to wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to import item to wishlist',
            error: error.message
        });
    }
});

module.exports = router;
