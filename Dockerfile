# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S freedom -u 1001

# Copy application code
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p data logs uploads && \
    chown -R freedom:nodejs /app

# Switch to non-root user
USER freedom

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node health-check.js || exit 1

# Start the application
CMD ["npm", "start"]
