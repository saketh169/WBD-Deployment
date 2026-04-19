require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Redis = require('ioredis');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// ============================================
// REDIS BENCHMARK: Docker Local vs Cloud vs MongoDB Atlas
// ============================================

const BENCHMARK_CONFIG = {
  iterations: 1000,
  dataSize: 'small', // small, medium, large
  testTypes: ['set', 'get', 'del', 'incr', 'list_push', 'list_range'],
};

// Test data generator
const generateTestData = (size = 'small') => {
  const sizes = {
    small: 100,
    medium: 1000,
    large: 10000,
  };
  const dataSize = sizes[size] || 100;
  return {
    string: 'x'.repeat(dataSize),
    object: JSON.stringify({ data: 'x'.repeat(dataSize) }),
    number: Math.random() * 1000000,
  };
};

// Benchmark function
const benchmarkOperation = async (redis, operationType, iterations, testData) => {
  const times = [];
  const errors = [];

  for (let i = 0; i < iterations; i++) {
    try {
      const startTime = process.hrtime.bigint();

      switch (operationType) {
        case 'set':
          await redis.set(`bench:key:${i}`, testData.string);
          break;
        case 'get':
          await redis.get(`bench:key:${Math.floor(Math.random() * iterations)}`);
          break;
        case 'del':
          await redis.del(`bench:key:${i}`);
          break;
        case 'incr':
          await redis.incr(`bench:counter:${i % 10}`);
          break;
        case 'list_push':
          await redis.lpush(`bench:list:${i % 10}`, testData.string);
          break;
        case 'list_range':
          await redis.lrange(`bench:list:${i % 10}`, 0, 10);
          break;
        default:
          throw new Error(`Unknown operation: ${operationType}`);
      }

      const endTime = process.hrtime.bigint();
      times.push(Number(endTime - startTime) / 1000); // Convert to microseconds
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (times.length === 0) {
    return { avg: 0, min: 0, max: 0, p95: 0, p99: 0, errors: errors.length };
  }

  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = times[0];
  const max = times[times.length - 1];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];

  return { avg, min, max, p95, p99, errors: errors.length };
};

// Create Redis connections
const createRedisConnections = async () => {
  const connections = {};

  // Local Redis (Docker)
  console.log('Connecting to Redis instances...');
  try {
    const localRedis = new Redis({
      host: process.env.REDIS_LOCAL_HOST || 'localhost',
      port: process.env.REDIS_LOCAL_PORT || 6379,
      password: process.env.REDIS_LOCAL_PASSWORD || undefined,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      connectTimeout: 5000,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: true,
    });

    // Add timeout for connection
    await Promise.race([
      localRedis.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      ),
    ]);

    await localRedis.ping();
    connections.local = localRedis;
    console.log('CONNECTED: Local Redis (Docker) connected');
  } catch (err) {
    console.log('FAILED: Local Redis (Docker) failed:', err.message);
  }

  // Redis Cloud
  try {
    const cloudUrl = process.env.REDIS_CLOUD_URL;
    if (!cloudUrl) {
      console.log('SKIPPED: Redis Cloud skipped (REDIS_CLOUD_URL not configured)');
    } else {
      const cloudRedis = new Redis(cloudUrl, {
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        enableOfflineQueue: true,
        connectTimeout: 5000,
        retryStrategy: (times) => Math.min(times * 50, 2000),
        lazyConnect: true,
        tls: cloudUrl.includes('rediss://') ? {} : undefined,
      });

      await Promise.race([
        cloudRedis.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        ),
      ]);

      await cloudRedis.ping();
      connections.cloud = cloudRedis;
      console.log('CONNECTED: Redis Cloud connected');
    }
  } catch (err) {
    console.log('FAILED: Redis Cloud failed:', err.message);
  }

  // MongoDB Atlas
  try {
    const mongoUrl = process.env.MONGODB_URL || process.env.MONGODB_ATLAS_URL;
    if (!mongoUrl) throw new Error('MongoDB URL not configured');
    
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 5000,
    });
    connections.mongodb = true;
    console.log('CONNECTED: MongoDB Atlas connected');
  } catch (err) {
    console.log('FAILED: MongoDB Atlas failed:', err.message);
  }

  return connections;
};

// MongoDB benchmark
const benchmarkMongoDB = async (iterations) => {
  try {
    const testCollection = mongoose.connection.collection('bench_test');
    const results = {};
    const testData = generateTestData(BENCHMARK_CONFIG.dataSize);

    // INSERT
    const insertStart = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      await testCollection.insertOne({
        key: `bench:${i}`,
        value: testData.string,
        timestamp: new Date(),
      });
    }
    const insertTime = Number(process.hrtime.bigint() - insertStart) / 1000 / iterations;

    // READ
    const readStart = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      await testCollection.findOne({ key: `bench:${Math.floor(Math.random() * iterations)}` });
    }
    const readTime = Number(process.hrtime.bigint() - readStart) / 1000 / iterations;

    // DELETE
    const deleteStart = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      await testCollection.deleteOne({ key: `bench:${i}` });
    }
    const deleteTime = Number(process.hrtime.bigint() - deleteStart) / 1000 / iterations;

    results.insert = { avg: insertTime, min: insertTime, max: insertTime, p95: insertTime, p99: insertTime };
    results.read = { avg: readTime, min: readTime, max: readTime, p95: readTime, p99: readTime };
    results.delete = { avg: deleteTime, min: deleteTime, max: deleteTime, p95: deleteTime, p99: deleteTime };

    return results;
  } catch (err) {
    console.error('MongoDB benchmark error:', err.message);
    return null;
  }
};

