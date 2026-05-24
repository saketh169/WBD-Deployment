# Redis Cache TTLs

This file lists the Redis cache TTLs currently used in the backend.

## Production cache TTLs

| Area | Cache key example | TTL |
| --- | --- | ---: |
| Verified dietitians list | `dietitians:list:verified` | 3600s |
| Dietitian search results | `dietitians:search:<query>` | 3600s |
| Dietitian profile | `dietitians:profile:<id>` | 900s |
| Public blogs list | `public:blogs:<...>` | 300s |
| Public stats | `public:stats` | 600s |
| Blog list | `blogs:list:<...>` | 300s |
| User bookings list | `bookings:user:<userId>:<...>` | 300s |
| Dietitian bookings list | `bookings:dietitian:<dietitianId>:<...>` | 300s |
| User meal plans | `mealplans:user:<...>` | 300s |
| Dietitian meal plan templates | `mealplans:dietitian:<...>:templates` | 300s |
| Dietitian client meal plans | `mealplans:dietitian:<...>:clients:<...>` | 300s |
| Global settings | `settings:global` | 600s |

## Behavior when data changes

- When booking data changes, the backend invalidates the related booking cache keys.
- When cache keys are invalidated, the next request becomes a cache `MISS` again.
- After the miss, the response is stored back in Redis and the following request becomes a `HIT` until the TTL expires.

## Notes

- If Redis is not available, `cacheOrFetch()` returns `BYPASS` and the backend reads directly from the database.
- The cache layer also uses a database-specific namespace and, when available, a deployment version namespace to avoid cache pollution across environments.