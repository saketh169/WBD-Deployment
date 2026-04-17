const { Client } = require('@elastic/elasticsearch');

// Connect to Elasticsearch (default Docker port)
const elasticClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  // Disable TLS verification for local dev if needed
  tls: { rejectUnauthorized: false }
});

let isElasticReady = false;

const initElastic = async () => {
  try {
    const health = await elasticClient.cluster.health({});
    console.log(`[ELASTICSEARCH] Connected successfully. Status: ${health.status}`);
    isElasticReady = true;

    // Create the global universal index if it doesn't exist
    const exists = await elasticClient.indices.exists({ index: 'nutriconnect_search' });
    if (!exists) {
      console.log('[ELASTICSEARCH] Index not found. Creating generic search index...');
      await elasticClient.indices.create({
        index: 'nutriconnect_search',
        body: {
          mappings: {
            properties: {
              type: { type: 'keyword' },
              title: { type: 'text' },
              description: { type: 'text' },
              tags: { type: 'text' },
              imageUrl: { type: 'keyword' },
              entityId: { type: 'keyword' },
              metadata: { type: 'text' },
              isPublic: { type: 'boolean' },
              owners: { type: 'keyword' }
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

const searchElastic = async (query, typeFilter = 'all', limit = 10, skip = 0) => {
  if (!isElasticReady) {
    return null; // Return null so the route handler knows to fallback to DB
  }

  const queryBody = {
    bool: {
      must: [
        {
          multi_match: {
            query,
            fields: ['title^3', 'description^2', 'tags^2', 'metadata'],
            fuzziness: 2,
            prefix_length: 1,
            max_expansions: 50,
            operator: 'OR'
          }
        }
      ]
    }
  };

  if (typeFilter !== 'all') {
    queryBody.bool.filter = queryBody.bool.filter || [];
    queryBody.bool.filter.push({ term: { type: typeFilter } });
  }

  // RBAC: Only show public results OR results where the user is an owner
  // If no userContext is provided, only show public results
  const authFilter = {
    bool: {
      should: [
        { term: { isPublic: true } }
      ],
      minimum_should_match: 1
    }
  };

  if (limit && typeof limit === 'object' && limit.requestingUserId) {
    authFilter.bool.should.push({ term: { owners: limit.requestingUserId } });
    // Cleanup limit if it was used as context object
    limit = limit.limit || 10;
  }
  
  queryBody.bool.filter = queryBody.bool.filter || [];
  queryBody.bool.filter.push(authFilter);

  try {
    const result = await elasticClient.search({
      index: 'nutriconnect_search',
      from: skip,
      size: parseInt(limit),
      body: {
        query: queryBody
      }
    });
    // Map _source back to our standard document formats
    return result.hits.hits.map(hit => hit._source);
  } catch (err) {
    console.error('[ELASTICSEARCH ERROR] Query failed:', err.message);
    return null;
  }
};

const indexDocument = async (document) => {
  if (!isElasticReady) return;
  try {
    await elasticClient.index({
      index: 'nutriconnect_search',
      id: `${document.type}_${document.entityId}`,
      document
    });
  } catch (err) {
    console.error('[ELASTICSEARCH ERROR] Indexing failed:', err.message);
  }
};

module.exports = {
  elasticClient,
  initElastic,
  searchElastic,
  indexDocument,
  get isElasticReady() { return isElasticReady; }
};
