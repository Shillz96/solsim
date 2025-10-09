# Stage 1: Build the application
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Generate Prisma client and build the TypeScript project
RUN npx prisma generate
RUN npm run build

# Stage 2: Create the production image
FROM node:20-slim AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Copy the built application and prisma schema from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./.prisma

# Expose the port the app runs on
EXPOSE 4000

# The command to run the application
CMD ["npm", "run", "start"]
