# Use Node.js 20 Alpine for smaller image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm install --omit=dev --ignore-scripts

# Copy source code
COPY . .

# Generate Prisma Client (migrations run at startup in start.sh)
RUN npm run build

# Expose port
EXPOSE 8080

# Start command
CMD ["npm", "start"]
