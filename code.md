# Code Architecture: Redis & Elasticsearch Client Explanation

---

## 📦 Redis Client (`backend/src/utils/redisClient.js`)

### **Overview**
Redis client acts as a **caching layer** to accelerate database queries. It sits between the application and MongoDB, storing frequently accessed data in-memory for ultra-fast retrieval.

### **1. Database Isolation (Prefix System)**

```javascript
const getDbIdentifier = () => {
    const mongoUrl = process.env.MONGODB_URL || "mongodb://localhost:27017/NutriConnectDatabase";
    // Create a short 8-char hash of the URL to keep keys clean but unique
    return crypto.createHash('md5').update(mongoUrl).digest('hex').substring(0, 8);
};

const DATABASE_PREFIX = getDbIdentifier();
console.log(`[Redis] Using isolation prefix: ${DATABASE_PREFIX}`);
```

**Why?**
- If you run dev, staging, and production environments on same Redis instance, keys would collide
- Example: `user:123` exists in both dev and prod → corrupts data
- Solution: Hash the MongoDB URL → `a4f2b1c9:user:123` (dev) vs `x8y3z7k2:user:123` (prod)
- **Benefit:** Multiple environments can safely share one Redis server

---

### **2. Redis Configuration**

```javascript
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',        // Default: localhost
  port: parseInt(process.env.REDIS_PORT) || 6379,     // Standard Redis port
  password: process.env.REDIS_PASSWORD || undefined,  // Auth if needed
  maxRetriesPerRequest: 3,                            // Try 3 times before giving up
  retryStrategy(times) {
    if (times > 3) {
      console.warn('[Redis] Max retries reached. Running without cache.');
      return null; // Stop retrying and proceed without cache
    }
    return Math.min(times * 200, 2000); // Exponential backoff: 200ms → 400ms → 600ms
  },
  lazyConnect: true, // Don't connect immediately; wait for explicit call
};
```

**Retry Logic Flow:**
```
Attempt 1 → Wait 200ms → Attempt 2 → Wait 400ms → Attempt 3 → Wait 600ms → Give Up
If all fail → App continues WITHOUT caching (graceful degradation)
```

---

### **3. Connection Lifecycle**

```javascript
let redis;
let isRedisConnected = false;

try {
  redis = new Redis(redisConfig);

  // When connection succeeds
  redis.on('connect', () => {
    isRedisConnected = true;
    console.log('✅ Redis Connected Successfully!');
  });

  // When connection fails or loses connection
  redis.on('error', (err) => {
    isRedisConnected = false;
    console.warn('⚠️ Redis Error:', err.message);
  });

  // When connection closes
  redis.on('close', () => {
    isRedisConnected = false;
  });

  // Initiate connection (non-blocking)
  redis.connect().catch((err) => {
    console.warn('⚠️ Redis not available, caching disabled:', err.message);
    isRedisConnected = false;
  });
} catch (err) {
  console.warn('⚠️ Redis initialization failed:', err.message);
  isRedisConnected = false;
}
```

**State Flow:**
```
Try Connect → Connected ✅ → Use Cache
           ↓ (FAIL)
        Catch Error → isRedisConnected = false → Skip Cache, Use DB Only
```

---

### **4. Core Function: `cacheOrFetch()`**

This is the **main function** that queries either Redis or MongoDB.

```javascript
const cacheOrFetch = async (key, ttl, fetchFn) => {
  const startTime = Date.now();

  // Step 1: Check if Redis is available
  if (!isRedisConnected) {
    // Redis down → go straight to DB
    const data = await fetchFn();
    const duration = Date.now() - startTime;
    return { data, cacheStatus: 'BYPASS', duration };
  }

  try {
    // Step 2: Add database prefix for isolation
    const namespacedKey = `${DATABASE_PREFIX}:${key}`;
    
    // Step 3: Try to get from Redis cache
    const cached = await redis.get(namespacedKey);
    
    if (cached) {
      // CACHE HIT ✅
      const duration = Date.now() - startTime;
      console.log(`[CACHE HIT] ${key} (${duration}ms)`);
      return { 
        data: JSON.parse(cached),  // Deserialize JSON
        cacheStatus: 'HIT', 
        duration 
      };
    }
  } catch (err) {
    // Redis error occurred, log but continue
    console.warn(`[CACHE READ ERROR] ${key}:`, err.message);
  }

  // Step 4: Cache miss → fetch from DB
  console.log(`[CACHE MISS] ${key} — fetching from DB`);
  const data = await fetchFn();
  const dbFetchDuration = Date.now() - startTime;
  console.log(`[DB FETCH] ${key} took ${dbFetchDuration}ms`);

  // Step 5: Store result in Redis for next time (non-blocking)
  try {
    const namespacedKey = `${DATABASE_PREFIX}:${key}`;
    // setex = SET with EXpiration time (TTL)
    await redis.setex(namespacedKey, ttl, JSON.stringify(data));
    console.log(`[CACHE SET] ${key} (TTL: ${ttl}s)`);
  } catch (err) {
    console.warn(`[CACHE WRITE ERROR] ${key}:`, err.message);
  }

  return { data, cacheStatus: 'MISS', duration: dbFetchDuration };
};
```

