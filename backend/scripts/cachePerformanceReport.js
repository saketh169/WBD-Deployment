require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const connectDB = async () => {
	const MONGODB_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/NutriConnectDatabase';
	await mongoose.connect(MONGODB_URI);
	console.log('✅ Connected to MongoDB');
};

const benchmark = async (label, fn, iterations = 5) => {
	const times = [];
	for (let i = 0; i < iterations; i++) {
		const start = Date.now();
		await fn();
		times.push(Date.now() - start);
	}
	const avg = times.reduce((a, b) => a + b, 0) / times.length;
	return { label, avgMs: avg.toFixed(2), times };
};

const run = async () => {
	// Setup output capture
	const logsDir = path.join(__dirname, '..', 'logs');
	if (!fs.existsSync(logsDir)) {
		fs.mkdirSync(logsDir, { recursive: true });
	}
	
	const outputs = [];
	const originalLog = console.log;
	console.log = (...args) => {
		const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
		originalLog(message);
		outputs.push(message);
	};

	await connectDB();

	// Try to connect to Redis
	let redis, isRedisAvailable = false;
	try {
		const { redis: redisClient, cacheOrFetch } = require('../src/utils/redisClient');
		redis = redisClient;
		await redis.ping();
		isRedisAvailable = true;
		console.log('✅ Redis Connected');
	} catch (err) {
		console.log('⚠️  Redis not available — showing DB-only benchmarks');
		console.log('   To see full cache comparison, start Redis first: docker run -d -p 6379:6379 redis:7-alpine\n');
	}

	console.log('\n╔════════════════════════════════════════════════════════╗');
	console.log('║        REDIS CACHE PERFORMANCE REPORT                  ║');
	console.log('║        NutriConnect - Cache vs DB Comparison            ║');
	console.log('╚════════════════════════════════════════════════════════╝\n');

	const { Blog } = require('../src/models/blogModel');
	const { Dietitian } = require('../src/models/userModel');
	const Settings = require('../src/models/settingsModel');

	// ---- Test 1: Blog Listing ----
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('📊 Test 1: Blog Listing (GET /api/blogs)');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

	const blogQuery = () => Blog.find({ isPublished: true, status: 'active' })
		.sort({ createdAt: -1 }).limit(10).lean();

	const dbBlogResult = await benchmark('DB Direct', blogQuery);
	console.log(`   DB Direct (avg):    ${dbBlogResult.avgMs}ms`);

	if (isRedisAvailable) {
		const { cacheOrFetch } = require('../src/utils/redisClient');

		await redis.del('bench:blogs');
		const cacheMissResult = await benchmark('Cache MISS', () =>
			cacheOrFetch('bench:blogs', 300, blogQuery), 1);
		console.log(`   Cache MISS (avg):   ${cacheMissResult.avgMs}ms`);

		const cacheHitResult = await benchmark('Cache HIT', () =>
			cacheOrFetch('bench:blogs', 300, blogQuery));
		console.log(`   Cache HIT (avg):    ${cacheHitResult.avgMs}ms`);

		const improvement = ((parseFloat(dbBlogResult.avgMs) - parseFloat(cacheHitResult.avgMs)) /
			parseFloat(dbBlogResult.avgMs) * 100).toFixed(1);
		console.log(`   📈 Improvement:     ${improvement}% faster with cache\n`);
	}

	// ---- Test 2: Dietitian Listing ----
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('📊 Test 2: Dietitian Listing');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

	const dietQuery = () => Dietitian.find({ isDeleted: { $ne: true } })
		.select('name specialization experience fees location rating')
		.limit(10).lean();

	const dbDietResult = await benchmark('DB Direct', dietQuery);
	console.log(`   DB Direct (avg):    ${dbDietResult.avgMs}ms`);

	if (isRedisAvailable) {
		const { cacheOrFetch } = require('../src/utils/redisClient');
		await redis.del('bench:dietitians');
		await benchmark('Cache MISS', () =>
			cacheOrFetch('bench:dietitians', 300, dietQuery), 1);

		const cacheHitResult = await benchmark('Cache HIT', () =>
			cacheOrFetch('bench:dietitians', 300, dietQuery));
		console.log(`   Cache HIT (avg):    ${cacheHitResult.avgMs}ms`);

		const improvement = ((parseFloat(dbDietResult.avgMs) - parseFloat(cacheHitResult.avgMs)) /
			parseFloat(dbDietResult.avgMs) * 100).toFixed(1);
		console.log(`   📈 Improvement:     ${improvement}% faster with cache\n`);
	}

	// ---- Test 3: Settings ----
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('📊 Test 3: Settings Lookup');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

	const settingsQuery = () => Settings.findOne().lean();

	const dbSettingsResult = await benchmark('DB Direct', settingsQuery);
	console.log(`   DB Direct (avg):    ${dbSettingsResult.avgMs}ms`);

	if (isRedisAvailable) {
		const { cacheOrFetch } = require('../src/utils/redisClient');
		await redis.del('bench:settings');
		await benchmark('Cache MISS', () =>
			cacheOrFetch('bench:settings', 600, settingsQuery), 1);

		const cacheHitResult = await benchmark('Cache HIT', () =>
			cacheOrFetch('bench:settings', 600, settingsQuery));
		console.log(`   Cache HIT (avg):    ${cacheHitResult.avgMs}ms`);

		const improvement = ((parseFloat(dbSettingsResult.avgMs) - parseFloat(cacheHitResult.avgMs)) /
			parseFloat(dbSettingsResult.avgMs) * 100).toFixed(1);
		console.log(`   📈 Improvement:     ${improvement}% faster with cache\n`);
	}

	// Summary
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('📋 SUMMARY');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	if (isRedisAvailable) {
		console.log('✅ Redis caching is ACTIVE and significantly improves read performance.');
		console.log('   Cached endpoints: Blog listing, Dietitian listing, Settings');
		console.log('   Cache TTL: 300s (blogs/dietitians), 600s (settings)');
		console.log('   Cache invalidation: On create/update/delete operations');
	} else {
		console.log('⚠️  Redis is NOT running. Application still works via DB direct queries.');
		console.log('   Start Redis for improved performance: docker run -d -p 6379:6379 redis:7-alpine');
	}
	console.log(`\n📄 Report generated at: ${new Date().toISOString()}\n`);

	// Save all captured output to logs folder
	const timestamp = new Date().toISOString().split('T')[0];
	const reportFile = path.join(logsDir, `cache-performance-${timestamp}.txt`);
	const reportContent = outputs.join('\n');
	fs.writeFileSync(reportFile, reportContent, 'utf8');
	
	// Restore console.log and print final message
	console.log = originalLog;
	console.log(`✅ Report saved to: ${reportFile}`);

	// Cleanup
	if (isRedisAvailable) {
		await redis.del('bench:blogs', 'bench:dietitians', 'bench:settings');
		redis.disconnect();
	}
	process.exit(0);
};

run().catch(err => {
	console.error('Performance report failed:', err);
	process.exit(1);
});
