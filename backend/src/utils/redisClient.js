let Redis = null;
try {
  Redis = require('ioredis');
} catch (e) {
  // ioredis is optional, will fallback to in-memory store
}
const crypto = require('crypto');

// Unique identifier for current database to prevent cache pollution across environments
const getDbIdentifier = () => {
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/NutriConnectDatabase';
  return crypto.createHash('md5').update(mongoUrl).digest('hex').substring(0, 8);
};

const DATABASE_PREFIX = getDbIdentifier();
const CACHE_NAMESPACE = DATABASE_PREFIX;

// Upstash Redis connection setup with TLS support and fallback
const redisUrl = process.env.REDIS_URL;

const redisOptions = {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  keepAlive: 10000,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
};

let redis = null;
let isRedisConnected = false;

try {
  if (Redis && redisUrl) {
    redis = new Redis(redisUrl, redisOptions);

    redis.on('connect', () => {
      isRedisConnected = true;
      console.log('✅ Upstash Redis Connected Successfully!');
    });

    redis.on('error', (err) => {
      isRedisConnected = false;
      console.warn(`[Upstash Redis] Connection issue: ${err.message}`);
    });

    redis.on('close', () => {
      isRedisConnected = false;
    });

    // Attempt non-blocking connection
    redis.connect().catch((err) => {
      console.warn(`⚠️ [Upstash Redis] Could not connect (${err.message}). Using in-memory fallback.`);
      isRedisConnected = false;
    });
  } else {
    console.log('[Redis] Running with in-memory fallback (REDIS_URL not configured).');
  }
} catch (err) {
  console.warn(`⚠️ [Upstash Redis] Init failed (${err.message}). Using in-memory fallback.`);
  isRedisConnected = false;
}

// ─────────────────────────────────────────────────────────────
// 1. IN-MEMORY FALLBACK STORES (For resilience when Redis is down)
// ─────────────────────────────────────────────────────────────
const inMemoryLocks = new Map(); // key -> { holder, expiresAt, timeoutId }
const inMemoryOTPs = new Map();  // email -> { otp, timestamp, attempts, lockedUntil }

// ─────────────────────────────────────────────────────────────
// 2. DISTRIBUTED LOCKING (10-Minute Hold & Concurrency Control)
// ─────────────────────────────────────────────────────────────

/**
 * Acquire a distributed lock with automatic expiration
 * @param {string} lockKey - Unique slot key (e.g. lock:booking:dietitianId:date:time)
 * @param {string} holderId - User ID requesting the hold
 * @param {number} ttlSeconds - Hold duration in seconds (default: 600s = 10 min)
 * @returns {Promise<boolean>} - True if acquired, False if held by someone else
 */
const acquireLock = async (lockKey, holderId, ttlSeconds = 600) => {
  const namespacedKey = `${CACHE_NAMESPACE}:${lockKey}`;

  if (isRedisConnected) {
    try {
      const acquired = await redis.set(namespacedKey, holderId.toString(), 'EX', ttlSeconds, 'NX');
      return acquired === 'OK' || acquired === true;
    } catch (err) {
      console.warn(`[Redis Lock] Acquire error: ${err.message}. Falling back to memory.`);
    }
  }

  // In-memory fallback
  const existing = inMemoryLocks.get(lockKey);
  const now = Date.now();
  if (existing) {
    if (existing.expiresAt > now) {
      return false; // Still locked by someone
    }
    if (existing.timeoutId) clearTimeout(existing.timeoutId);
    inMemoryLocks.delete(lockKey);
  }

  const timeoutId = setTimeout(() => {
    inMemoryLocks.delete(lockKey);
  }, ttlSeconds * 1000);

  inMemoryLocks.set(lockKey, {
    holder: holderId.toString(),
    expiresAt: now + ttlSeconds * 1000,
    timeoutId
  });

  return true;
};

/**
 * Get the current holder of a lock
 * @param {string} lockKey
 * @returns {Promise<string|null>}
 */