// Format microseconds to readable time
const formatTime = (microseconds) => {
  if (microseconds < 1000) return `${microseconds.toFixed(2)}µs`;
  if (microseconds < 1000000) return `${(microseconds / 1000).toFixed(2)}ms`;
  return `${(microseconds / 1000000).toFixed(2)}s`;
};

// Generate report
const generateReport = async (results) => {
  const report = [];
  report.push('\n========================================================================');
  report.push('REDIS & MONGODB PERFORMANCE BENCHMARK REPORT');
  report.push('Local Redis (Docker) vs Redis Cloud vs MongoDB Atlas');
  report.push('========================================================================\n');

  report.push('Configuration:');
  report.push(`   Iterations: ${BENCHMARK_CONFIG.iterations}`);
  report.push(`   Data Size: ${BENCHMARK_CONFIG.dataSize}`);
  report.push(`   Data Volume: ${generateTestData(BENCHMARK_CONFIG.dataSize).string.length} bytes per record\n`);

  report.push('========================================================================\n');

  const sources = ['local', 'cloud', 'mongodb'];
  const sourceLabels = { local: 'Local Redis (Docker)', cloud: 'Redis Cloud', mongodb: 'MongoDB Atlas' };
  
  // Get all unique operations from all sources
  const allOperations = new Set();
  for (const source of sources) {
    if (results[source]) {
      Object.keys(results[source]).forEach(op => allOperations.add(op));
    }
  }
  const operations = Array.from(allOperations);

  for (const op of operations) {
    report.push(`\nOperation: ${op.toUpperCase()}`);
    report.push('------------------------------------------------------------------------');

    let fastest = null;
    let fastestTime = Infinity;

    // First pass: find fastest among all sources
    for (const source of sources) {
      if (results[source] && results[source][op]) {
        const { avg } = results[source][op];
        if (avg > 0 && avg < fastestTime) {
          fastestTime = avg;
          fastest = source;
        }
      }
    }

    // Second pass: display all results for all sources
    for (const source of sources) {
      if (results[source] && results[source][op]) {
        const { avg, min, max, p95, p99, errors } = results[source][op];
        const isFastest = source === fastest;
        const marker = isFastest ? ' [FASTEST]' : '';

        report.push(`\n${sourceLabels[source]}${marker}`);
        report.push(`   Average: ${formatTime(avg)}`);
        report.push(`   Min:     ${formatTime(min)}`);
        report.push(`   Max:     ${formatTime(max)}`);
        report.push(`   P95:     ${formatTime(p95)}`);
        report.push(`   P99:     ${formatTime(p99)}`);
        if (errors > 0) report.push(`   Errors:  ${errors}`);
      } else {
        // Show [NOT AVAILABLE] for missing services
        report.push(`\n${sourceLabels[source]}`);
        report.push('   [NOT AVAILABLE]');
      }
    }

    report.push('');
  }

  report.push('========================================================================');
  report.push('\nSUMMARY:');
  report.push('   Local Redis (Docker):  Best for development, no external dependencies');
  report.push('   Redis Cloud:           Best for production, managed service with uptime SLA');
  report.push('   MongoDB Atlas:         Use for persistent data storage, not for caching\n');

  return report.join('\n');
};

// Main execution
const main = async () => {
  console.log('\n========================================================================');
  console.log('Starting Redis & MongoDB Benchmark');
  console.log('========================================================================\n');

  const connections = await createRedisConnections();

  if (!connections.local && !connections.cloud && !connections.mongodb) {
    console.error('\nERROR: No Redis or MongoDB connections available!');
    console.error('Please ensure at least one service is running.\n');
    process.exit(1);
  }

  const testData = generateTestData(BENCHMARK_CONFIG.dataSize);
  const results = {
    local: {},
    cloud: {},
    mongodb: {},
  };

  console.log('\nRunning benchmarks...\n');

  // Benchmark Local Redis
  if (connections.local) {
    console.log('Benchmarking Local Redis (Docker)...');
    for (const op of BENCHMARK_CONFIG.testTypes) {
      process.stdout.write(`   ${op}... `);
      results.local[op] = await benchmarkOperation(connections.local, op, BENCHMARK_CONFIG.iterations, testData);
      console.log('OK');
    }
  }

  // Benchmark Redis Cloud
  if (connections.cloud) {
    console.log('Benchmarking Redis Cloud...');
    for (const op of BENCHMARK_CONFIG.testTypes) {
      process.stdout.write(`   ${op}... `);
      results.cloud[op] = await benchmarkOperation(connections.cloud, op, BENCHMARK_CONFIG.iterations, testData);
      console.log('OK');
    }
  }

  // Benchmark MongoDB Atlas
  if (connections.mongodb) {
    console.log('Benchmarking MongoDB Atlas...');
    const mongoResults = await benchmarkMongoDB(Math.min(BENCHMARK_CONFIG.iterations, 100));
    if (mongoResults) {
      results.mongodb = mongoResults;
      console.log('   Operations completed');
    }
  }

  // Generate and display report
  const report = await generateReport(results);
  console.log(report);

  // Save report to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, `../logs/benchmark-${timestamp}.txt`);
  
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, report);
  console.log(`\nReport saved to: logs/benchmark-${timestamp}.txt\n`);

  // Cleanup
  try {
    if (connections.local) {
      await connections.local.quit();
    }
    if (connections.cloud) {
      await connections.cloud.quit();
    }
    if (connections.mongodb) {
      await mongoose.connection.close();
    }
  } catch (err) {
    console.log('WARNING: Error during cleanup:', err.message);
  }

  process.exit(0);
};

main().catch(err => {
  console.error('ERROR: Benchmark failed:', err);
  process.exit(1);
});
