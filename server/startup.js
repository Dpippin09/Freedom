// Server startup script with database initialization
const database = require('./database');
const config = require('./config');

async function startServer() {
    try {
        console.log('🚀 Starting Freedom Fashion server...');
        console.log(`🌍 Environment: ${config.environment}`);
        console.log(`🔧 Configuration: ${config.isDevelopment() ? 'Development' : 'Production'}`);
        
        // Initialize database first
        console.log('📊 Initializing database...');
        await database.initialize();
        
        // Start Express server
        const app = require('./app');
        const port = config.get('server.port');
        const host = config.get('server.host');
        
        const server = app.listen(port, host, () => {
            console.log(`✅ Server running on ${host}:${port}`);
            console.log(`🏠 Frontend: http://${host}:${port}`);
            console.log(`🔍 API: http://${host}:${port}/api`);
            console.log(`💚 Health: http://${host}:${port}/health`);
            
            if (config.isDevelopment()) {
                console.log(`📊 Database CLI: node scripts/db-cli.js <command>`);
                console.log(`🛠️  Available commands: migrate, seed, status, health`);
            }
        });

        // Graceful shutdown handlers
        const gracefulShutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
            
            // Stop accepting new connections
            server.close(async () => {
                console.log('🔌 HTTP server closed');
                
                try {
                    // Close database connections
                    await database.close();
                    console.log('📊 Database connections closed');
                    
                    console.log('✅ Graceful shutdown completed');
                    process.exit(0);
                } catch (error) {
                    console.error('❌ Error during shutdown:', error);
                    process.exit(1);
                }
            });
            
            // Force shutdown after timeout
            setTimeout(() => {
                console.error('⏰ Shutdown timeout, forcing exit');
                process.exit(1);
            }, 10000);
        };

        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        
        // Handle unhandled errors
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('unhandledRejection');
        });

        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            gracefulShutdown('uncaughtException');
        });
        
        return server;
        
    } catch (error) {
        console.error('❌ Server startup failed:', error);
        
        // Try to close database connection if it was opened
        try {
            await database.close();
        } catch (dbError) {
            console.error('❌ Error closing database during startup failure:', dbError);
        }
        
        process.exit(1);
    }
}

// Start server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = startServer;
