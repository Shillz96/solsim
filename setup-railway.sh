#!/bin/bash
# SolSim Railway Deployment Script
# Run this from the project root directory

echo "🚂 Setting up SolSim on Railway..."

# 1. Create new Railway project
echo "📁 Creating Railway project..."
railway new solsim-production

# 2. Add PostgreSQL database
echo "🗄️ Adding PostgreSQL database..."
railway add --database postgresql

# 3. Add Redis cache
echo "🔴 Adding Redis cache..."
railway add --database redis

# 4. Deploy backend service
echo "⚙️ Adding backend service..."
railway add --service backend
railway link --service backend

# 5. Set environment variables for backend
echo "🔧 Setting environment variables..."

# Database connections (auto-injected)
railway variables set DATABASE_URL='${{Postgres.DATABASE_URL}}'
railway variables set REDIS_URL='${{Redis.REDIS_URL}}'

# Production settings
railway variables set NODE_ENV=production
railway variables set PORT='${{PORT}}'

# Required API keys (you need to replace these)
railway variables set SOLANA_RPC_URL='https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY'
railway variables set HELIUS_RPC_URL='https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY'
railway variables set HELIUS_WS='wss://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY'
railway variables set HELIUS_API_KEY='YOUR_HELIUS_KEY'
railway variables set DEXSCREENER_BASE='https://api.dexscreener.com'
railway variables set JUPITER_BASE='https://quote-api.jup.ag'

# Security (generate a strong secret)
railway variables set JWT_SECRET='your-super-secret-jwt-key-min-32-characters-long'

# Frontend URL (update with your actual Vercel URL)
railway variables set FRONTEND_URL='https://your-solsim-frontend.vercel.app'

echo "✅ Railway setup complete!"
echo "🔧 Next steps:"
echo "   1. Update API keys in Railway dashboard"
echo "   2. Deploy: railway up"
echo "   3. Run migrations: railway run npx prisma migrate deploy"