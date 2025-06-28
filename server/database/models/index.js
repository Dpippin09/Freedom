// Database Models Index
const UserModel = require('./UserModel');
const ProductModel = require('./ProductModel');
const BaseModel = require('./BaseModel');

class ModelManager {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.models = {};
        this.initializeModels();
    }

    // Initialize all model instances
    initializeModels() {
        this.models.User = new UserModel(this.db);
        this.models.Product = new ProductModel(this.db);
        
        // Create base model instances for other tables
        this.models.Store = new BaseModel(this.db, 'stores');
        this.models.ProductPrice = new BaseModel(this.db, 'product_prices');
        this.models.UserFavorite = new BaseModel(this.db, 'user_favorites');
        this.models.UserSearch = new BaseModel(this.db, 'user_searches');
        this.models.UserActivity = new BaseModel(this.db, 'user_activities');
        this.models.PriceAlert = new BaseModel(this.db, 'price_alerts');
        this.models.AnalyticsDaily = new BaseModel(this.db, 'analytics_daily');
        this.models.ProductAnalytics = new BaseModel(this.db, 'product_analytics');
        this.models.StoreAnalytics = new BaseModel(this.db, 'store_analytics');
        this.models.Notification = new BaseModel(this.db, 'notifications');
        this.models.RateLimit = new BaseModel(this.db, 'rate_limits');
    }

    // Get a model by name
    getModel(modelName) {
        if (!this.models[modelName]) {
            throw new Error(`Model '${modelName}' not found`);
        }
        return this.models[modelName];
    }

    // Get all models
    getAllModels() {
        return this.models;
    }

    // Add custom methods for common cross-model operations

    // Add product to user favorites
    async addToFavorites(userId, productId) {
        try {
            const existing = await this.models.UserFavorite.findOne({
                user_id: userId,
                product_id: productId
            });

            if (existing) {
                return existing; // Already in favorites
            }

            const favorite = await this.models.UserFavorite.create({
                user_id: userId,
                product_id: productId
            });

            // Track analytics
            await this.models.UserActivity.create({
                user_id: userId,
                activity_type: 'favorite',
                entity_type: 'product',
                entity_id: productId
            });

            // Update daily product analytics
            await this.db.query(`
                INSERT INTO product_analytics (product_id, date, favorites)
                VALUES ($1, CURRENT_DATE, 1)
                ON CONFLICT (product_id, date)
                DO UPDATE SET favorites = product_analytics.favorites + 1
            `, [productId]);

            return favorite;
        } catch (error) {
            console.error('Error adding to favorites:', error);
            throw error;
        }
    }

    // Remove product from user favorites
    async removeFromFavorites(userId, productId) {
        try {
            const favorite = await this.models.UserFavorite.findOne({
                user_id: userId,
                product_id: productId
            });

            if (!favorite) {
                return null; // Not in favorites
            }

            await this.models.UserFavorite.deleteById(favorite.id);

            // Track analytics
            await this.models.UserActivity.create({
                user_id: userId,
                activity_type: 'unfavorite',
                entity_type: 'product',
                entity_id: productId
            });

            return favorite;
        } catch (error) {
            console.error('Error removing from favorites:', error);
            throw error;
        }
    }

    // Get user's favorite products with details
    async getUserFavorites(userId, page = 1, pageSize = 20) {
        try {
            const query = `
                SELECT p.*, 
                    uf.created_at as favorited_at,
                    MIN(pp.price) as min_price,
                    COUNT(DISTINCT pp.store_id) as store_count
                FROM user_favorites uf
                JOIN products p ON uf.product_id = p.id
                LEFT JOIN product_prices pp ON p.id = pp.product_id AND pp.availability = 'in_stock'
                WHERE uf.user_id = $1 AND p.status = 'active'
                GROUP BY p.id, uf.created_at
                ORDER BY uf.created_at DESC
                LIMIT $2 OFFSET $3
            `;

            const offset = (page - 1) * pageSize;
            const result = await this.db.query(query, [userId, pageSize, offset]);

            // Get total count
            const countResult = await this.db.query(`
                SELECT COUNT(*) as count
                FROM user_favorites uf
                JOIN products p ON uf.product_id = p.id
                WHERE uf.user_id = $1 AND p.status = 'active'
            `, [userId]);

            const totalItems = parseInt(countResult.rows[0].count);

            return {
                items: result.rows,
                pagination: {
                    currentPage: page,
                    pageSize,
                    totalItems,
                    totalPages: Math.ceil(totalItems / pageSize),
                    hasNextPage: page < Math.ceil(totalItems / pageSize),
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            console.error('Error getting user favorites:', error);
            throw error;
        }
    }

    // Create price alert
    async createPriceAlert(userId, productId, targetPrice) {
        try {
            // Check if alert already exists
            const existing = await this.models.PriceAlert.findOne({
                user_id: userId,
                product_id: productId,
                status: 'active'
            });

            if (existing) {
                // Update existing alert
                return await this.models.PriceAlert.updateById(existing.id, {
                    target_price: targetPrice
                });
            }

            // Get current minimum price
            const priceQuery = `
                SELECT MIN(price) as current_price
                FROM product_prices
                WHERE product_id = $1 AND availability = 'in_stock'
            `;
            const priceResult = await this.db.query(priceQuery, [productId]);
            const currentPrice = priceResult.rows[0]?.current_price || null;

            // Create new alert
            const alert = await this.models.PriceAlert.create({
                user_id: userId,
                product_id: productId,
                target_price: targetPrice,
                current_price: currentPrice
            });

            // Track analytics
            await this.models.UserActivity.create({
                user_id: userId,
                activity_type: 'price_alert_created',
                entity_type: 'product',
                entity_id: productId,
                details: { target_price: targetPrice }
            });

            return alert;
        } catch (error) {
            console.error('Error creating price alert:', error);
            throw error;
        }
    }

    // Log user search
    async logSearch(searchQuery, filters = {}, resultsCount = 0, userId = null, sessionId = null, clickedProductId = null) {
        try {
            const search = await this.models.UserSearch.create({
                user_id: userId,
                search_query: searchQuery,
                filters: filters,
                results_count: resultsCount,
                clicked_product_id: clickedProductId,
                session_id: sessionId
            });

            // Update daily analytics
            await this.db.query(`
                INSERT INTO analytics_daily (date, total_searches)
                VALUES (CURRENT_DATE, 1)
                ON CONFLICT (date)
                DO UPDATE SET total_searches = analytics_daily.total_searches + 1
            `);

            return search;
        } catch (error) {
            console.error('Error logging search:', error);
            // Don't throw - analytics shouldn't break user experience
        }
    }

    // Get search suggestions based on history
    async getSearchSuggestions(query, limit = 5) {
        try {
            const suggestions = await this.db.query(`
                SELECT search_query, COUNT(*) as frequency
                FROM user_searches
                WHERE search_query ILIKE $1
                    AND search_query != $2
                    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY search_query
                ORDER BY frequency DESC, search_query
                LIMIT $3
            `, [`%${query}%`, query, limit]);

            return suggestions.rows.map(row => row.search_query);
        } catch (error) {
            console.error('Error getting search suggestions:', error);
            return [];
        }
    }

    // Get dashboard analytics
    async getDashboardAnalytics(days = 30) {
        try {
            const query = `
                SELECT 
                    DATE(date) as date,
                    total_searches,
                    unique_visitors,
                    page_views,
                    product_views
                FROM analytics_daily 
                WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
                ORDER BY date DESC
            `;

            const result = await this.db.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error getting dashboard analytics:', error);
            throw error;
        }
    }

    // Health check for database models
    async healthCheck() {
        try {
            const checks = {};

            // Test each critical model
            checks.users = await this.models.User.count();
            checks.products = await this.models.Product.count();
            checks.stores = await this.models.Store.count();
            checks.productPrices = await this.models.ProductPrice.count();

            // Test a complex query
            const testQuery = await this.db.query(`
                SELECT COUNT(DISTINCT p.id) as active_products
                FROM products p
                JOIN product_prices pp ON p.id = pp.product_id
                WHERE p.status = 'active' AND pp.availability = 'in_stock'
            `);
            checks.activeProductsWithPrices = testQuery.rows[0].active_products;

            return {
                status: 'healthy',
                models: checks,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Model health check failed:', error);
            throw error;
        }
    }
}

module.exports = {
    ModelManager,
    UserModel,
    ProductModel,
    BaseModel
};
