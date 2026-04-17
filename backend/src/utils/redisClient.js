const Redis = require('ioredis');
const crypto = require('crypto');

// Get a unique identifier for the current database to prevent cache pollution across environments
const getDbIdentifier = () => {
    const mongoUrl = process.env.MONGODB_URL || "mongodb://localhost:27017/NutriConnectDatabase";
    // Create a short 8-char hash of the URL to keep keys clean but unique
    return crypto.createHash('md5').update(mongoUrl).digest('hex').substring(0, 8);
};

const DATABASE_PREFIX = getDbIdentifier();
console.log(`[Redis] Using isolation prefix: ${DATABASE_PREFIX}`);

// Redis configuration — gracefully degrades if Redis is not available
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) {
      console.warn('[Redis] Max retries reached. Running without cache.');
      return null; // Stop retrying
    }
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
};

let redis;
let isRedisConnected = false;

try {
  redis = new Redis(redisConfig);

  redis.on('connect', () => {
    isRedisConnected = true;
    console.log('✅ Redis Connected Successfully!');
  });

  redis.on('error', (err) => {
    isRedisConnected = false;
    console.warn('⚠️ Redis Error:', err.message);
  });

  redis.on('close', () => {
    isRedisConnected = false;
  });

  // Attempt connection (non-blocking)
  redis.connect().catch((err) => {
    console.warn('⚠️ Redis not available, caching disabled:', err.message);
    isRedisConnected = false;
  });
} catch (err) {
  console.warn('⚠️ Redis initialization failed:', err.message);
  isRedisConnected = false;
}

/**
 * Cache wrapper: checks Redis cache first, falls back to DB query.
 * Gracefully degrades if Redis is unavailable.
 *
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in seconds
 * @param {Function} fetchFn - Async function that returns data from DB
 * @returns {Promise<any>} - Cached or freshly fetched data
 */
const cacheOrFetch = async (key, ttl, fetchFn) => {
  // If Redis is not connected, go straight to DB
  if (!isRedisConnected) {
    return await fetchFn();
  }

  try {
    const namespacedKey = `${DATABASE_PREFIX}:${key}`;
    const cached = await redis.get(namespacedKey);
    if (cached) {
      console.log(`[CACHE HIT] ${key}`);
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn(`[CACHE READ ERROR] ${key}:`, err.message);
  }

  // Cache miss — fetch from DB
  console.log(`[CACHE MISS] ${key} — fetching from DB`);
  const startTime = Date.now();
  const data = await fetchFn();
  const fetchDuration = Date.now() - startTime;
  console.log(`[DB FETCH] ${key} took ${fetchDuration}ms`);

  // Store in cache (non-blocking, don't await)
  try {
    const namespacedKey = `${DATABASE_PREFIX}:${key}`;
    await redis.setex(namespacedKey, ttl, JSON.stringify(data));
    console.log(`[CACHE SET] ${key} (TTL: ${ttl}s)`);
  } catch (err) {
    console.warn(`[CACHE WRITE ERROR] ${key}:`, err.message);
  }

  return data;
};

/**
 * Invalidate cache by exact key or pattern.
 *
 * @param {string} pattern - Cache key or glob pattern (e.g., 'blogs:*')
 */
const invalidateCache = async (pattern) => {
  if (!isRedisConnected) return;

  try {
    if (pattern.includes('*')) {
      const namespacedPattern = `${DATABASE_PREFIX}:${pattern}`;
      const keys = await redis.keys(namespacedPattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`[CACHE INVALIDATED] ${keys.length} keys matching: ${pattern}`);
      }
    } else {
      const namespacedKey = `${DATABASE_PREFIX}:${pattern}`;
      await redis.del(namespacedKey);
      console.log(`[CACHE INVALIDATED] Key: ${pattern}`);
    }
  } catch (err) {
    console.warn(`[CACHE INVALIDATE ERROR] ${pattern}:`, err.message);
  }
};

/**
 * Check if Redis is currently connected
 * @returns {boolean}
 */
const isConnected = () => isRedisConnected;

module.exports = { redis, cacheOrFetch, invalidateCache, isConnected };
