// Database Module - Main Entry Point
const DatabaseManager = require('./connection');
const MigrationRunner = require('./migrations');
const DataMigrator = require('./migrator');
const { ModelManager } = require('./models');
const config = require('../config');

class Database {
    constructor() {
        this.manager = null;
        this.models = null;
        this.migrations = null;
        this.migrator = null;
        this.isInitialized = false;
    }

    // Initialize the entire database system
    async initialize() {
        try {
            console.log('🔧 Initializing database system...');
            
            // Initialize database connection manager
            this.manager = new DatabaseManager();
            await this.manager.initialize();
            
            // Initialize migration system
            this.migrations = new MigrationRunner(this.manager);
            await this.migrations.initialize();
            
            // Initialize model manager
            this.models = new ModelManager(this.manager);
            
            // Initialize data migrator
            this.migrator = new DataMigrator(this.manager, this.models);
            
            // Run pending migrations
            await this.migrations.runMigrations();
            
            // Seed database if in development and empty
            if (config.isDevelopment()) {
                await this.seedIfEmpty();
            }
            
            // Migrate from JSON files if needed
            if (config.get('database.autoMigrate', true)) {
                await this.migrator.migrateAll();
            }
            
            this.isInitialized = true;
            console.log('✅ Database system initialized successfully');
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            throw error;
        }
    }

    // Seed database with initial data if empty
    async seedIfEmpty() {
        try {
            const storeCount = await this.models.getModel('Store').count();
            const productCount = await this.models.getModel('Product').count();
            
            if (storeCount === 0 || productCount === 0) {
                console.log('🌱 Database is empty, seeding with initial data...');
                await this.migrations.seed();
            }
        } catch (error) {
            console.warn('⚠️  Seeding failed:', error.message);
        }
    }

    // Get database manager
    getManager() {
        this.ensureInitialized();
        return this.manager;
    }

    // Get model manager
    getModels() {
        this.ensureInitialized();
        return this.models;
    }

    // Get specific model
    getModel(modelName) {
        this.ensureInitialized();
        return this.models.getModel(modelName);
    }

    // Get migration runner
    getMigrations() {
        this.ensureInitialized();
        return this.migrations;
    }

    // Get data migrator
    getMigrator() {
        this.ensureInitialized();
        return this.migrator;
    }

    // Execute a query (write operation)
    async query(text, params) {
        this.ensureInitialized();
        return await this.manager.query(text, params);
    }

    // Execute a read-only query
    async queryRead(text, params) {
        this.ensureInitialized();
        return await this.manager.queryRead(text, params);
    }

    // Execute multiple queries in a transaction
    async transaction(queries) {
        this.ensureInitialized();
        return await this.manager.transaction(queries);
    }

    // Get database health information
    async getHealth() {
        if (!this.isInitialized) {
            return {
                status: 'not_initialized',
                error: 'Database not initialized'
            };
        }

        try {
            const managerHealth = await this.manager.getHealthInfo();
            const modelsHealth = await this.models.healthCheck();
            
            return {
                status: 'healthy',
                connection: managerHealth,
                models: modelsHealth,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Get database statistics
    async getStats() {
        this.ensureInitialized();
        return await this.manager.getStats();
    }

    // Check if using file-based storage
    isUsingFileStorage() {
        return this.manager ? this.manager.isUsingFileStorage() : true;
    }

    // Graceful shutdown
    async close() {
        try {
            if (this.manager) {
                await this.manager.close();
            }
            this.isInitialized = false;
            console.log('✅ Database system closed gracefully');
        } catch (error) {
            console.error('❌ Error closing database:', error.message);
            throw error;
        }
    }

    // Ensure database is initialized
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
    }

    // Database CLI commands for management
    async runCommand(command, args = []) {
        try {
            switch (command) {
                case 'migrate':
                    await this.migrations.runMigrations();
                    break;
                    
                case 'rollback':
                    await this.migrations.rollback();
                    break;
                    
                case 'seed':
                    await this.migrations.seed();
                    break;
                    
                case 'status':
                    await this.migrations.status();
                    break;
                    
                case 'create-migration':
                    if (!args[0]) {
                        throw new Error('Migration name required');
                    }
                    await this.migrations.createMigration(args[0]);
                    break;
                    
                case 'migrate-data':
                    await this.migrator.migrateAll();
                    break;
                    
                case 'migration-status':
                    const status = await this.migrator.getStatus();
                    console.log(JSON.stringify(status, null, 2));
                    break;
                    
                case 'health':
                    const health = await this.getHealth();
                    console.log(JSON.stringify(health, null, 2));
                    break;
                    
                case 'stats':
                    const stats = await this.getStats();
                    console.log(JSON.stringify(stats, null, 2));
                    break;
                    
                case 'reset':
                    if (!config.isDevelopment()) {
                        throw new Error('Reset only allowed in development');
                    }
                    await this.migrations.reset();
                    break;
                    
                default:
                    throw new Error(`Unknown command: ${command}`);
            }
        } catch (error) {
            console.error(`❌ Command '${command}' failed:`, error.message);
            throw error;
        }
    }
}

// Create singleton instance
const database = new Database();

// Export both the instance and the class
module.exports = database;
module.exports.Database = Database;
module.exports.DatabaseManager = DatabaseManager;
module.exports.MigrationRunner = MigrationRunner;
module.exports.DataMigrator = DataMigrator;
module.exports.ModelManager = ModelManager;