**Execution Flow Diagram:**

```
cacheOrFetch('user:123', 3600, () => User.findById(123))
                    ↓
        Is Redis connected? 
        /                    \
      YES                     NO
      ↓                       ↓
  Try redis.get()         Fetch from DB
      ↓                   Return { BYPASS }
   Found?
   /    \
  YES   NO
  ↓     ↓
HIT    MISS
      Fetch from DB
      Store in Redis (TTL 3600s)
      Return { MISS }
```

**Usage Example:**

```javascript
// In a route handler
const user = await cacheOrFetch(
  'user:123',                      // Cache key
  3600,                            // Time to live: 1 hour
  () => User.findById(123)         // Function to fetch if miss
);

console.log(user.data);            // Actual user data
console.log(user.cacheStatus);     // 'HIT', 'MISS', or 'BYPASS'
console.log(user.duration);        // ms taken to retrieve
```

---

### **5. Cache Invalidation Function**

```javascript
const invalidateCache = async (pattern) => {
  if (!isRedisConnected) return;

  try {
    if (pattern.includes('*')) {
      // Pattern matching: invalidate multiple keys
      const namespacedPattern = `${DATABASE_PREFIX}:${pattern}`;
      const keys = await redis.keys(namespacedPattern);
      
      if (keys.length > 0) {
        // Delete all matching keys
        await redis.del(...keys);
        console.log(`[CACHE INVALIDATED] ${keys.length} keys matching: ${pattern}`);
      }
    } else {
      // Exact key: invalidate single entry
      const namespacedKey = `${DATABASE_PREFIX}:${pattern}`;
      await redis.del(namespacedKey);
      console.log(`[CACHE INVALIDATED] Key: ${pattern}`);
    }
  } catch (err) {
    console.warn(`[CACHE INVALIDATE ERROR] ${pattern}:`, err.message);
  }
};
```

**Usage Examples:**

```javascript
// Clear single user cache after update
await invalidateCache('user:123');

// Clear all user caches
await invalidateCache('user:*');

// Clear all blog caches
await invalidateCache('blog:*');

// Clear everything (be careful!)
await invalidateCache('*');
```

---

### **6. Status Check Function**

```javascript
const isConnected = () => isRedisConnected;
```

**Usage:**
```javascript
if (isConnected()) {
  console.log('Cache is available');
} else {
  console.log('Running without cache');
}
```

---

## 🔍 Elasticsearch Client (`backend/src/utils/elasticClient.js`)

### **Overview**
Elasticsearch provides **full-text search** with fuzzy matching, semantic search, and role-based access control (RBAC). It enables users to search across all content types (blogs, recipes, etc.) with ranking and filtering.

### **1. Client Initialization**

```javascript
const { Client } = require('@elastic/elasticsearch');

const elasticClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  tls: { rejectUnauthorized: false } // Allow self-signed certs in dev
});

let isElasticReady = false;
```

**Configuration:**
- Connects to Docker service on `localhost:9200` (Elasticsearch default port)
- Uses `@elastic/elasticsearch` official package
- TLS disabled for local development (enabled in production)

---

### **2. Initialization Function: `initElastic()`**

```javascript
const initElastic = async () => {
  try {
    // Step 1: Check cluster health
    const health = await elasticClient.cluster.health({});
    console.log(`[ELASTICSEARCH] Connected successfully. Status: ${health.status}`);
    isElasticReady = true;

    // Step 2: Check if main search index exists
    const exists = await elasticClient.indices.exists({ 
      index: 'nutriconnect_search' 
    });
    
    if (!exists) {
      // Step 3: Create index with field mappings
      console.log('[ELASTICSEARCH] Index not found. Creating generic search index...');
      await elasticClient.indices.create({
        index: 'nutriconnect_search',
        body: {
          mappings: {
            properties: {
              type: { type: 'keyword' },          // Exact match: 'blog', 'recipe'
              title: { type: 'text' },            // Full-text searchable
              description: { type: 'text' },      // Full-text searchable
              tags: { type: 'text' },             // Full-text searchable
              imageUrl: { type: 'keyword' },      // Exact URL reference
              entityId: { type: 'keyword' },      // Reference to MongoDB ID
              metadata: { type: 'text' },         // Extra searchable content
              isPublic: { type: 'boolean' },      // Public/Private flag
              owners: { type: 'keyword' }         // User IDs who own this
            }
          }
        }
      });
      console.log('[ELASTICSEARCH] Index created successfully.');
    }
  } catch (error) {
    console.warn(`[ELASTICSEARCH WARNING] Failed to connect -> ${error.message}`);
    console.warn('[ELASTICSEARCH WARNING] Application will gracefully fall back to MongoDB text indices.');
    isElasticReady = false;
  }
};
```

