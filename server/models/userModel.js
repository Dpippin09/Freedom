const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

class UserModel {
    constructor() {
        this.usersFile = path.join(__dirname, '../data/users.json');
        this.JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production';
        this.initializeUsersFile();
    }

    async initializeUsersFile() {
        try {
            await fs.access(this.usersFile);
        } catch (error) {
            // File doesn't exist, create it
            await fs.writeFile(this.usersFile, JSON.stringify([], null, 2));
        }
    }

    async getAllUsers() {
        try {
            const data = await fs.readFile(this.usersFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading users file:', error);
            return [];
        }
    }

    async saveUsers(users) {
        try {
            await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2));
        } catch (error) {
            console.error('Error saving users file:', error);
            throw error;
        }
    }

    async findUserByEmail(email) {
        const users = await this.getAllUsers();
        return users.find(user => user.email.toLowerCase() === email.toLowerCase());
    }

    async findUserById(id) {
        const users = await this.getAllUsers();
        return users.find(user => user.id === id);
    }

    async createUser(userData) {
        const users = await this.getAllUsers();
        
        // Check if user already exists
        const existingUser = await this.findUserByEmail(userData.email);
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

        // Create new user
        const newUser = {
            id: this.generateUserId(),
            email: userData.email.toLowerCase(),
            firstName: userData.firstName,
            lastName: userData.lastName,
            password: hashedPassword,
            preferences: {
                notifications: true,
                priceAlerts: true,
                currency: 'USD',
                theme: 'light'
            },
            wishlist: [],
            priceAlerts: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true
        };

        users.push(newUser);
        await this.saveUsers(users);

        // Return user without password
        const { password, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    }

    async authenticateUser(email, password) {
        const user = await this.findUserByEmail(email);
        if (!user) {
            throw new Error('Invalid email or password');
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }

        // Update last login
        await this.updateUser(user.id, { lastLogin: new Date().toISOString() });

        // Return user without password
        const { password: userPassword, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async updateUser(userId, updateData) {
        const users = await this.getAllUsers();
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex === -1) {
            throw new Error('User not found');
        }

        // Update user data
        users[userIndex] = {
            ...users[userIndex],
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        await this.saveUsers(users);
        
        // Return updated user without password
        const { password, ...userWithoutPassword } = users[userIndex];
        return userWithoutPassword;
    }

    async deleteUser(userId) {
        const users = await this.getAllUsers();
        const filteredUsers = users.filter(user => user.id !== userId);
        
        if (filteredUsers.length === users.length) {
            throw new Error('User not found');
        }

        await this.saveUsers(filteredUsers);

        // Clean up related data - price alerts will be handled by the PriceAlertModel
        // This is handled in the auth routes when calling deleteUser
        
        return true;
    }

    generateToken(user) {
        const payload = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        };

        return jwt.sign(payload, this.JWT_SECRET, { 
            expiresIn: '7d' // Token expires in 7 days
        });
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, this.JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    generateUserId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    async addToWishlist(userId, productId) {
        const users = await this.getAllUsers();
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex === -1) {
            throw new Error('User not found');
        }

        if (!users[userIndex].wishlist.includes(productId)) {
            users[userIndex].wishlist.push(productId);
            users[userIndex].updatedAt = new Date().toISOString();
            await this.saveUsers(users);
        }

        return users[userIndex].wishlist;
    }

    async removeFromWishlist(userId, productId) {
        const users = await this.getAllUsers();
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex === -1) {
            throw new Error('User not found');
        }

        users[userIndex].wishlist = users[userIndex].wishlist.filter(id => id !== productId);
        users[userIndex].updatedAt = new Date().toISOString();
        await this.saveUsers(users);

        return users[userIndex].wishlist;
    }

    async getUserWishlist(userId) {
        const user = await this.findUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user.wishlist || [];
    }
}

module.exports = UserModel;
