# ==========================================
# STAGE 1: Frontend Build Stage
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies required for Vite build)
RUN npm ci || npm install

COPY . ./

# Build production bundle (produces static files in /app/dist)
RUN npm run build

# ==========================================
# STAGE 2: Ultra-Lightweight Nginx Web Server (~25MB)
# ==========================================
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built production assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy optimized nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
