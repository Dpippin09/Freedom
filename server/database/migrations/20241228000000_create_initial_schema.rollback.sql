-- Rollback: Create initial schema
-- Created: 2024-12-28T00:00:00.000Z

-- Drop all views first
DROP VIEW IF EXISTS price_history;
DROP VIEW IF EXISTS popular_products;
DROP VIEW IF EXISTS products_with_min_price;

-- Drop triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
DROP TRIGGER IF EXISTS update_product_prices_updated_at ON product_prices;
DROP TRIGGER IF EXISTS update_price_alerts_updated_at ON price_alerts;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop all indexes (they will be dropped with tables, but for completeness)
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_status;
DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_products_brand;
DROP INDEX IF EXISTS idx_products_status;
DROP INDEX IF EXISTS idx_products_created_at;
DROP INDEX IF EXISTS idx_products_name_gin;
DROP INDEX IF EXISTS idx_products_description_gin;
DROP INDEX IF EXISTS idx_product_prices_product_id;
DROP INDEX IF EXISTS idx_product_prices_store_id;
DROP INDEX IF EXISTS idx_product_prices_price;
DROP INDEX IF EXISTS idx_product_prices_last_checked;
DROP INDEX IF EXISTS idx_user_favorites_user_id;
DROP INDEX IF EXISTS idx_user_favorites_product_id;
DROP INDEX IF EXISTS idx_user_searches_user_id;
DROP INDEX IF EXISTS idx_user_searches_created_at;
DROP INDEX IF EXISTS idx_user_activities_user_id;
DROP INDEX IF EXISTS idx_user_activities_type;
DROP INDEX IF EXISTS idx_user_activities_created_at;
DROP INDEX IF EXISTS idx_analytics_daily_date;
DROP INDEX IF EXISTS idx_product_analytics_product_date;
DROP INDEX IF EXISTS idx_store_analytics_store_date;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_type;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_rate_limits_identifier;
DROP INDEX IF EXISTS idx_rate_limits_window_start;

-- Drop all tables in reverse order of dependencies
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS store_analytics;
DROP TABLE IF EXISTS product_analytics;
DROP TABLE IF EXISTS analytics_daily;
DROP TABLE IF EXISTS price_alerts;
DROP TABLE IF EXISTS user_activities;
DROP TABLE IF EXISTS user_searches;
DROP TABLE IF EXISTS user_favorites;
DROP TABLE IF EXISTS product_prices;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
