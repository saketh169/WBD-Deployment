require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/NutriConnectDatabase';
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB for benchmarking');
};

const runBenchmarks = async () => {
  await connectDB();
  const db = mongoose.connection.db;

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║       DATABASE QUERY BENCHMARK REPORT              ║');
  console.log('║       NutriConnect - Query Performance Analysis     ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const benchmarks = [];

  // Helper function
  const runExplain = async (collectionName, label, query, sort = null) => {
    try {
      let cursor = db.collection(collectionName).find(query);
      if (sort) cursor = cursor.sort(sort);
      const explain = await cursor.explain('executionStats');

      const stats = explain.executionStats;
      const plan = explain.queryPlanner.winningPlan;

      // Extract index name from plan tree
      const getIndexName = (p) => {
        if (p.indexName) return p.indexName;
        if (p.inputStage) return getIndexName(p.inputStage);
        if (p.inputStages) {
          for (const s of p.inputStages) {
            const name = getIndexName(s);
            if (name) return name;
          }
        }
        return null;
      };

      const indexName = getIndexName(plan) || 'COLLSCAN (No Index)';
      const result = {
        label,
        collection: collectionName,
        indexUsed: indexName,
        docsExamined: stats.totalDocsExamined,
        docsReturned: stats.nReturned,
        executionTimeMs: stats.executionTimeMillis,
        isIndexed: indexName !== 'COLLSCAN (No Index)'
      };

      benchmarks.push(result);

      console.log(`📊 ${label}`);
      console.log(`   Collection:    ${collectionName}`);
      console.log(`   Index Used:    ${result.isIndexed ? '✅' : '❌'} ${indexName}`);
      console.log(`   Docs Examined: ${stats.totalDocsExamined}`);
      console.log(`   Docs Returned: ${stats.nReturned}`);
      console.log(`   Exec Time:     ${stats.executionTimeMillis}ms\n`);
    } catch (err) {
      console.log(`⚠️  ${label}: ${err.message}\n`);
    }
  };

  // 1. UserAuth - Find by email
  await runExplain('userauths', 'UserAuth: Lookup by email',
    { email: 'test@test.com' });

  // 2. UserAuth - Find by role
  await runExplain('userauths', 'UserAuth: Filter by role',
    { role: 'user' });

  // 3. Bookings - User bookings sorted by date
  await runExplain('bookings', 'Bookings: User bookings (sorted)',
    { userId: new mongoose.Types.ObjectId() },
    { createdAt: -1 });

  // 4. Bookings - Dietitian bookings sorted
  await runExplain('bookings', 'Bookings: Dietitian bookings (sorted)',
    { dietitianId: new mongoose.Types.ObjectId() },
    { createdAt: -1 });

  // 5. Bookings - Filter by status
  await runExplain('bookings', 'Bookings: Filter by status',
    { status: 'confirmed' });

  // 6. Bookings - By date
  await runExplain('bookings', 'Bookings: Filter by date',
    { date: new Date() });

  // 7. Blogs - Published + active
  await runExplain('blogs', 'Blogs: Published & active posts',
    { isPublished: true, status: 'active' },
    { createdAt: -1 });

  // 8. Blogs - By category
  await runExplain('blogs', 'Blogs: Filter by category',
    { category: 'Nutrition Tips' });

  // 9. Blogs - By author
  await runExplain('blogs', 'Blogs: Filter by author',
    { 'author.userId': new mongoose.Types.ObjectId() });

  // 10. Blogs - Reported blogs
  await runExplain('blogs', 'Blogs: Reported blogs',
    { isReported: true });

  // 11. Payments - User payments sorted
  await runExplain('payments', 'Payments: User payment history',
    { userId: new mongoose.Types.ObjectId() },
    { createdAt: -1 });

  // 12. Payments - Active subscription
  await runExplain('payments', 'Payments: Active subscription lookup',
    {
      userId: new mongoose.Types.ObjectId(),
      paymentStatus: 'success',
      isActive: true,
      subscriptionEndDate: { $gte: new Date() }
    });

  // 13. Conversations - Between users
  await runExplain('conversations', 'Chat: Conversation lookup',
    {
      clientId: new mongoose.Types.ObjectId(),
      dietitianId: new mongoose.Types.ObjectId()
    });

  // 14. Messages - By conversation sorted
  await runExplain('messages', 'Chat: Messages in conversation',
    { conversationId: new mongoose.Types.ObjectId() },
    { createdAt: -1 });

  // 15. Employees - By organization
  await runExplain('employees', 'Employees: By organization',
    { organizationId: new mongoose.Types.ObjectId() });

  // Summary
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                         ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const indexed = benchmarks.filter(b => b.isIndexed).length;
  const total = benchmarks.length;
  console.log(`Total Queries Benchmarked: ${total}`);
  console.log(`Queries Using Indexes:     ${indexed}/${total} (${((indexed / total) * 100).toFixed(0)}%)`);
  console.log(`Queries Without Indexes:   ${total - indexed}/${total}`);

  if (total - indexed > 0) {
    console.log('\n⚠️  Queries WITHOUT indexes:');
    benchmarks
      .filter(b => !b.isIndexed)
      .forEach(b => console.log(`   - ${b.label}`));
  } else {
    console.log('\n✅ All queries are using indexes!');
  }

  console.log('\n📄 Report generated at:', new Date().toISOString());
  process.exit(0);
};

runBenchmarks().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