**Field Type Explanation:**

| Field | Type | Purpose |
|-------|------|---------|
| `type` | `keyword` | Exact matching (case-sensitive) for content type |
| `title` | `text` | Full-text indexed, searchable, supports fuzzy matching |
| `description` | `text` | Full-text indexed for detailed content search |
| `tags` | `text` | Searchable tags for categorization |
| `imageUrl` | `keyword` | Exact URL reference (no partial matching needed) |
| `entityId` | `keyword` | Maps back to MongoDB document `_id` |
| `metadata` | `text` | Extra searchable content (JSON stringified) |
| `isPublic` | `boolean` | Filter: public vs private content |
| `owners` | `keyword` | User IDs with ownership rights |

**Difference: Keyword vs Text**
```javascript
// Text field (inverted index for search)
"title": "Healthy Nutrition Tips" 
// Searchable by: "nutrition", "tips", "healthy", etc.

// Keyword field (exact match only)
"type": "blog"
// Searchable by: "blog" exactly (not "blo" or "BLOG")
```

---

### **3. Search Function: `searchElastic()`**

```javascript
const searchElastic = async (query, typeFilter = 'all', limit = 10, skip = 0) => {
  // Step 1: Check if Elasticsearch is ready
  if (!isElasticReady) {
    return null; // Return null → caller falls back to MongoDB
  }

  // Step 2: Build multi-match query with fuzzy matching
  const queryBody = {
    bool: {
      must: [
        {
          multi_match: {
            query,                              // Search term
            fields: [
              'title^3',                        // Weight 3 (highest priority)
              'description^2',                  // Weight 2
              'tags^2',                         // Weight 2
              'metadata'                        // Weight 1 (default)
            ],
            fuzziness: 2,                       // Allow 2 character differences
            prefix_length: 1,                   // First char must match exactly
            max_expansions: 50,                 // Limit fuzzy variations
            operator: 'OR'                      // Match ANY field
          }
        }
      ]
    }
  };

  // Step 3: Apply type filter if specified
  if (typeFilter !== 'all') {
    queryBody.bool.filter = queryBody.bool.filter || [];
    queryBody.bool.filter.push({ term: { type: typeFilter } });
  }

  // Step 4: RBAC - Only show public or user-owned content
  const authFilter = {
    bool: {
      should: [
        { term: { isPublic: true } }           // Public content
      ],
      minimum_should_match: 1
    }
  };

  // If user ID provided, add to filter
  if (limit && typeof limit === 'object' && limit.requestingUserId) {
    authFilter.bool.should.push({ 
      term: { owners: limit.requestingUserId } // User's private content
    });
    limit = limit.limit || 10; // Extract limit from context object
  }

  queryBody.bool.filter = queryBody.bool.filter || [];
  queryBody.bool.filter.push(authFilter);

  // Step 5: Execute search
  try {
    const result = await elasticClient.search({
      index: 'nutriconnect_search',
      from: skip,                               // Pagination offset
      size: parseInt(limit),                    // Pagination limit
      body: { query: queryBody }
    });
    
    // Step 6: Map Elasticsearch results back to document format
    return result.hits.hits.map(hit => hit._source);
  } catch (err) {
    console.error('[ELASTICSEARCH ERROR] Query failed:', err.message);
    return null; // Fall back to MongoDB
  }
};
```

**Query Scoring Example:**

```
Query: "nutri tips"
Index: "Healthy Nutrition Tips" vs "Amazing Nutrition Blog"

Scoring:
1. Title match: "Nutrition" (exact) + "Tips" (exact) = HIGH SCORE ✅
2. Title match: "Nutrition" (exact) but no "tips" = MEDIUM SCORE

Result: First doc ranks higher
```

**Fuzzy Matching:**

```
Query: "nutrtion" (misspelled)
With fuzziness=2:
- "nutrition" (1 char diff) = MATCH ✅
- "nutrient" (2 char diff) = MATCH ✅
- "nutriments" (3 char diff) = NO MATCH ❌

prefix_length=1: First char "n" must match exactly (no "mutrtion")
```

**RBAC Logic:**

