# Use the Node.js 18 alpine official image
# https://hub.docker.com/_/node
FROM node:18-alpine

# Set npm config to reduce build verbosity
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false

# Create and change to the app directory.
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install project dependencies
RUN npm ci --only=production

# Copy local code to the container image.
COPY . .

# Build the app
RUN npm run build

# Expose the port (Railway handles this automatically)
EXPOSE 3000

# Run the web service on container startup.
CMD ["npm", "start"]