// Database Configuration and Connection Manager
const { Pool } = require('pg');
const config = require('../config');

class DatabaseManager {
    constructor() {
        this.pool = null;
        this.readPool = null;
        this.isConnected = false;
        this.config = config;
    }

    // Initialize database connections
    async initialize() {
        try {
            console.log('🔧 Initializing database connections...');
            
            // Main database pool
            this.pool = new Pool({
                host: this.config.get('database.host'),
                port: this.config.get('database.port'),
                database: this.config.get('database.name'),
                user: this.config.get('database.user'),
                password: this.config.get('database.password'),
                ssl: this.config.get('database.ssl') ? { rejectUnauthorized: false } : false,
                
                // Connection pool settings
                min: this.config.get('database.pool.min'),
                max: this.config.get('database.pool.max'),
                idleTimeoutMillis: this.config.get('database.pool.idleTimeout'),
                connectionTimeoutMillis: this.config.get('database.connectionTimeout'),
                statement_timeout: this.config.get('database.statementTimeout'),
                query_timeout: this.config.get('database.queryTimeout'),
                
                // Connection health checks
                keepAlive: true,
                keepAliveInitialDelayMillis: 10000
            });

            // Read replica pool (if configured)
            const readReplicaHost = this.config.get('database.readReplica.host');
            if (readReplicaHost && this.config.isProduction()) {
                this.readPool = new Pool({
                    host: readReplicaHost,
                    port: this.config.get('database.readReplica.port'),
                    database: this.config.get('database.name'),
                    user: this.config.get('database.readReplica.user'),
                    password: this.config.get('database.readReplica.password'),
                    ssl: this.config.get('database.ssl') ? { rejectUnauthorized: false } : false,
                    
                    min: Math.floor(this.config.get('database.pool.min') / 2),
                    max: this.config.get('database.pool.max'),
                    idleTimeoutMillis: this.config.get('database.pool.idleTimeout'),
                    connectionTimeoutMillis: this.config.get('database.connectionTimeout')
                });
                
                console.log('📖 Read replica pool configured');
            }

            // Test connections
            await this.testConnection();
            
            // Setup event handlers
            this.setupEventHandlers();
            
            this.isConnected = true;
            console.log('✅ Database connections initialized successfully');
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            throw error;
        }
    }

    // Test database connectivity
    async testConnection() {
        try {
            // Test main database
            const mainClient = await this.pool.connect();
            const result = await mainClient.query('SELECT NOW() as current_time, version()');
            mainClient.release();
            
            console.log('✅ Main database connection successful');
            console.log(`   Database time: ${result.rows[0].current_time}`);
            console.log(`   PostgreSQL version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);

            // Test read replica if configured
            if (this.readPool) {
                const readClient = await this.readPool.connect();
                await readClient.query('SELECT 1');
                readClient.release();
                console.log('✅ Read replica connection successful');
            }

        } catch (error) {
            console.error('❌ Database connection test failed:', error.message);
            throw error;
        }
    }

    // Setup connection event handlers
    setupEventHandlers() {
        this.pool.on('connect', (client) => {
            console.log('🔗 New client connected to main database');
        });

        this.pool.on('error', (err, client) => {
            console.error('❌ Unexpected error on idle client:', err);
        });

        this.pool.on('remove', (client) => {
            console.log('🔌 Client disconnected from main database');
        });

        if (this.readPool) {
            this.readPool.on('error', (err, client) => {
                console.error('❌ Unexpected error on read replica client:', err);
            });
        }
    }

    // Get database pool for write operations
    getWritePool() {
        if (!this.isConnected) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.pool;
    }

    // Get database pool for read operations (uses read replica if available)
    getReadPool() {
        if (!this.isConnected) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.readPool || this.pool;
    }

    // Execute a query on the write database
    async query(text, params) {
        const client = await this.pool.connect();
        try {
            const start = Date.now();
            const result = await client.query(text, params);
            const duration = Date.now() - start;
            
            if (this.config.get('database.enableLogging')) {
                console.log('🗄️  Query executed:', { text, duration, rows: result.rowCount });
            }
            
            return result;
        } catch (error) {
            console.error('❌ Query error:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    // Execute a read-only query (uses read replica if available)
    async queryRead(text, params) {
        const pool = this.getReadPool();
        const client = await pool.connect();
        try {
            const start = Date.now();
            const result = await client.query(text, params);
            const duration = Date.now() - start;
            
            if (this.config.get('database.enableLogging')) {
                console.log('📖 Read query executed:', { text, duration, rows: result.rowCount });
            }
            
            return result;
        } catch (error) {
            console.error('❌ Read query error:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    // Execute multiple queries in a transaction
    async transaction(queries) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            const results = [];
            for (const query of queries) {
                const result = await client.query(query.text, query.params);
                results.push(result);
            }
            
            await client.query('COMMIT');
            console.log('✅ Transaction completed successfully');
            return results;
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Transaction failed, rolled back:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    // Get database health information
    async getHealthInfo() {
        try {
            const client = await this.pool.connect();
            
            // Get basic database info
            const dbInfo = await client.query(`
                SELECT 
                    current_database() as database_name,
                    current_user as current_user,
                    version() as version,
                    NOW() as current_time
            `);

            // Get connection pool stats
            const poolStats = {
                totalCount: this.pool.totalCount,
                idleCount: this.pool.idleCount,
                waitingCount: this.pool.waitingCount
            };

            // Get database size
            const sizeQuery = await client.query(`
                SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
            `);

            // Get active connections
            const connectionsQuery = await client.query(`
                SELECT count(*) as active_connections
                FROM pg_stat_activity 
                WHERE state = 'active'
            `);

            client.release();

            return {
                status: 'healthy',
                database: dbInfo.rows[0],
                pool: poolStats,
                size: sizeQuery.rows[0].database_size,
                activeConnections: parseInt(connectionsQuery.rows[0].active_connections),
                readReplica: this.readPool ? 'configured' : 'not_configured'
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    // Graceful shutdown
    async close() {
        try {
            console.log('🔌 Closing database connections...');
            
            if (this.pool) {
                await this.pool.end();
                console.log('✅ Main database pool closed');
            }
            
            if (this.readPool) {
                await this.readPool.end();
                console.log('✅ Read replica pool closed');
            }
            
            this.isConnected = false;
            console.log('✅ All database connections closed gracefully');
            
        } catch (error) {
            console.error('❌ Error closing database connections:', error.message);
            throw error;
        }
    }

    // Check if database is connected
    isHealthy() {
        return this.isConnected && this.pool && !this.pool.ended;
    }

    // Get database statistics for monitoring
    async getStats() {
        try {
            const client = await this.pool.connect();
            
            const stats = await client.query(`
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes,
                    n_live_tup as live_tuples,
                    n_dead_tup as dead_tuples
                FROM pg_stat_user_tables
                ORDER BY schemaname, tablename
            `);

            client.release();
            return stats.rows;
            
        } catch (error) {
            console.error('❌ Error getting database stats:', error.message);
            return [];
        }
    }

    // Utility method to check if we're using file-based storage (for migration)
    isUsingFileStorage() {
        return !this.config.get('database.host') || this.config.get('database.host') === '';
    }
}

module.exports = DatabaseManager;
