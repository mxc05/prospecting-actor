# Use official Apify Node.js + Playwright image
FROM apify/actor-node-playwright-chrome:20

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and build
COPY . ./
RUN npm run build

# Run the actor
CMD ["npm", "start"]
