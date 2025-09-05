# Use Node.js 18 Alpine for smaller image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --omit=dev --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 8080

# Start command
CMD ["sh", "-c", "echo '=== DATABASE_URL CHECK ===' && echo 'DATABASE_URL='$DATABASE_URL && echo '=== END CHECK ===' && npx prisma migrate reset --force && npm run db:deploy && npm start"]
