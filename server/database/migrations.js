// Database Migration System
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

class MigrationRunner {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.migrationsDir = path.join(__dirname, 'migrations');
        this.seedsDir = path.join(__dirname, 'seeds');
    }

    // Initialize migration system
    async initialize() {
        try {
            console.log('🔧 Initializing migration system...');
            
            // Ensure migrations table exists
            await this.createMigrationsTable();
            
            // Create migrations and seeds directories if they don't exist
            await this.ensureDirectories();
            
            console.log('✅ Migration system initialized');
            
        } catch (error) {
            console.error('❌ Migration system initialization failed:', error.message);
            throw error;
        }
    }

    // Create migrations table
    async createMigrationsTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                checksum VARCHAR(64)
            );
        `;
        
        await this.db.query(query);
        console.log('📋 Migrations table ready');
    }

    // Ensure migration directories exist
    async ensureDirectories() {
        try {
            await fs.access(this.migrationsDir);
        } catch {
            await fs.mkdir(this.migrationsDir, { recursive: true });
            console.log('📁 Created migrations directory');
        }

        try {
            await fs.access(this.seedsDir);
        } catch {
            await fs.mkdir(this.seedsDir, { recursive: true });
            console.log('📁 Created seeds directory');
        }
    }

    // Run all pending migrations
    async runMigrations() {
        try {
            console.log('🚀 Running database migrations...');
            
            const migrationFiles = await this.getMigrationFiles();
            const executedMigrations = await this.getExecutedMigrations();
            
            const pendingMigrations = migrationFiles.filter(
                file => !executedMigrations.includes(file)
            );

            if (pendingMigrations.length === 0) {
                console.log('✅ No pending migrations');
                return;
            }

            console.log(`📝 Found ${pendingMigrations.length} pending migrations`);

            for (const migration of pendingMigrations) {
                await this.runMigration(migration);
            }

            console.log('✅ All migrations completed successfully');

        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            throw error;
        }
    }

    // Run a single migration
    async runMigration(migrationFile) {
        const client = await this.db.getWritePool().connect();
        
        try {
            await client.query('BEGIN');
            
            console.log(`⬆️  Running migration: ${migrationFile}`);
            
            // Read migration file
            const migrationPath = path.join(this.migrationsDir, migrationFile);
            const migrationSQL = await fs.readFile(migrationPath, 'utf8');
            
            // Calculate checksum
            const checksum = this.calculateChecksum(migrationSQL);
            
            // Execute migration
            await client.query(migrationSQL);
            
            // Record migration as executed
            await client.query(
                'INSERT INTO migrations (migration_name, checksum) VALUES ($1, $2)',
                [migrationFile, checksum]
            );
            
            await client.query('COMMIT');
            console.log(`✅ Migration completed: ${migrationFile}`);
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`❌ Migration failed: ${migrationFile}`, error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    // Rollback the last migration
    async rollback() {
        try {
            console.log('⬇️  Rolling back last migration...');
            
            const lastMigration = await this.getLastMigration();
            if (!lastMigration) {
                console.log('ℹ️  No migrations to rollback');
                return;
            }

            // Check if rollback file exists
            const rollbackFile = lastMigration.migration_name.replace('.sql', '.rollback.sql');
            const rollbackPath = path.join(this.migrationsDir, rollbackFile);
            
            try {
                const rollbackSQL = await fs.readFile(rollbackPath, 'utf8');
                
                const client = await this.db.getWritePool().connect();
                try {
                    await client.query('BEGIN');
                    await client.query(rollbackSQL);
                    await client.query(
                        'DELETE FROM migrations WHERE migration_name = $1',
                        [lastMigration.migration_name]
                    );
                    await client.query('COMMIT');
                    
                    console.log(`✅ Rollback completed: ${lastMigration.migration_name}`);
                } catch (error) {
                    await client.query('ROLLBACK');
                    throw error;
                } finally {
                    client.release();
                }
                
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log(`⚠️  No rollback file found for: ${lastMigration.migration_name}`);
                } else {
                    throw error;
                }
            }
            
        } catch (error) {
            console.error('❌ Rollback failed:', error.message);
            throw error;
        }
    }

    // Seed database with initial data
    async seed() {
        try {
            console.log('🌱 Seeding database...');
            
            const seedFiles = await this.getSeedFiles();
            
            for (const seedFile of seedFiles) {
                await this.runSeed(seedFile);
            }
            
            console.log('✅ Database seeding completed');
            
        } catch (error) {
            console.error('❌ Database seeding failed:', error.message);
            throw error;
        }
    }

    // Run a single seed file
    async runSeed(seedFile) {
        try {
            console.log(`🌱 Running seed: ${seedFile}`);
            
            const seedPath = path.join(this.seedsDir, seedFile);
            const seedSQL = await fs.readFile(seedPath, 'utf8');
            
            await this.db.query(seedSQL);
            
            console.log(`✅ Seed completed: ${seedFile}`);
            
        } catch (error) {
            console.error(`❌ Seed failed: ${seedFile}`, error.message);
            throw error;
        }
    }

    // Generate a new migration file
    async createMigration(name) {
        try {
            const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
            const filename = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}.sql`;
            const filepath = path.join(this.migrationsDir, filename);
            
            const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Don't forget to create a corresponding rollback file: ${filename.replace('.sql', '.rollback.sql')}
