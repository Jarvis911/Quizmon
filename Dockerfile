# Use an official node.js runtime as a parent image
FROM node:24-alpine

WORKDIR /app

# Copy package files to container
COPY package*.json .

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Compile TypeScript to JavaScript
RUN npm run build

# Expose
EXPOSE 3000

# Command: sync schema then start the server
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]