// Data Migration Tool
// Migrates data from JSON files to PostgreSQL database
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

class DataMigrator {
    constructor(databaseManager, modelManager) {
        this.db = databaseManager;
        this.models = modelManager;
        this.dataDir = path.join(__dirname, '../../data');
    }

    // Main migration function
    async migrateAll() {
        try {
            console.log('🚀 Starting data migration from JSON files to PostgreSQL...');
            
            // Check if we should migrate
            if (!await this.shouldMigrate()) {
                console.log('ℹ️  Migration not needed or already completed');
                return;
            }

            // Migrate in specific order due to dependencies
            await this.migrateUsers();
            await this.migrateProducts();
            await this.migrateNotifications();
            await this.migrateAnalytics();
            
            console.log('✅ Data migration completed successfully');
            
        } catch (error) {
            console.error('❌ Data migration failed:', error.message);
            throw error;
        }
    }

    // Check if migration should run
    async shouldMigrate() {
        try {
            // Check if we have JSON files to migrate
            const hasJsonFiles = await this.hasJsonFiles();
            if (!hasJsonFiles) {
                console.log('📝 No JSON files found to migrate');
                return false;
            }

            // Check if database already has data
            const userCount = await this.models.getModel('User').count();
            const productCount = await this.models.getModel('Product').count();
            
            if (userCount > 0 || productCount > 0) {
                console.log(`📊 Database already contains data (${userCount} users, ${productCount} products)`);
                console.log('💡 Use --force flag to migrate anyway');
                return false;
            }

            return true;
        } catch (error) {
            console.warn('⚠️  Could not determine migration status:', error.message);
            return false;
        }
    }