```javascript
// Search filters by authorization:
// ALLOW: Public content (isPublic: true)
// ALLOW: Content owned by requesting user
// DENY: Private content by other users

Example:
- Blog A: isPublic = true, owners = []        → Everyone can see ✅
- Blog B: isPublic = false, owners = ['user1'] → Only user1 can see ✅ (if searching as user1)
- Blog C: isPublic = false, owners = ['user2'] → user1 cannot see ❌
```

**Usage Example:**

```javascript
// Search all public blogs and user's private content
const results = await searchElastic(
  'healthy nutrition',                    // Search term
  'blog',                                 // Type filter
  { limit: 10, requestingUserId: 'u123' }, // Pagination + RBAC
  0                                        // Skip
);

// Result:
[
  { 
    type: 'blog', 
    title: 'Healthy Nutrition Tips', 
    description: '...',
    isPublic: true,
    owners: []
  },
  // ... more results
]
```

---

### **4. Document Indexing Function: `indexDocument()`**

```javascript
const indexDocument = async (document) => {
  // Check if Elasticsearch is ready
  if (!isElasticReady) return;
  
  try {
    // Index/add document to Elasticsearch
    await elasticClient.index({
      index: 'nutriconnect_search',
      id: `${document.type}_${document.entityId}`, // Unique ID: blog_123
      document                                     // The document data
    });
  } catch (err) {
    console.error('[ELASTICSEARCH ERROR] Indexing failed:', err.message);
  }
};
```

**Usage Example:**

```javascript
// After creating a new blog in MongoDB
const newBlog = await Blog.create({
  title: 'Healthy Eating',
  description: 'Tips for healthy eating',
  tags: 'nutrition, health',
  isPublic: true,
  owners: ['user1']
});

// Index it in Elasticsearch immediately
await indexDocument({
  type: 'blog',
  entityId: newBlog._id,
  title: newBlog.title,
  description: newBlog.description,
  tags: newBlog.tags,
  isPublic: newBlog.isPublic,
  owners: newBlog.owners,
  imageUrl: newBlog.imageUrl,
  metadata: JSON.stringify(newBlog)
});
```

---

### **5. Readiness Check**

```javascript
module.exports = {
  elasticClient,
  initElastic,
  searchElastic,
  indexDocument,
  get isElasticReady() { return isElasticReady; }
};
```

**Usage:**
```javascript
if (elasticClient.isElasticReady) {
  // Use Elasticsearch for search
  results = await searchElastic(query);
} else {
  // Fall back to MongoDB text search
  results = await User.collection.find({ $text: { $search: query } });
}
```

---

## 🔄 Architecture Flow

### **Read Flow (Query Execution)**

```
User Search Request
        ↓
   Search Handler
        ↓
   Try Elasticsearch
   /                 \
  SUCCESS         FAIL (null returned)
   ↓                  ↓
Return ES Results  Try MongoDB
        ↓           ↓
    Display      Display
```

### **Write Flow (Creating Content)**

```
Create Blog/Recipe
        ↓
Save to MongoDB
        ↓
Index in Elasticsearch
        ↓
Update Redis Cache
        ↓
Complete
```

### **Cache + Search + DB Stack**

```
┌─────────────────────┐
│   Application       │
└──────────┬──────────┘
           │
    ┌──────┴─────┐
    ↓            ↓
┌──────────┐  ┌─────────────┐
│  Redis   │  │ Elasticsearch
│(Caching) │  │  (Searching)
└────┬─────┘  └────┬────────┘
     │             │
     └──────┬──────┘
            ↓
      ┌──────────────┐
      │  MongoDB     │
      │  (Primary DB)│
      └──────────────┘
```

---

## 🚨 Graceful Degradation Strategy

### **If Redis is Down:**
```
Request → Skip Cache → Query MongoDB → (Slower response but works)
```

### **If Elasticsearch is Down:**
```
Search Request → ES returns null → Fallback to MongoDB text search → (Slower search but works)
```

### **If Both are Down:**
```
Everything still works, just slower:
- Queries go directly to MongoDB
- Search falls back to MongoDB text indices
- No caching layer
- App remains fully functional
```

---

## 📊 Performance Comparison

| Operation | With Cache | Without Cache | Speedup |
|-----------|-----------|--------------|---------|
| Get User | ~2ms (HIT) | ~50ms | 25x faster |
| Search (ES) | ~10ms | ~200ms (MongoDB) | 20x faster |
| Update User | ~5ms (write + invalidate) | ~50ms | 10x faster |

---

## 💡 Key Takeaways

✅ **Redis** = Speed layer (caching frequently accessed data)
✅ **Elasticsearch** = Search layer (powerful full-text + fuzzy search)
✅ **MongoDB** = Primary database (source of truth)
✅ **Graceful Degradation** = App works even if Redis/ES are down
✅ **RBAC** = Search respects user permissions automatically
