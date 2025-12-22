# Multi-stage build for optimized production image
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Build the backend utilities
RUN npm run build:backend

# Production stage
FROM node:22-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/dist-backend ./dist-backend
COPY --from=builder /app/server.js ./server.js

# Ensure server-utils (runtime adapters/helpers) are included in the production image
COPY --from=builder /app/server-utils ./server-utils

# Copy configuration files if they exist
COPY --from=builder /app/src/config ./src/config

# Create models directory
RUN mkdir -p models

# Expose port 3001
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