    // Check if JSON files exist
    async hasJsonFiles() {
        try {
            const files = await fs.readdir(this.dataDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            return jsonFiles.length > 0;
        } catch (error) {
            return false;
        }
    }

    // Migrate users from users.json
    async migrateUsers() {
        try {
            console.log('👥 Migrating users...');
            
            const usersPath = path.join(this.dataDir, 'users.json');
            const usersData = await this.readJsonFile(usersPath);
            
            if (!usersData || !Array.isArray(usersData)) {
                console.log('📝 No users data found to migrate');
                return;
            }

            let migratedCount = 0;
            const UserModel = this.models.getModel('User');

            for (const userData of usersData) {
                try {
                    // Check if user already exists
                    const existingUser = await UserModel.findByEmail(userData.email);
                    if (existingUser) {
                        console.log(`⏭️  User ${userData.email} already exists, skipping`);
                        continue;
                    }

                    // Create user (password will be hashed automatically)
                    await UserModel.create({
                        email: userData.email,
                        password_hash: userData.password || '$2b$12$defaulthash', // Placeholder hash
                        first_name: userData.firstName || userData.first_name,
                        last_name: userData.lastName || userData.last_name,
                        email_verified: userData.emailVerified || false,
                        preferences: userData.preferences || {},
                        status: userData.status || 'active',
                        role: userData.role || 'user',
                        created_at: userData.createdAt || userData.created_at || new Date()
                    });

                    migratedCount++;
                } catch (error) {
                    console.warn(`⚠️  Failed to migrate user ${userData.email}:`, error.message);
                }
            }

            console.log(`✅ Migrated ${migratedCount} users`);
        } catch (error) {
            console.warn('⚠️  User migration failed:', error.message);
        }
    }

    // Migrate products from products.json
    async migrateProducts() {
        try {
            console.log('🛍️  Migrating products...');
            
            const productsPath = path.join(this.dataDir, 'products.json');
            const productsData = await this.readJsonFile(productsPath);
            
            if (!productsData || !Array.isArray(productsData)) {
                console.log('📝 No products data found to migrate');
                return;
            }

            let migratedCount = 0;
            const ProductModel = this.models.getModel('Product');
            const StoreModel = this.models.getModel('Store');
            const ProductPriceModel = this.models.getModel('ProductPrice');

            for (const productData of productsData) {
                try {
                    // Create product
                    const product = await ProductModel.create({
                        name: productData.name,
                        description: productData.description,
                        category: productData.category,
                        subcategory: productData.subcategory,
                        brand: productData.brand,
                        gender: productData.gender,
                        colors: productData.colors || [],
                        sizes: productData.sizes || [],
                        tags: productData.tags || [],
                        image_url: productData.imageUrl || productData.image_url,
                        images: productData.images || [],
                        sku: productData.sku || `MIGRATED-${Date.now()}-${migratedCount}`,
                        status: productData.status || 'active',
                        created_at: productData.createdAt || productData.created_at || new Date()
                    });

                    // Migrate pricing data if available
                    if (productData.prices && Array.isArray(productData.prices)) {
                        for (const priceData of productData.prices) {
                            try {
                                // Find or create store
                                let store = await StoreModel.findOne({ name: priceData.storeName || priceData.store });
                                if (!store) {
                                    store = await StoreModel.create({
                                        name: priceData.storeName || priceData.store || 'Unknown Store',
                                        website_url: priceData.storeUrl || priceData.url || 'https://example.com',
                                        status: 'active'
                                    });
                                }

                                // Create price entry
                                await ProductPriceModel.create({
                                    product_id: product.id,
                                    store_id: store.id,
                                    price: parseFloat(priceData.price),
                                    original_price: priceData.originalPrice ? parseFloat(priceData.originalPrice) : null,
                                    currency: priceData.currency || 'USD',
                                    availability: priceData.availability || 'in_stock',
                                    product_url: priceData.url || priceData.productUrl || '',
                                    sizes_available: priceData.sizesAvailable || productData.sizes || [],
                                    colors_available: priceData.colorsAvailable || productData.colors || [],
                                    last_checked: new Date()
                                });
                            } catch (error) {
                                console.warn(`⚠️  Failed to migrate price for ${product.name}:`, error.message);
                            }
                        }
                    }

                    migratedCount++;
                } catch (error) {
                    console.warn(`⚠️  Failed to migrate product ${productData.name}:`, error.message);
                }
            }

            console.log(`✅ Migrated ${migratedCount} products`);
        } catch (error) {
            console.warn('⚠️  Product migration failed:', error.message);
        }
    }

    // Migrate notifications
    async migrateNotifications() {
        try {
            console.log('🔔 Migrating notifications...');
            
            const notificationsPath = path.join(this.dataDir, 'notifications.json');
            const notificationsData = await this.readJsonFile(notificationsPath);
            
            if (!notificationsData || !Array.isArray(notificationsData)) {
                console.log('📝 No notifications data found to migrate');
                return;
            }

            let migratedCount = 0;
            const NotificationModel = this.models.getModel('Notification');
            const UserModel = this.models.getModel('User');

            for (const notificationData of notificationsData) {
                try {
                    let userId = null;
                    
                    // Try to find user by email if provided
                    if (notificationData.userEmail) {
                        const user = await UserModel.findByEmail(notificationData.userEmail);
                        userId = user ? user.id : null;
                    } else if (notificationData.userId) {
                        userId = notificationData.userId;
                    }

                    await NotificationModel.create({
                        user_id: userId,
                        type: notificationData.type || 'system',
                        title: notificationData.title,
                        message: notificationData.message,
                        data: notificationData.data || {},
                        read_at: notificationData.readAt || notificationData.read_at || null,
                        created_at: notificationData.createdAt || notificationData.created_at || new Date(),
                        expires_at: notificationData.expiresAt || notificationData.expires_at || null
                    });

                    migratedCount++;
                } catch (error) {
                    console.warn(`⚠️  Failed to migrate notification:`, error.message);
                }
            }

            console.log(`✅ Migrated ${migratedCount} notifications`);
        } catch (error) {
            console.warn('⚠️  Notification migration failed:', error.message);
        }
    }

    // Migrate analytics data
    async migrateAnalytics() {
        try {
            console.log('📊 Migrating analytics...');
            
            const analyticsPath = path.join(this.dataDir, 'analytics.json');
            const analyticsData = await this.readJsonFile(analyticsPath);
            
            if (!analyticsData) {
                console.log('📝 No analytics data found to migrate');
                return;
            }

            const AnalyticsModel = this.models.getModel('AnalyticsDaily');

            // Migrate daily analytics if available
            if (analyticsData.daily && Array.isArray(analyticsData.daily)) {
                let migratedCount = 0;
                
                for (const dayData of analyticsData.daily) {
                    try {
                        await AnalyticsModel.create({
                            date: new Date(dayData.date),
                            total_searches: dayData.totalSearches || 0,
                            unique_visitors: dayData.uniqueVisitors || 0,
                            page_views: dayData.pageViews || 0,
                            product_views: dayData.productViews || 0,
                            click_through_rate: dayData.clickThroughRate || 0,
                            bounce_rate: dayData.bounceRate || 0,
                            avg_session_duration: dayData.avgSessionDuration || 0,
                            top_categories: dayData.topCategories || [],
                            top_brands: dayData.topBrands || [],
                            top_products: dayData.topProducts || [],
                            revenue_data: dayData.revenueData || {}
                        });
                        migratedCount++;
                    } catch (error) {
                        console.warn(`⚠️  Failed to migrate analytics for ${dayData.date}:`, error.message);
                    }
                }
                
                console.log(`✅ Migrated ${migratedCount} daily analytics records`);
            }

        } catch (error) {
            console.warn('⚠️  Analytics migration failed:', error.message);
        }
    }

    // Utility function to read JSON file
    async readJsonFile(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null; // File doesn't exist
            }
            throw error;
        }
    }

    // Create backup of JSON files after successful migration
    async createBackup() {
        try {
            console.log('💾 Creating backup of JSON files...');
            
            const backupDir = path.join(this.dataDir, 'backup_' + new Date().toISOString().split('T')[0]);
            await fs.mkdir(backupDir, { recursive: true });
            
            const files = await fs.readdir(this.dataDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            
            for (const file of jsonFiles) {
                const sourcePath = path.join(this.dataDir, file);
                const destPath = path.join(backupDir, file);
                await fs.copyFile(sourcePath, destPath);
            }
            
            console.log(`✅ Backup created at: ${backupDir}`);
        } catch (error) {
            console.warn('⚠️  Backup creation failed:', error.message);
        }
    }

    // Get migration status
    async getStatus() {
        try {
            const hasJsonFiles = await this.hasJsonFiles();
            const userCount = await this.models.getModel('User').count();
            const productCount = await this.models.getModel('Product').count();
            const storeCount = await this.models.getModel('Store').count();
            const notificationCount = await this.models.getModel('Notification').count();
            
            return {
                hasJsonFiles,
                databaseCounts: {
                    users: userCount,
                    products: productCount,
                    stores: storeCount,
                    notifications: notificationCount
                },
                migrationRecommended: hasJsonFiles && (userCount === 0 && productCount === 0)
            };
        } catch (error) {
            console.error('Failed to get migration status:', error);
            return {
                error: error.message
            };
        }
    }
}

module.exports = DataMigrator;
