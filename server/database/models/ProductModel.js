// Product Model
const BaseModel = require('./BaseModel');

class ProductModel extends BaseModel {
    constructor(databaseManager) {
        super(databaseManager, 'products');
    }

    // Search products with filters
    async searchProducts(searchTerm = '', filters = {}, page = 1, pageSize = 20) {
        try {
            let conditions = [];
            let params = [];
            let paramCounter = 1;

            // Base query with joins to get price information
            let query = `
                SELECT DISTINCT p.*,
                    MIN(pp.price) as min_price,
                    MAX(pp.original_price) as max_original_price,
                    COUNT(DISTINCT pp.store_id) as store_count,
                    ARRAY_AGG(DISTINCT s.name) as available_stores
                FROM products p
                LEFT JOIN product_prices pp ON p.id = pp.product_id AND pp.availability = 'in_stock'
                LEFT JOIN stores s ON pp.store_id = s.id
                WHERE p.status = 'active'
            `;

            // Add search term (full text search)
            if (searchTerm && searchTerm.trim()) {
                query += ` AND (
                    to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.brand, '')) 
                    @@ plainto_tsquery('english', $${paramCounter})
                    OR LOWER(p.name) LIKE LOWER($${paramCounter + 1})
                    OR LOWER(p.brand) LIKE LOWER($${paramCounter + 1})
                )`;
                params.push(searchTerm.trim(), `%${searchTerm.trim()}%`);
                paramCounter += 2;
            }

            // Add category filter
            if (filters.category) {
                query += ` AND p.category = $${paramCounter}`;
                params.push(filters.category);
                paramCounter++;
            }

            // Add subcategory filter
            if (filters.subcategory) {
                query += ` AND p.subcategory = $${paramCounter}`;
                params.push(filters.subcategory);
                paramCounter++;
            }

            // Add brand filter
            if (filters.brand) {
                query += ` AND p.brand = $${paramCounter}`;
                params.push(filters.brand);
                paramCounter++;
            }

            // Add gender filter
            if (filters.gender) {
                query += ` AND p.gender = $${paramCounter}`;
                params.push(filters.gender);
                paramCounter++;
            }

            // Add color filter
            if (filters.color) {
                query += ` AND $${paramCounter} = ANY(p.colors)`;
                params.push(filters.color);
                paramCounter++;
            }

            // Add size filter
            if (filters.size) {
                query += ` AND $${paramCounter} = ANY(p.sizes)`;
                params.push(filters.size);
                paramCounter++;
            }

            // Add price range filter
            if (filters.minPrice || filters.maxPrice) {
                query += ` AND p.id IN (
                    SELECT DISTINCT product_id FROM product_prices 
                    WHERE availability = 'in_stock'`;
                
                if (filters.minPrice) {
                    query += ` AND price >= $${paramCounter}`;
                    params.push(parseFloat(filters.minPrice));
                    paramCounter++;
                }
                
                if (filters.maxPrice) {
                    query += ` AND price <= $${paramCounter}`;
                    params.push(parseFloat(filters.maxPrice));
                    paramCounter++;
                }
                
                query += `)`;
            }

            // Group by product
            query += ` GROUP BY p.id`;

            // Add sorting
            const sortBy = filters.sortBy || 'relevance';
            switch (sortBy) {
                case 'price_low':
                    query += ` ORDER BY min_price ASC NULLS LAST`;
                    break;
                case 'price_high':
                    query += ` ORDER BY min_price DESC NULLS LAST`;
                    break;
                case 'name':
                    query += ` ORDER BY p.name ASC`;
                    break;
                case 'newest':
                    query += ` ORDER BY p.created_at DESC`;
                    break;
                case 'brand':
                    query += ` ORDER BY p.brand ASC, p.name ASC`;
                    break;
                default: // relevance
                    if (searchTerm && searchTerm.trim()) {
                        query += ` ORDER BY ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')), plainto_tsquery('english', $${paramCounter})) DESC`;
                        params.push(searchTerm.trim());
                        paramCounter++;
                    } else {
                        query += ` ORDER BY p.created_at DESC`;
                    }
            }

            // Add pagination
            const offset = (page - 1) * pageSize;
            query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
            params.push(pageSize, offset);

            const result = await this.db.query(query, params);

            // Get total count for pagination
            let countQuery = `
                SELECT COUNT(DISTINCT p.id) as count
                FROM products p
                LEFT JOIN product_prices pp ON p.id = pp.product_id
                WHERE p.status = 'active'
            `;

            let countParams = [];
            let countParamCounter = 1;

            // Apply same filters for count
            if (searchTerm && searchTerm.trim()) {
                countQuery += ` AND (
                    to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.brand, '')) 
                    @@ plainto_tsquery('english', $${countParamCounter})
                    OR LOWER(p.name) LIKE LOWER($${countParamCounter + 1})
                    OR LOWER(p.brand) LIKE LOWER($${countParamCounter + 1})
                )`;
                countParams.push(searchTerm.trim(), `%${searchTerm.trim()}%`);
                countParamCounter += 2;
            }

            if (filters.category) {
                countQuery += ` AND p.category = $${countParamCounter}`;
                countParams.push(filters.category);
                countParamCounter++;
            }

            if (filters.subcategory) {
                countQuery += ` AND p.subcategory = $${countParamCounter}`;
                countParams.push(filters.subcategory);
                countParamCounter++;
            }

            if (filters.brand) {
                countQuery += ` AND p.brand = $${countParamCounter}`;
                countParams.push(filters.brand);
                countParamCounter++;
            }

            if (filters.gender) {
                countQuery += ` AND p.gender = $${countParamCounter}`;
                countParams.push(filters.gender);
                countParamCounter++;
            }

            if (filters.color) {
                countQuery += ` AND $${countParamCounter} = ANY(p.colors)`;
                countParams.push(filters.color);
                countParamCounter++;
            }

            if (filters.size) {
                countQuery += ` AND $${countParamCounter} = ANY(p.sizes)`;
                countParams.push(filters.size);
                countParamCounter++;
            }

            if (filters.minPrice || filters.maxPrice) {
                countQuery += ` AND p.id IN (
                    SELECT DISTINCT product_id FROM product_prices 
                    WHERE availability = 'in_stock'`;
                
                if (filters.minPrice) {
                    countQuery += ` AND price >= $${countParamCounter}`;
                    countParams.push(parseFloat(filters.minPrice));
                    countParamCounter++;
                }
                
                if (filters.maxPrice) {
                    countQuery += ` AND price <= $${countParamCounter}`;
                    countParams.push(parseFloat(filters.maxPrice));
                    countParamCounter++;
                }
                
                countQuery += `)`;
            }

            const countResult = await this.db.query(countQuery, countParams);
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
                },
                filters: {
                    searchTerm,
                    ...filters
                }
            };

        } catch (error) {
            console.error('Error searching products:', error);
            throw error;
        }
    }

    // Get product with all price information
    async getProductWithPrices(productId) {
        try {
            const query = `
                SELECT 
                    p.*,
                    COALESCE(
                        JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'store_id', pp.store_id,
                                'store_name', s.name,
                                'store_logo', s.logo_url,
                                'price', pp.price,
                                'original_price', pp.original_price,
                                'currency', pp.currency,
                                'availability', pp.availability,
                                'product_url', pp.product_url,
                                'sizes_available', pp.sizes_available,
                                'colors_available', pp.colors_available,
                                'last_checked', pp.last_checked
                            ) ORDER BY pp.price ASC
                        ) FILTER (WHERE pp.id IS NOT NULL), 
                        '[]'
                    ) as prices
                FROM products p
                LEFT JOIN product_prices pp ON p.id = pp.product_id
                LEFT JOIN stores s ON pp.store_id = s.id AND s.status = 'active'
                WHERE p.id = $1 AND p.status = 'active'
                GROUP BY p.id
            `;

            const result = await this.db.query(query, [productId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting product with prices:', error);
            throw error;
        }
    }

    // Get similar products
    async getSimilarProducts(productId, limit = 6) {
        try {
            const product = await this.findById(productId);
            if (!product) {
                return [];
            }

            const query = `
                SELECT p.*, MIN(pp.price) as min_price
                FROM products p
                LEFT JOIN product_prices pp ON p.id = pp.product_id AND pp.availability = 'in_stock'
                WHERE p.id != $1 
                    AND p.status = 'active'
                    AND (
                        p.category = $2 
                        OR p.brand = $3
                        OR p.subcategory = $4
                    )
                GROUP BY p.id
                ORDER BY 
                    CASE WHEN p.category = $2 THEN 3 ELSE 0 END +
                    CASE WHEN p.brand = $3 THEN 2 ELSE 0 END +
                    CASE WHEN p.subcategory = $4 THEN 1 ELSE 0 END DESC,
                    p.created_at DESC
                LIMIT $5
            `;

            const result = await this.db.query(query, [
                productId, 
                product.category, 
                product.brand, 
                product.subcategory, 
                limit
            ]);

            return result.rows;
        } catch (error) {
            console.error('Error getting similar products:', error);
            throw error;
        }
    }

    // Get trending products
    async getTrendingProducts(limit = 10, days = 7) {
        try {
            const query = `
                SELECT p.*, 
                    MIN(pp.price) as min_price,
                    COALESCE(SUM(pa.views), 0) as total_views,
                    COALESCE(SUM(pa.clicks), 0) as total_clicks,
                    COALESCE(COUNT(uf.id), 0) as favorites_count
                FROM products p
                LEFT JOIN product_prices pp ON p.id = pp.product_id AND pp.availability = 'in_stock'
                LEFT JOIN product_analytics pa ON p.id = pa.product_id 
                    AND pa.date >= CURRENT_DATE - INTERVAL '${days} days'
                LEFT JOIN user_favorites uf ON p.id = uf.product_id
                WHERE p.status = 'active'
                GROUP BY p.id
                HAVING COALESCE(SUM(pa.views), 0) > 0
                ORDER BY 
                    COALESCE(SUM(pa.views), 0) + 
                    COALESCE(SUM(pa.clicks), 0) * 2 + 
                    COALESCE(COUNT(uf.id), 0) * 3 DESC
                LIMIT $1
            `;

            const result = await this.db.query(query, [limit]);
            return result.rows;
        } catch (error) {
            console.error('Error getting trending products:', error);
            throw error;
        }
    }

    // Get categories with product counts
    async getCategories() {
        try {
            const query = `
                SELECT 
                    category,
                    COUNT(*) as product_count,
                    ARRAY_AGG(DISTINCT subcategory) FILTER (WHERE subcategory IS NOT NULL) as subcategories
                FROM products 
                WHERE status = 'active'
                GROUP BY category
                ORDER BY product_count DESC
            `;

            const result = await this.db.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error getting categories:', error);
            throw error;
        }
    }

    // Get brands with product counts
    async getBrands(category = null) {
        try {
            let query = `
                SELECT 
                    brand,
                    COUNT(*) as product_count
                FROM products 
                WHERE status = 'active' AND brand IS NOT NULL
            `;
            
            const params = [];
            if (category) {
                query += ` AND category = $1`;
                params.push(category);
            }
            
            query += ` GROUP BY brand ORDER BY product_count DESC`;

            const result = await this.db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error getting brands:', error);
            throw error;
        }
    }

    // Get price range for category/brand
    async getPriceRange(filters = {}) {
        try {
            let query = `
                SELECT 
                    MIN(pp.price) as min_price,
                    MAX(pp.price) as max_price,
                    AVG(pp.price) as avg_price
                FROM product_prices pp
                JOIN products p ON pp.product_id = p.id
                WHERE pp.availability = 'in_stock' AND p.status = 'active'
            `;

            const params = [];
            let paramCounter = 1;

            if (filters.category) {
                query += ` AND p.category = $${paramCounter}`;
                params.push(filters.category);
                paramCounter++;
            }

            if (filters.brand) {
                query += ` AND p.brand = $${paramCounter}`;
                params.push(filters.brand);
                paramCounter++;
            }

            const result = await this.db.query(query, params);
            return result.rows[0];
        } catch (error) {
            console.error('Error getting price range:', error);
            throw error;
        }
    }

    // Track product view
    async trackView(productId, userId = null, sessionId = null) {
        try {
            // Insert into user_activities if user is logged in
            if (userId) {
                await this.db.query(`
                    INSERT INTO user_activities (user_id, activity_type, entity_type, entity_id, session_id)
                    VALUES ($1, 'view', 'product', $2, $3)
                `, [userId, productId, sessionId]);
            }

            // Update daily analytics
            await this.db.query(`
                INSERT INTO product_analytics (product_id, date, views)
                VALUES ($1, CURRENT_DATE, 1)
                ON CONFLICT (product_id, date)
                DO UPDATE SET views = product_analytics.views + 1
            `, [productId]);

        } catch (error) {
            console.error('Error tracking product view:', error);
            // Don't throw error for analytics - shouldn't break user experience
        }
    }
}

module.exports = ProductModel;
