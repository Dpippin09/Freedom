// User Model
const BaseModel = require('./BaseModel');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class UserModel extends BaseModel {
    constructor(databaseManager) {
        super(databaseManager, 'users');
    }

    // Find user by email
    async findByEmail(email) {
        return await this.findOne({ email: email.toLowerCase() });
    }

    // Create user with hashed password
    async createUser(userData) {
        try {
            // Hash password
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

            // Generate verification token
            const verificationToken = crypto.randomBytes(32).toString('hex');

            const user = await this.create({
                email: userData.email.toLowerCase(),
                password_hash: hashedPassword,
                first_name: userData.firstName,
                last_name: userData.lastName,
                verification_token: verificationToken,
                preferences: userData.preferences || {}
            });

            // Remove password hash from returned user
            delete user.password_hash;
            return user;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    // Verify password
    async verifyPassword(email, password) {
        try {
            const user = await this.findByEmail(email);
            if (!user) {
                return null;
            }

            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                return null;
            }

            // Update last login
            await this.updateById(user.id, { last_login: new Date() });

            // Remove password hash from returned user
            delete user.password_hash;
            return user;
        } catch (error) {
            console.error('Error verifying password:', error);
            throw error;
        }
    }

    // Update password
    async updatePassword(userId, newPassword) {
        try {
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            
            return await this.updateById(userId, { 
                password_hash: hashedPassword,
                reset_token: null,
                reset_token_expires: null
            });
        } catch (error) {
            console.error('Error updating password:', error);
            throw error;
        }
    }

    // Generate password reset token
    async generateResetToken(email) {
        try {
            const user = await this.findByEmail(email);
            if (!user) {
                return null;
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            await this.updateById(user.id, {
                reset_token: resetToken,
                reset_token_expires: resetTokenExpires
            });

            return resetToken;
        } catch (error) {
            console.error('Error generating reset token:', error);
            throw error;
        }
    }

    // Verify email
    async verifyEmail(verificationToken) {
        try {
            const user = await this.findOne({ verification_token: verificationToken });
            if (!user) {
                return null;
            }

            return await this.updateById(user.id, {
                email_verified: true,
                verification_token: null
            });
        } catch (error) {
            console.error('Error verifying email:', error);
            throw error;
        }
    }

    // Get user preferences
    async getPreferences(userId) {
        try {
            const user = await this.findById(userId);
            return user ? user.preferences : {};
        } catch (error) {
            console.error('Error getting user preferences:', error);
            throw error;
        }
    }

    // Update user preferences
    async updatePreferences(userId, preferences) {
        try {
            const user = await this.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const updatedPreferences = { ...user.preferences, ...preferences };
            return await this.updateById(userId, { preferences: updatedPreferences });
        } catch (error) {
            console.error('Error updating user preferences:', error);
            throw error;
        }
    }

    // Get user profile (without sensitive data)
    async getProfile(userId) {
        try {
            const user = await this.findById(userId);
            if (!user) {
                return null;
            }

            // Remove sensitive fields
            const { password_hash, verification_token, reset_token, reset_token_expires, ...profile } = user;
            return profile;
        } catch (error) {
            console.error('Error getting user profile:', error);
            throw error;
        }
    }

    // Get user activity stats
    async getActivityStats(userId) {
        try {
            const query = `
                SELECT 
                    (SELECT COUNT(*) FROM user_favorites WHERE user_id = $1) as favorites_count,
                    (SELECT COUNT(*) FROM user_searches WHERE user_id = $1) as searches_count,
                    (SELECT COUNT(*) FROM price_alerts WHERE user_id = $1) as alerts_count,
                    (SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL) as unread_notifications
            `;
            
            const result = await this.db.query(query, [userId]);
            return result.rows[0];
        } catch (error) {
            console.error('Error getting user activity stats:', error);
            throw error;
        }
    }

    // Search users (admin functionality)
    async searchUsers(searchTerm, filters = {}, page = 1, pageSize = 20) {
        try {
            let conditions = {};
            
            // Add status filter
            if (filters.status) {
                conditions.status = filters.status;
            }

            // Add role filter
            if (filters.role) {
                conditions.role = filters.role;
            }

            // If search term provided, use raw query for text search
            if (searchTerm) {
                const searchQuery = `%${searchTerm.toLowerCase()}%`;
                const query = `
                    SELECT * FROM users 
                    WHERE (
                        LOWER(email) LIKE $1 
                        OR LOWER(first_name) LIKE $1 
                        OR LOWER(last_name) LIKE $1
                    )
                    ${Object.keys(conditions).length > 0 ? 
                        'AND ' + Object.keys(conditions).map((key, i) => `${key} = $${i + 2}`).join(' AND ') 
                        : ''
                    }
                    ORDER BY created_at DESC
                    LIMIT $${Object.keys(conditions).length + 2}
                    OFFSET $${Object.keys(conditions).length + 3}
                `;
                
                const params = [searchQuery, ...Object.values(conditions), pageSize, (page - 1) * pageSize];
                const result = await this.db.query(query, params);
                
                // Get total count for pagination
                const countQuery = `
                    SELECT COUNT(*) as count FROM users 
                    WHERE (
                        LOWER(email) LIKE $1 
                        OR LOWER(first_name) LIKE $1 
                        OR LOWER(last_name) LIKE $1
                    )
                    ${Object.keys(conditions).length > 0 ? 
                        'AND ' + Object.keys(conditions).map((key, i) => `${key} = $${i + 2}`).join(' AND ') 
                        : ''
                    }
                `;
                
                const countParams = [searchQuery, ...Object.values(conditions)];
                const countResult = await this.db.query(countQuery, countParams);
                const totalItems = parseInt(countResult.rows[0].count);
                
                // Remove password hashes
                const users = result.rows.map(user => {
                    const { password_hash, ...userWithoutPassword } = user;
                    return userWithoutPassword;
                });
                
                return {
                    items: users,
                    pagination: {
                        currentPage: page,
                        pageSize,
                        totalItems,
                        totalPages: Math.ceil(totalItems / pageSize),
                        hasNextPage: page < Math.ceil(totalItems / pageSize),
                        hasPrevPage: page > 1
                    }
                };
            } else {
                // Use regular pagination without search
                const result = await this.paginate(conditions, page, pageSize, {
                    orderBy: 'created_at',
                    orderDirection: 'DESC'
                });
                
                // Remove password hashes
                result.items = result.items.map(user => {
                    const { password_hash, ...userWithoutPassword } = user;
                    return userWithoutPassword;
                });
                
                return result;
            }
        } catch (error) {
            console.error('Error searching users:', error);
            throw error;
        }
    }

    // Get user analytics
    async getUserAnalytics(dateRange = 30) {
        try {
            const query = `
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as new_users,
                    COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users
                FROM users 
                WHERE created_at >= CURRENT_DATE - INTERVAL '${dateRange} days'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `;
            
            const result = await this.db.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error getting user analytics:', error);
            throw error;
        }
    }
}

module.exports = UserModel;
