# Railway Environment Variable Configuration

## Database Connection Pooling

Prisma connection pooling is configured via DATABASE_URL query parameters.

### Main Backend Service (solsim)

Required environment variables:
```
DATABASE_URL=postgresql://postgres:cmvCRszpAAfgyvOZaWrHrWJxeEvvYbZb@postgres-z-rn.railway.internal:5432/railway?connection_limit=10&pool_timeout=20&connect_timeout=10
DATABASE_URL_DIRECT=postgresql://postgres:cmvCRszpAAfgyvOZaWrHrWJxeEvvYbZb@postgres-z-rn.railway.internal:5432/railway
```

### Token Discovery Worker (virtualsol-discovery-worker)

```
DATABASE_URL=postgresql://postgres:cmvCRszpAAfgyvOZaWrHrWJxeEvvYbZb@postgres-z-rn.railway.internal:5432/railway?connection_limit=5&pool_timeout=20&connect_timeout=10
REDIS_URL=redis://default:MQpkORNvCJPkgJrIHCRzAokywwRxfYoo@shuttle.proxy.rlwy.net:28212
HELIUS_API_KEY=8dc08491-9c29-440a-8616-bd3143a2af87
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=8dc08491-9c29-440a-8616-bd3143a2af87
HELIUS_WS=wss://mainnet.helius-rpc.com/?api-key=8dc08491-9c29-440a-8616-bd3143a2af87
```

### Worker Service

```
DATABASE_URL=postgresql://postgres:cmvCRszpAAfgyvOZaWrHrWJxeEvvYbZb@postgres-z-rn.railway.internal:5432/railway?connection_limit=3&pool_timeout=20&connect_timeout=10
REDIS_URL=redis://default:MQpkORNvCJPkgJrIHCRzAokywwRxfYoo@shuttle.proxy.rlwy.net:28212
PUMPPORTAL_API_KEY=[your-api-key-if-needed]
```

## Connection Pool Calculation

Railway PostgreSQL typical limit: ~25 connections

Allocation:
- Main backend: 10 (handles API traffic)
- Token discovery: 5 (background jobs)
- Worker service: 3 (aggregation)
- Reserve: 7 (migrations, manual queries, spikes)

Query Parameters:
- `connection_limit`: Max connections per service
- `pool_timeout=20`: Wait 20s for connection before error
- `connect_timeout=10`: Max 10s to establish connection

## Monitoring

Watch logs for:
- "Prisma connection pool exhausted" warnings
- "Connection reset by peer" errors
- Health check outputs every 60 seconds
- EventEmitter memory leak warnings (should be gone)

## How to Update Environment Variables

1. **Via Railway CLI:**
   ```bash
   railway variables set DATABASE_URL="postgresql://postgres:cmvCRszpAAfgyvOZaWrHrWJxeEvvYbZb@postgres-z-rn.railway.internal:5432/railway?connection_limit=10&pool_timeout=20&connect_timeout=10"
   ```

2. **Via Railway Dashboard:**
   - Go to your project
   - Select the service
   - Go to Variables tab
   - Update DATABASE_URL with connection pooling parameters

## Troubleshooting

### Connection Pool Exhausted
If you see "Prisma connection pool exhausted" errors:
1. Check if any service has too many connections
2. Reduce `connection_limit` for services that don't need many connections
3. Increase `pool_timeout` if connections are slow to release

### Connection Reset by Peer
If you see PostgreSQL connection reset errors:
1. Ensure graceful shutdown is working (check logs for "stopped gracefully")
2. Verify all intervals are cleared during shutdown
3. Check that Prisma disconnects properly

### EventEmitter Memory Leak Warnings
If you still see these warnings:
1. Check that `setMaxListeners(100)` is set on both services
2. Verify multiple services aren't subscribing unnecessarily
3. Ensure listeners are removed during shutdown