`;
            
            await fs.writeFile(filepath, template, 'utf8');
            
            console.log(`✅ Migration file created: ${filename}`);
            console.log(`📝 Edit the file at: ${filepath}`);
            console.log(`📝 Create rollback at: ${filepath.replace('.sql', '.rollback.sql')}`);
            
            return filename;
            
        } catch (error) {
            console.error('❌ Failed to create migration:', error.message);
            throw error;
        }
    }

    // Get list of migration files
    async getMigrationFiles() {
        try {
            const files = await fs.readdir(this.migrationsDir);
            return files
                .filter(file => file.endsWith('.sql') && !file.includes('.rollback.'))
                .sort();
        } catch (error) {
            return [];
        }
    }

    // Get list of executed migrations
    async getExecutedMigrations() {
        try {
            const result = await this.db.query(
                'SELECT migration_name FROM migrations ORDER BY executed_at'
            );
            return result.rows.map(row => row.migration_name);
        } catch (error) {
            return [];
        }
    }

    // Get the last executed migration
    async getLastMigration() {
        try {
            const result = await this.db.query(
                'SELECT * FROM migrations ORDER BY executed_at DESC LIMIT 1'
            );
            return result.rows[0] || null;
        } catch (error) {
            return null;
        }
    }

    // Get list of seed files
    async getSeedFiles() {
        try {
            const files = await fs.readdir(this.seedsDir);
            return files.filter(file => file.endsWith('.sql')).sort();
        } catch (error) {
            return [];
        }
    }

    // Calculate file checksum
    calculateChecksum(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    // Check migration status
    async status() {
        try {
            const migrationFiles = await this.getMigrationFiles();
            const executedMigrations = await this.getExecutedMigrations();
            
            console.log('\n📊 Migration Status:');
            console.log('=====================================');
            
            if (migrationFiles.length === 0) {
                console.log('📝 No migration files found');
                return;
            }
            
            migrationFiles.forEach(file => {
                const isExecuted = executedMigrations.includes(file);
                const status = isExecuted ? '✅ Executed' : '⏳ Pending';
                console.log(`${status}: ${file}`);
            });
            
            const pendingCount = migrationFiles.length - executedMigrations.length;
            console.log('=====================================');
            console.log(`📈 Total migrations: ${migrationFiles.length}`);
            console.log(`✅ Executed: ${executedMigrations.length}`);
            console.log(`⏳ Pending: ${pendingCount}`);
            
        } catch (error) {
            console.error('❌ Failed to check migration status:', error.message);
            throw error;
        }
    }

    // Reset database (DANGER: drops all data)
    async reset() {
        if (!config.isDevelopment()) {
            throw new Error('Database reset is only allowed in development environment');
        }
        
        try {
            console.log('⚠️  Resetting database (development only)...');
            
            // Drop all tables
            await this.db.query(`
                DROP SCHEMA public CASCADE;
                CREATE SCHEMA public;
                GRANT ALL ON SCHEMA public TO public;
            `);
            
            console.log('🗑️  All tables dropped');
            
            // Recreate migrations table
            await this.createMigrationsTable();
            
            console.log('✅ Database reset completed');
            
        } catch (error) {
            console.error('❌ Database reset failed:', error.message);
            throw error;
        }
    }
}

module.exports = MigrationRunner;
