FROM node:20-alpine

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app source
COPY . .

# Create a non-root user and switch to it
RUN addgroup -S nodeapp && adduser -S -G nodeapp nodeapp
RUN chown -R nodeapp:nodeapp /usr/src/app
USER nodeapp

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=development
# ENV NODE_ENV=production

# Command to run the application
CMD ["node", "--trace-warnings", "index.js"]