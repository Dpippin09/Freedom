#!/usr/bin/env node
// Database CLI Tool
const database = require('../server/database');
const config = require('../server/config');

async function main() {
    const command = process.argv[2];
    const args = process.argv.slice(3);

    if (!command) {
        console.log(`
🗄️  Freedom Fashion Database CLI

Usage: node scripts/db-cli.js <command> [args]

Commands:
  migrate              Run pending migrations
  rollback            Rollback last migration  
  seed                Seed database with initial data
  status              Show migration status
  create-migration    Create new migration file
  migrate-data        Migrate data from JSON files
  migration-status    Show data migration status
  health              Check database health
  stats               Show database statistics
  reset               Reset database (dev only)

Examples:
  node scripts/db-cli.js migrate
  node scripts/db-cli.js create-migration "add user preferences"
  node scripts/db-cli.js migrate-data
  node scripts/db-cli.js health
        `);
        process.exit(0);
    }

    try {
        // Initialize database connection
        console.log('🔧 Initializing database connection...');
        await database.initialize();
        
        // Run command
        await database.runCommand(command, args);
        
        console.log('✅ Command completed successfully');
        
    } catch (error) {
        console.error('❌ Command failed:', error.message);
        process.exit(1);
    } finally {
        // Close database connection
        try {
            await database.close();
        } catch (error) {
            console.error('⚠️  Error closing database:', error.message);
        }
    }
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Run CLI
main();
