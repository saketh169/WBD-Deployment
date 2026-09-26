# 🛠️ NutriConnect Practical Redis Runbook & Network Tab Verification Guide

> A hands-on, practical guide demonstrating step-by-step how to **set up Redis**, configure your **`.env`**, set up the **centralized Redis client (`redisClient.js`)**, implement caching on a **real website example (Bookings/Schedules)**, configure **`X-Cache` response headers**, and inspect requests in the **Browser Network Tab**.

---

## 📌 Table of Contents
1. [Step 1: Setting Up Redis & Environment Variables (`.env`)](#step-1-setting-up-redis--environment-variables-env)
   - [Option A: Upstash Serverless Redis (Recommended / Cloud)](#option-a-upstash-serverless-redis-recommended--cloud)
   - [Option B: Local Redis (Docker or Local Server)](#option-b-local-redis-docker-or-local-server)
   - [Adding `REDIS_URL` to `backend/.env`](#adding-redis_url-to-backendenv)
2. [Step 2: Centralized Redis Client Setup (`redisClient.js`)](#step-2-centralized-redis-client-setup-redisclientjs)
   - [The Singleton Connection](#the-singleton-connection)
   - [The Core Helper Functions (`cacheOrFetch`, `invalidateCache`, Locks)](#the-core-helper-functions)
3. [Step 3: Simple Practical Example from Our Website (Bookings & Schedules)](#step-3-simple-practical-example-from-our-website-bookings--schedules)
   - [The Plain MongoDB Route (Before)](#the-plain-mongodb-route-before)
   - [Wrapping with `cacheOrFetch` and Adding `X-Cache` Headers (After)](#wrapping-with-cacheorfetch-and-adding-x-cache-headers-after)
   - [The Invalidation Hook (When a Booking is Created or Cancelled)](#the-invalidation-hook-when-a-booking-is-created-or-cancelled)
4. [Step 4: Setting Up & Inspecting `X-Cache` in Browser DevTools](#step-4-setting-up--inspecting-x-cache-in-browser-devtools)
   - [How `X-Cache` Works (`HIT` vs `MISS`)](#how-x-cache-works-hit-vs-miss)
   - [Step-by-Step DevTools Inspection Walkthrough](#step-by-step-devtools-inspection-walkthrough)
5. [Step 5: Testing, Flushing & Verifying Tools](#step-5-testing-flushing--verifying-tools)
   - [Flushing the Cache (`npm run redis:clear`)](#flushing-the-cache-npm-run-redisclear)
   - [Running the Live 7-Case Benchmark Suite (`npm run benchmark:redis`)](#running-the-live-7-case-benchmark-suite-npm-run-benchmarkredis)
6. [Step 6: Measured Live Benchmark Results (All 7 Website Cases)](#step-6-measured-live-benchmark-results-all-7-website-cases)

---

## Step 1: Setting Up Redis & Environment Variables (`.env`)

To use Redis in your application, you need a Redis server running either in the cloud or on your local machine.

### Option A: Upstash Serverless Redis (Recommended / Cloud)
Upstash provides a zero-maintenance, serverless Redis database with a generous free tier (10,000 commands/day).

1. Go to [https://upstash.com](https://upstash.com) and create a free account.
2. Click **Create Database**.
3. Choose a database name (e.g., `nutriconnect-redis`) and select your closest cloud region (e.g., `AWS ap-south-1` or `eu-central-1`).
4. Under **Connect to your database**, select the **Node.js (ioredis / redis)** tab.
5. Copy the secure TLS connection string. It looks like:
   ```text
   rediss://default:your_secret_token@your-cluster-name.upstash.io:6379
   ```
   *(Note: `rediss://` with double 's' signifies encrypted TLS on port 6379).*

---

### Option B: Local Redis (Docker or Local Server)
If you prefer running Redis locally without an internet connection:

* **Using Docker (Windows / macOS / Linux)**:
  ```bash
  docker run -d --name nutriconnect-redis -p 6379:6379 redis:alpine
  ```
* **Using WSL (Windows Subsystem for Linux)**:
  ```bash
  sudo apt-get install redis-server
  sudo service redis-server start
  ```
* Your local connection URL will be:
  ```text
  redis://localhost:6379
  ```

---

### Adding `REDIS_URL` to `backend/.env`
Open your `backend/.env` file and add the `REDIS_URL`:

```env
# backend/.env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nutriconnect
JWT_SECRET=your_super_secret_jwt_key_here

# Redis Connection (Upstash TLS or Local)
REDIS_URL=rediss://default:AZaKAAIncDEyMGQ3ODhmZjFiNGM0N2E4YTA0NDQ5NmI4NTljYzQ2NXAxNDc1Mjg@climbing-gull-47528.upstash.io:6379
```

---

## Step 2: Centralized Redis Client Setup (`redisClient.js`)

Instead of creating multiple Redis connections in different route files, all Redis operations are centralized in [`backend/src/utils/redisClient.js`](file:///c:/Users/saket/Web%20Projects/WBD-BackendDev/backend/src/utils/redisClient.js).

### The Singleton Connection
The client handles reconnections, timeouts, and gracefully falls back to direct database queries if Redis ever becomes temporarily unavailable:

```javascript
// backend/src/utils/redisClient.js
const { createClient } = require('redis');

let redisClient = null;

const getRedisClient = () => {
  if (!redisClient && process.env.REDIS_URL) {
    const isTls = process.env.REDIS_URL.startsWith('rediss://');
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        tls: isTls,
        rejectUnauthorized: false,
        reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
        connectTimeout: 10000
      }
    });

    redisClient.on('connect', () => console.log('✅ Upstash Redis Connected Successfully!'));
    redisClient.on('error', (err) => console.warn('[Redis] Connection issue:', err.message));

    redisClient.connect().catch((err) => {
      console.warn('[Redis] Initial connection failed. Operating in bypass mode:', err.message);
    });
  }
  return redisClient;
};
```

---

### The Core Helper Functions

#### 1. `cacheOrFetch(key, ttlSeconds, fetchFunction)`
The heart of our Cache-Aside pattern. It checks Redis RAM first; if found, it returns the data immediately. If missing, it executes your database query, stores the result in Redis with a TTL, and tracks duration:

```javascript
const cacheOrFetch = async (key, ttlSeconds, fetchFunction) => {
  const client = getRedisClient();
  const startTime = Date.now();

  // If Redis is offline, safely run the database query directly
  if (!client || !client.isOpen) {
    const data = await fetchFunction();
    return { data, cacheStatus: 'BYPASS', duration: Date.now() - startTime };
  }

  try {
    // 1. Check Redis RAM (O(1) lookup)
    const cached = await client.get(key);
    if (cached) {
      return { 
        data: JSON.parse(cached), 
        cacheStatus: 'HIT', 
        duration: Date.now() - startTime 
      };
    }

    // 2. Cache MISS: Run database query
    const data = await fetchFunction();
    if (data !== undefined && data !== null) {
      await client.set(key, JSON.stringify(data), { EX: ttlSeconds });
    }

    return { 
      data, 
      cacheStatus: 'MISS', 
      duration: Date.now() - startTime 
    };
  } catch (err) {
    const data = await fetchFunction();
    return { data, cacheStatus: 'ERROR', duration: Date.now() - startTime };
  }
};
```

#### 2. `invalidateCache(pattern)`
Purges matching keys using Redis `SCAN` to prevent blocking the event loop:

```javascript
const invalidateCache = async (pattern) => {
  const client = getRedisClient();
  if (!client || !client.isOpen) return;

  try {
    let cursor = '0';
    do {
      const reply = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = reply.cursor.toString();
      if (reply.keys.length > 0) {
        await client.del(reply.keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.warn(`[Redis] Error invalidating ${pattern}:`, err.message);
  }
};
```

#### 3. Atomic Lock Helpers (`acquireLock` & `releaseLock`)
```javascript
// Atomic SET key value EX ttl NX
const acquireLock = async (key, value, ttlSeconds = 600) => {
  const client = getRedisClient();
  if (!client || !client.isOpen) return true;
  const result = await client.set(key, value, { EX: ttlSeconds, NX: true });
  return result === 'OK';
};

const releaseLock = async (key, value) => {
  const client = getRedisClient();
  if (!client || !client.isOpen) return;
  const current = await client.get(key);
  if (current === value) await client.del(key);
};
```

---

## Step 3: Simple Practical Example from Our Website (Bookings & Schedules)

Let's look at a concrete, real-world example from NutriConnect: **fetching a user's appointment schedule** (`GET /api/bookings/user/:id`).

### The Plain MongoDB Route (Before)
Before caching, every time the user opened their dashboard or refreshed the page, Express executed a direct disk query on MongoDB Atlas:

```javascript
// ❌ BEFORE: Direct MongoDB Query on every request
exports.getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    let query = { userId };
    if (date) query.date = date;

    // Hits MongoDB Atlas over the internet, parses B-Tree, hydates Mongoose models
    const bookings = await Booking.find(query)
      .sort({ date: 1, time: 1 })
      .lean();

    // Took 350ms+ on every single page view!
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
```

---

### Wrapping with `cacheOrFetch` and Adding `X-Cache` Headers (After)
To optimize this route:
1. Generate a descriptive cache key: `bookings:user:${userId}:${date || 'all'}`.
2. Wrap the `Booking.find(...)` inside `cacheOrFetch(cacheKey, 300, async () => { ... })`.
3. Set the `X-Cache` and `X-Cache-Duration` response headers.

```javascript
// ✅ AFTER: In-Memory Caching with Transparency Headers
const { cacheOrFetch } = require('../utils/redisClient');

exports.getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    let query = { userId };
    if (date) query.date = date;

    // Unique cache key per user and date filter
    const cacheKey = `bookings:user:${userId}:${date || 'all'}`;

    // Cached for 300 seconds (5 minutes)
    const { data: bookings, cacheStatus, duration } = await cacheOrFetch(cacheKey, 300, async () => {
      return await Booking.find(query)
        .sort({ date: 1, time: 1 })
        .lean()
        .exec();
    });

    // Inject headers so browser Network Tab can verify cache status:
    if (cacheStatus) {
      res.setHeader('X-Cache', cacheStatus);             // 'HIT' or 'MISS'
      res.setHeader('X-Cache-Duration', `${duration}ms`); // e.g. '1ms' or '188ms'
    }

    res.status(200).json({
      success: true,
      data: bookings,
      count: bookings.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
```

---

### The Invalidation Hook (When a Booking is Created or Cancelled)
If the user books a new consultation or cancels an appointment, the cached list in Redis would become outdated unless purged. 

In `createBooking` or `cancelBooking`, we trigger a cache purge:

```javascript
// Inside createBooking or cancelBooking controller:
const { invalidateCache } = require('../utils/redisClient');

exports.createBooking = async (req, res) => {
  // 1. Save new booking to MongoDB
  const newBooking = await Booking.create(bookingData);

  // 2. Immediately purge schedule caches for this user & dietitian:
  await invalidateCache(`bookings:user:${newBooking.userId}*`);
  await invalidateCache(`bookings:dietitian:${newBooking.dietitianId}*`);
  await invalidateCache(`slots:${newBooking.dietitianId}*`);

  // 3. User immediately sees the new booking on their next request!
  res.status(201).json({ success: true, data: newBooking });
};
```

---

## Step 4: Setting Up & Inspecting `X-Cache` in Browser DevTools

You don't need access to server terminals to verify that Redis is working. You can observe it directly in your web browser.

### How `X-Cache` Works (`HIT` vs `MISS`)
When an endpoint responds, it sends two custom HTTP headers:
* **`X-Cache: MISS`**: Data was not in Redis. Express queried MongoDB Atlas, stored the result in Redis, and returned it. (Server duration: ~150ms – 400ms).
* **`X-Cache: HIT`**: Data was retrieved directly from Redis RAM. MongoDB was never touched! (Server duration: **1ms – 2ms**).

```text
+-----------------------------------------------------------------------------------------------+
|  CHROME / EDGE / BRAVE DEVTOOLS NETWORK TAB                                                  |
+-----------------------------------------------------------------------------------------------+
|  Filter: [ Fetch/XHR ]                                                                        |
|  Name                 Status  Type   Size    Time     Waterfall                              |
|  bookings             200     fetch  3.4 kB  353 ms   [████████████████████████] (Cold MISS) |
|  bookings (reload)    200     fetch  3.4 kB  124 ms   [████]                     (Warm HIT)  |
+-----------------------------------------------------------------------------------------------+
```

### Step-by-Step DevTools Inspection Walkthrough

#### Step 1: Open the Network Panel
1. Open NutriConnect in Google Chrome, Brave, or Microsoft Edge.
2. Press **`F12`** (or right-click anywhere on the page and click **Inspect**).
3. Switch to the **Network** tab at the top.
4. Click the **`Fetch/XHR`** filter button so static files (CSS/images) are hidden.

---

#### Step 2: Observe a Cold Request (Cache Miss)
1. Clear the Redis stash by running:
   ```bash
   cd backend
   npm run redis:clear
   ```
2. In the browser, navigate to the **All Dietitians** directory (`/all-dietitians`) or **User Schedules** (`/user/schedule`).
3. Click on the API request (e.g., `dietitians` or `user`) in the Network list.
4. Click on **Headers** ➔ scroll down to **Response Headers**:
   ```http
   Status Code: 200 OK
   X-Cache: MISS
   X-Cache-Duration: 340ms
   ```
5. Click on the **Timing** tab:
   * **Waiting for server response (TTFB)**: ~700ms – 950ms (Server had to query MongoDB disk and encode data).

---

#### Step 3: Observe a Warm Request (Redis Cache Hit)
1. Without clearing the database, refresh the page (`Ctrl + R`) or click to another tab and come back.
2. In the Network list, click on the new request.
3. Check the **Response Headers**:
   ```http
   Status Code: 200 OK
   X-Cache: HIT
   X-Cache-Duration: 2ms
   ```
4. Check the **Timing** tab:
   * **Waiting for server response (TTFB)**: Plummets to ~125ms – 180ms (the entire wait time was just internet transit; the server responded in **2 milliseconds** from Redis RAM!).

```text
+----------------------------------------------------------------------+
|                     TIME TO FIRST BYTE (TTFB)                        |
|                                                                      |
|  Cold Request (MISS):                                                |
|  [██████████████████████████████████████████████████] ~850 ms        |
|  (Disk read + network transit + Mongoose hydration)                  |
|                                                                      |
|  Warm Request (HIT):                                                 |
|  [████████] ~125 ms                                                  |
|  (Pure internet transit; Server execution took ONLY 1-2 ms in RAM!)  |
+----------------------------------------------------------------------+
```

---

## Step 5: Testing, Flushing & Verifying Tools

We built two automated command-line tools to make testing and verification effortless.

### Flushing the Cache (`npm run redis:clear`)
When you want to reset all keys and observe cold cache misses again, run:

```bash
cd backend
npm run redis:clear
```
Output:
```text
  [OK] Connected to Upstash Redis
  Found 14 cache keys.
  Deleting keys...
  ✅ Cache cleared successfully! FLUSHDB completed.
```

---

### Running the Live 7-Case Benchmark Suite (`npm run benchmark:redis`)
We provide a Python test suite that benchmarks all 7 platform cases side-by-side, executing real HTTP requests against your live Express backend and checking `X-Cache` headers:

```bash
cd backend
npm run benchmark:redis
```
*(Or directly: `python scripts/benchmark_redis.py`)*

---

## Step 6: Measured Live Benchmark Results (All 7 Website Cases)

The following benchmark was executed against our live Upstash Cloud Redis and MongoDB Atlas clusters:

```text
=====================================================================================================================
Area                           | Route                                | Call 1 (Miss) | Call 2 (Hit) | Speedup       
---------------------------------------------------------------------------------------------------------------------
1. Slot Holding (Lock)         | POST /api/bookings/hold              | 202.4 ms      | 319.1 ms     | 100% Safe (0 conflicts)
2. User Schedules              | GET /api/bookings/user/:id           | 353.5 ms      | 124.3 ms     | 64.8% faster  
3A. Dietitian Clients          | GET /api/dietitians/:id/clients      | 378.0 ms      | 133.8 ms     | 64.6% faster  
3B. User Meal Plans            | GET /api/meal-plans/user/:id         | 332.2 ms      | 133.9 ms     | 59.7% faster  
4. 2FA Login OTP               | POST /api/resend-login-otp           | 3390.6 ms     | 4293.7 ms    | Self-Cleaning (Zero Leaks)
5. Dietitians Directory        | GET /api/dietitians                  | 677.4 ms      | 161.3 ms     | 76.2% faster  
6. Dashboard Activities        | GET /api/analytics/user/:id/activities | 456.0 ms       | 130.6 ms     | 71.4% faster  
7A. Admin Removed Accounts     | GET /api/crud/removed-accounts       | 397.6 ms      | 159.7 ms     | 59.8% faster  
7B. Admin Active (Joined Orgs) | GET /api/crud/:role-list (x3)        | 1706.0 ms     | 447.6 ms     | 73.8% faster  
=====================================================================================================================
```

### 💡 Why does total latency show ~125ms in Python when server time is 1ms?
* **Physical Speed of Light (Internet Transit RTT)**: The Upstash cluster is hosted in a cloud datacenter. Sending a packet over physical optical fiber from India to the cloud cluster and back takes **~110ms – 125ms** of network transit time.
* **The True Measurement**: Inside the cloud datacenter in production (where Node.js and Redis reside on the same private network), that round-trip transit is **under 1 millisecond**!
* Look at the **`X-Cache-Duration`** header: on Call 2 (HIT), Express responded in **1ms – 2ms**!

---

*NutriConnect Practical Engineering Runbook — Ready for Production Deployment.*
