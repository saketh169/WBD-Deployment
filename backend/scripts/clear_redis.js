/**
 * NutriConnect Redis Clear Script
 * Usage: node scripts/clear_redis.js (or npm run redis:clear)
 * 
 * Safely connects to Upstash Redis, reports all active keys,
 * completely flushes the stash, and verifies 0 keys remain.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('❌ Error: REDIS_URL not found in backend/.env');
  process.exit(1);
}

console.log('🔄 Connecting to Upstash Redis...');

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  lazyConnect: true,
});

async function clearRedisStash() {
  try {
    await redis.connect();
    console.log('✅ Connected to Upstash Redis successfully.');

    // 1. Fetch current keys to inspect what's inside
    const keysBefore = await redis.keys('*');
    console.log(`\n📊 Active Keys in Redis (${keysBefore.length} total):`);
    if (keysBefore.length > 0) {
      keysBefore.slice(0, 15).forEach((k, idx) => console.log(`   ${idx + 1}. ${k}`));
      if (keysBefore.length > 15) {
        console.log(`   ... and ${keysBefore.length - 15} more keys`);
      }
    } else {
      console.log('   (Database is already empty)');
    }

    // 2. Perform FLUSHDB
    console.log('\n🧹 Purging all keys from Redis Stash (FLUSHDB)...');
    const result = await redis.flushdb();

    // 3. Verify
    const keysAfter = await redis.keys('*');
    if (keysAfter.length === 0 && result === 'OK') {
      console.log('✨ SUCCESS: Upstash Redis stash has been completely cleared out!');
      console.log(`   - Keys removed: ${keysBefore.length}`);
      console.log(`   - Remaining keys: 0`);
      console.log(`   - Timestamp: ${new Date().toISOString()}`);
    } else {
      console.warn(`⚠️ Warning: ${keysAfter.length} keys still remain. Attempting direct key deletion...`);
      if (keysAfter.length > 0) {
        await redis.del(...keysAfter);
      }
      console.log('✨ All remaining keys deleted.');
    }

    await redis.quit();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to clear Redis stash:', err.message);
    process.exit(1);
  }
}

clearRedisStash();
