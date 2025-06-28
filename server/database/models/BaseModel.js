// Base Model Class - Simple ORM Pattern
class BaseModel {
    constructor(databaseManager, tableName) {
        this.db = databaseManager;
        this.tableName = tableName;
        this.primaryKey = 'id';
    }

    // Find by ID
    async findById(id) {
        try {
            const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
            const result = await this.db.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error(`Error finding ${this.tableName} by ID:`, error);
            throw error;
        }
    }

    // Find multiple records with conditions
    async find(conditions = {}, options = {}) {
        try {
            let query = `SELECT * FROM ${this.tableName}`;
            const params = [];
            let paramCounter = 1;

            // Add WHERE conditions
            if (Object.keys(conditions).length > 0) {
                const whereClause = Object.keys(conditions).map(key => {
                    params.push(conditions[key]);
                    return `${key} = $${paramCounter++}`;
                }).join(' AND ');
                query += ` WHERE ${whereClause}`;
            }

            // Add ORDER BY
            if (options.orderBy) {
                const order = options.orderDirection || 'ASC';
                query += ` ORDER BY ${options.orderBy} ${order}`;
            }

            // Add LIMIT
            if (options.limit) {
                query += ` LIMIT $${paramCounter++}`;
                params.push(options.limit);
            }

            // Add OFFSET
            if (options.offset) {
                query += ` OFFSET $${paramCounter++}`;
                params.push(options.offset);
            }

            const result = await this.db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error(`Error finding ${this.tableName}:`, error);
            throw error;
        }
    }

    // Find one record
    async findOne(conditions = {}) {
        const results = await this.find(conditions, { limit: 1 });
        return results[0] || null;
    }

    // Create a new record
    async create(data) {
        try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
            
            const query = `
                INSERT INTO ${this.tableName} (${keys.join(', ')})
                VALUES (${placeholders})
                RETURNING *
            `;
            
            const result = await this.db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error(`Error creating ${this.tableName}:`, error);
            throw error;
        }
    }

    // Update a record by ID
    async updateById(id, data) {
        try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            
            const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
            
            const query = `
                UPDATE ${this.tableName}
                SET ${setClause}
                WHERE ${this.primaryKey} = $1
                RETURNING *
            `;
            
            const result = await this.db.query(query, [id, ...values]);
            return result.rows[0] || null;
        } catch (error) {
            console.error(`Error updating ${this.tableName}:`, error);
            throw error;
        }
    }

    // Delete a record by ID
    async deleteById(id) {
        try {
            const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1 RETURNING *`;
            const result = await this.db.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error(`Error deleting ${this.tableName}:`, error);
            throw error;
        }
    }

    // Count records
    async count(conditions = {}) {
        try {
            let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
            const params = [];
            let paramCounter = 1;

            if (Object.keys(conditions).length > 0) {
                const whereClause = Object.keys(conditions).map(key => {
                    params.push(conditions[key]);
                    return `${key} = $${paramCounter++}`;
                }).join(' AND ');
                query += ` WHERE ${whereClause}`;
            }

            const result = await this.db.query(query, params);
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error(`Error counting ${this.tableName}:`, error);
            throw error;
        }
    }

    // Execute raw query
    async raw(query, params = []) {
        try {
            const result = await this.db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error(`Error executing raw query on ${this.tableName}:`, error);
            throw error;
        }
    }

    // Paginate results
    async paginate(conditions = {}, page = 1, pageSize = 10, options = {}) {
        try {
            const offset = (page - 1) * pageSize;
            const items = await this.find(conditions, {
                ...options,
                limit: pageSize,
                offset: offset
            });
            
            const totalItems = await this.count(conditions);
            const totalPages = Math.ceil(totalItems / pageSize);
            
            return {
                items,
                pagination: {
                    currentPage: page,
                    pageSize,
                    totalItems,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            console.error(`Error paginating ${this.tableName}:`, error);
            throw error;
        }
    }

    // Bulk create
    async bulkCreate(dataArray) {
        if (!dataArray || dataArray.length === 0) {
            return [];
        }

        try {
            const keys = Object.keys(dataArray[0]);
            const valuesClause = dataArray.map((_, rowIndex) => {
                const rowPlaceholders = keys.map((_, colIndex) => 
                    `$${rowIndex * keys.length + colIndex + 1}`
                ).join(', ');
                return `(${rowPlaceholders})`;
            }).join(', ');

            const flatValues = dataArray.flatMap(item => Object.values(item));
            
            const query = `
                INSERT INTO ${this.tableName} (${keys.join(', ')})
                VALUES ${valuesClause}
                RETURNING *
            `;
            
            const result = await this.db.query(query, flatValues);
            return result.rows;
        } catch (error) {
            console.error(`Error bulk creating ${this.tableName}:`, error);
            throw error;
        }
    }

    // Check if record exists
    async exists(conditions) {
        const count = await this.count(conditions);
        return count > 0;
    }

    // Get the first record
    async first(conditions = {}, options = {}) {
        return await this.findOne(conditions, options);
    }

    // Get the last record
    async last(conditions = {}, orderBy = null) {
        const orderField = orderBy || this.primaryKey;
        const options = {
            orderBy: orderField,
            orderDirection: 'DESC',
            limit: 1
        };
        const results = await this.find(conditions, options);
        return results[0] || null;
    }
}

module.exports = BaseModel;
