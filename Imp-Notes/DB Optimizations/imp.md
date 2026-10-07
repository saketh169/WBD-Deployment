Here is the complete summary of **all places where Redis (and the caching/locking layer) is used in your project**, how each works, and why:

---

### 1. Slot Concurrency Locking (Cinema-Style Double-Booking Prevention)
* **Where:** `bookingController.js` (`holdSlot`, `releaseSlot`, `createBooking`)
* **Redis Command:** `SET key userId EX 600 NX`
* **Key:** `lock:booking:<dietitianId>:<date>:<time>`
* **TTL:** 10 minutes (600s)
* **How it works:** When user picks a consultation slot, Redis acquires a distributed lock (`NX` = only if not exists). Other users see this slot as temporarily locked. If checkout is completed, the slot is permanently booked and the lock is released; if abandoned, Redis automatically expires the lock after 10 mins.

---

### 2. Payment Transaction Hold (10-Minute Checkout Expiry)
* **Where:**
  * **Bookings:** `bookingController.js` (`createBookingPaymentOrder` & `createBooking`)
  * **Subscriptions:** `paymentController.js` (`initializePayment` & `processPayment`)
* **Redis Command:** `SET key userId EX 600` / `GET key` / `DEL key`
* **Keys:**
  * `lock:payment:booking:<userId>:<orderId>`
  * `lock:payment:subscription:<userId>:<orderId>`
* **TTL:** 10 minutes (600s)
* **How it works:** When the user clicks "Pay", a 10-minute Redis lock is created for that transaction order. When completing payment, backend checks `getLockHolder`. If expired (>10 mins), the request is rejected with `410 Payment session expired`. Once payment succeeds, the lock is released.

---

### 3. Dietitian Directory & Profile Caching
* **Where:** `dietitianRoutes.js` (`/api/dietitians`, `/api/dietitians/:id`, `/api/dietitians/:id/clients`)
* **Redis Command:** `GET key` / `SETEX key 300 JSON`
* **Keys:**
  * `dietitians:list:<searchQuery>`
  * `dietitians:profile:<id>`
  * `dietitians:<id>:clients`
* **TTL:** 5 minutes (300s)
* **How it works:** Uses `cacheOrFetch()`. If data is in Redis (Cache HIT), it returns in <5ms without querying MongoDB. On Cache MISS, it fetches from MongoDB, writes to Redis, and returns.

---

### 4. User & Dietitian Bookings / Schedule Caching
* **Where:** `bookingController.js` (`getUserBookings`, `getDietitianBookings`)
* **Redis Command:** `GET key` / `SETEX key 300 JSON`
* **Keys:**
  * `bookings:user:<userId>:<status>:<sort>`
  * `bookings:dietitian:<dietitianId>:<status>:<sort>`
  * `slots:<dietitianId>:<date>`
* **TTL:** 5 minutes (300s)
* **Cache Invalidation:** When a booking is created, rescheduled, or cancelled, `invalidateCache("bookings:user:<userId>:*")` and `invalidateCache("bookings:dietitian:<dietitianId>:*")` immediately purge the stale keys from Redis.

---

### 5. OTP Storage with Auto-Expiry
* **Where:** `authController.js` / `redisClient.js`
* **Redis Command:** `SETEX otp:<email> 600 JSON`
* **Key:** `otp:<email>`
* **TTL:** 10 minutes (600s)
* **How it works:** Stores the generated OTP hash and verification attempt count directly in Redis instead of writing temporary rows to MongoDB. Redis automatically deletes expired OTPs after 10 minutes.

---

### 6. Capped Real-Time Activity Feed
* **Where:** `redisClient.js` (`pushActivity`, `getRecentActivities`)
* **Redis Command:** `LPUSH key JSON` + `LTRIM key 0 19`
* **Key:** `activity:user:<userId>`
* **TTL:** Bounded to the latest 20 items
* **How it works:** Uses Redis Lists to store the most recent 20 user actions. `LTRIM` keeps memory strictly bounded so it never grows infinitely.

---

### 7. Client-Side (Frontend) Memory Cache Layer
* **Where:** [`dietitianService.js`](file:///c:/Users/saket/Web%20Projects/WBD-BackendDev/frontend/src/services/dietitian/dietitianService.js) and [`bookingService.js`](file:///c:/Users/saket/Web%20Projects/WBD-BackendDev/frontend/src/services/booking/bookingService.js)
* **TTL:** **2 minutes** for all 4:
  1. `getAllDietitians()` — caches dietitian list
  2. `getDietitianClients()` — caches dietitian's client list
  3. `getUserBookings()` — caches client's booked consultations
  4. `getDietitianBookings()` — caches dietitian's booked appointments
* **How it works:** Eliminates unnecessary duplicate network requests on React re-renders or page navigation. Automatically re-fetches when 2 minutes expire.

---

### 💡 Quick Summary for Interviewers:
> *"We use Redis for **3 primary architectural patterns**:*  
> 1. ***Distributed Concurrency Control*** — *Slot holding (prevents double bookings) and 10-minute payment session locks.*  
> 2. ***High-Performance Caching*** — *Transparent read-through caching with proactive invalidation for dietitians, profiles, and appointment schedules.*  
> 3. ***Transient Ephemeral Storage*** — *Auto-expiring OTPs and bounded (top-20) activity feeds via Redis Lists."*