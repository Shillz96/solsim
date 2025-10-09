# Use Node.js 20 slim image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install dependencies first (for better Docker layer caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --verbose

# Copy application code
COPY . .

# Generate Prisma client and build TypeScript
RUN npx prisma generate
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm ci --omit=dev --verbose && npm cache clean --force

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "run", "start"]
