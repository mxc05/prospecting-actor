# Use official Apify Node.js + Playwright image
FROM apify/actor-node-playwright-chrome:20

# Copy package files
COPY package*.json ./

# Remove OS lockfile mismatch and run clean Linux npm install
RUN rm -f package-lock.json && npm install

# Copy source code and build
COPY . ./
RUN npm run build

# Run the actor
CMD ["npm", "start"]