const getLockHolder = async (lockKey) => {
  const namespacedKey = `${CACHE_NAMESPACE}:${lockKey}`;

  if (isRedisConnected) {
    try {
      return await redis.get(namespacedKey);
    } catch (err) {
      console.warn(`[Redis Lock] Get holder error: ${err.message}`);
    }
  }

  const existing = inMemoryLocks.get(lockKey);
  if (!existing) return null;
  if (existing.expiresAt <= Date.now()) {
    if (existing.timeoutId) clearTimeout(existing.timeoutId);
    inMemoryLocks.delete(lockKey);
    return null;
  }
  return existing.holder;
};

/**
 * Release a held lock
 * @param {string} lockKey
 * @param {string} [holderId] - Optional holder verification
 * @returns {Promise<boolean>}
 */
const releaseLock = async (lockKey, holderId) => {
  const namespacedKey = `${CACHE_NAMESPACE}:${lockKey}`;

  if (isRedisConnected) {
    try {
      if (holderId) {
        // Only release if holder matches
        const current = await redis.get(namespacedKey);
        if (current === holderId.toString()) {
          await redis.del(namespacedKey);
          return true;
        }
        return false;
      }
      await redis.del(namespacedKey);
      return true;
    } catch (err) {
      console.warn(`[Redis Lock] Release error: ${err.message}`);
    }
  }

  const existing = inMemoryLocks.get(lockKey);
  if (existing) {
    if (!holderId || existing.holder === holderId.toString()) {
      if (existing.timeoutId) clearTimeout(existing.timeoutId);
      inMemoryLocks.delete(lockKey);
      return true;
    }
    return false;
  }
  return true;
};

/**
 * Get matching lock keys by pattern (e.g. lock:booking:dietitianId:date:*)
 * @param {string} pattern
 * @returns {Promise<string[]>}
 */
const getMatchingLocks = async (pattern) => {
  const result = new Set();
  const namespacedPattern = `${CACHE_NAMESPACE}:${pattern}`;

  if (isRedisConnected) {
    try {
      const keys = await redis.keys(namespacedPattern);
      const prefixLength = `${CACHE_NAMESPACE}:`.length;
      keys.forEach((k) => result.add(k.substring(prefixLength)));
    } catch (err) {
      console.warn(`[Redis Lock] Matching locks error: ${err.message}`);
    }
  }

  // Match in-memory
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  const now = Date.now();
  for (const [key, val] of inMemoryLocks.entries()) {
    if (regex.test(key)) {
      if (val.expiresAt > now) {
        result.add(key);
      } else {
        if (val.timeoutId) clearTimeout(val.timeoutId);
        inMemoryLocks.delete(key);
      }
    }
  }

  return Array.from(result);
};

// ─────────────────────────────────────────────────────────────
// 3. CACHING HELPERS (Schedules, Meal Plans, Dashboard)
// ─────────────────────────────────────────────────────────────

/**
 * Transparent cache: checks Redis first; on miss, runs fetchFn and caches result.
 * @param {string} key - Cache key
 * @param {number} ttlSeconds - Time-to-live in seconds
 * @param {Function} fetchFn - DB query function
 * @returns {Promise<Object>} - { data, cacheStatus: 'HIT'|'MISS'|'BYPASS', duration }
 */
const cacheOrFetch = async (key, ttlSeconds, fetchFn) => {
  const startTime = Date.now();

  if (!isRedisConnected) {
    const data = await fetchFn();
    return { data, cacheStatus: 'BYPASS', duration: Date.now() - startTime };
  }

  const namespacedKey = `${CACHE_NAMESPACE}:${key}`;

  try {
    const cached = await redis.get(namespacedKey);
    if (cached) {
      const duration = Date.now() - startTime;
      return { data: JSON.parse(cached), cacheStatus: 'HIT', duration };
    }
  } catch (err) {
    console.warn(`[Redis Cache] Read error on ${key}: ${err.message}`);
  }

  // Cache miss: execute DB fetch
  const data = await fetchFn();
  const dbDuration = Date.now() - startTime;

  // Asynchronously store in Redis
  try {
    await redis.setex(namespacedKey, ttlSeconds, JSON.stringify(data));
  } catch (err) {
    console.warn(`[Redis Cache] Write error on ${key}: ${err.message}`);
  }

  return { data, cacheStatus: 'MISS', duration: dbDuration };
};

/**
 * Invalidate cache by key or wildcard pattern
 * @param {string} pattern - Key or pattern (e.g. 'bookings:user:*', 'mealplans:*')
 */
