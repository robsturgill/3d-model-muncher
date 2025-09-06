# Use Node.js LTS as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the frontend
RUN npm run build

# Build the backend utilities
RUN npx tsc --outDir dist-backend --module commonjs --target es2019 src/utils/threeMFToJson.ts src/utils/configManager.ts

# Expose port 3000
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
