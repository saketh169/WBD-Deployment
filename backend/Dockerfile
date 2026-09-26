# ==========================================
# STAGE 1: Dependency Builder (Cached)
# ==========================================
FROM node:22-alpine AS dependencies

WORKDIR /app

# Install native build tools for compiling any C++ add-ons if needed
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./

# Install production dependencies only and purge npm cache immediately
RUN npm ci --omit=dev || npm install --omit=dev && npm cache clean --force

# ==========================================
# STAGE 2: Ultra-Lightweight Production Runtime
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy production node_modules from builder stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/

# Create non-root runtime context
USER node

EXPOSE 5000

CMD ["node", "src/server.js"]
