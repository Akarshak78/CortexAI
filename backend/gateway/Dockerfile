FROM node:22

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install root dependencies (shared dependencies like ioredis)
RUN npm install

# Copy the entire backend
COPY . .

# Install gateway-specific dependencies
RUN npm install --prefix gateway

WORKDIR /app/gateway

EXPOSE 8000

CMD ["npm", "start"]