const invalidateCache = async (pattern) => {
  if (!isRedisConnected) return;

  try {
    if (pattern.includes('*')) {
      const namespacedPattern = `${CACHE_NAMESPACE}:${pattern}`;
      const keys = await redis.keys(namespacedPattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      const namespacedKey = `${CACHE_NAMESPACE}:${pattern}`;
      await redis.del(namespacedKey);
    }
  } catch (err) {
    console.warn(`[Redis Invalidate] Error invalidating ${pattern}: ${err.message}`);
  }
};

// ─────────────────────────────────────────────────────────────
// 4. SELF-CLEANING OTP STORAGE (Redis TTL Auto-Expiry)
// ─────────────────────────────────────────────────────────────

/**
 * Store an OTP with auto-expiry
 * @param {string} email
 * @param {Object} otpData - { otp, timestamp, attempts, lockedUntil }
 * @param {number} ttlSeconds - Default 600s (10 minutes)
 */
const setStoredOTP = async (email, otpData, ttlSeconds = 600) => {
  const key = `${CACHE_NAMESPACE}:otp:${email.toLowerCase().trim()}`;

  if (isRedisConnected) {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(otpData));
      return;
    } catch (err) {
      console.warn(`[Redis OTP] Store error: ${err.message}. Using memory.`);
    }
  }

  inMemoryOTPs.set(email.toLowerCase().trim(), otpData);
};

/**
 * Retrieve stored OTP
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
const getStoredOTPData = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();
  const key = `${CACHE_NAMESPACE}:otp:${normalizedEmail}`;

  if (isRedisConnected) {
    try {
      const raw = await redis.get(key);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn(`[Redis OTP] Get error: ${err.message}. Checking memory.`);
    }
  }

  const data = inMemoryOTPs.get(normalizedEmail);
  if (!data) return null;
  if (Date.now() - data.timestamp > 10 * 60 * 1000) {
    inMemoryOTPs.delete(normalizedEmail);
    return null;
  }
  return data;
};

/**
 * Remove stored OTP
 * @param {string} email
 */
const removeStoredOTP = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();
  const key = `${CACHE_NAMESPACE}:otp:${normalizedEmail}`;

  if (isRedisConnected) {
    try {
      await redis.del(key);
    } catch (err) {
      console.warn(`[Redis OTP] Remove error: ${err.message}`);
    }
  }

  inMemoryOTPs.delete(normalizedEmail);
};

// ─────────────────────────────────────────────────────────────
// 5. CAPPED FAST ACTIVITY LISTS (Audit Feed)
// ─────────────────────────────────────────────────────────────

/**
 * Push an activity event to a user/dietitian capped feed (keeps latest N items)
 * @param {string} feedId - e.g. 'activity:user:123'
 * @param {Object} event - Activity item
 * @param {number} maxItems - Maximum items to keep (default 20)
 */
const pushActivity = async (feedId, event, maxItems = 20) => {
  if (!isRedisConnected) return;

  const key = `${CACHE_NAMESPACE}:activity:${feedId}`;
  try {
    await redis.lpush(key, JSON.stringify(event));
    await redis.ltrim(key, 0, maxItems - 1);
  } catch (err) {
    console.warn(`[Redis Activity] Push error: ${err.message}`);
  }
};

/**
 * Get recent activity feed items
 * @param {string} feedId
 * @param {number} limit
 * @returns {Promise<Object[]>}
 */
const getRecentActivities = async (feedId, limit = 20) => {
  if (!isRedisConnected) return [];

  const key = `${CACHE_NAMESPACE}:activity:${feedId}`;
  try {
    const rawItems = await redis.lrange(key, 0, limit - 1);
    return rawItems.map((item) => JSON.parse(item));
  } catch (err) {
    console.warn(`[Redis Activity] Get error: ${err.message}`);
    return [];
  }
};

const isConnected = () => isRedisConnected;

module.exports = {
  redis,
  isConnected,
  acquireLock,
  getLockHolder,
  releaseLock,
  getMatchingLocks,
  cacheOrFetch,
  invalidateCache,
  setStoredOTP,
  getStoredOTPData,
  removeStoredOTP,
  pushActivity,
  getRecentActivities,
};
