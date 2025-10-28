#!/bin/bash
# Start script for Token Discovery Worker
echo "🚀 Starting Token Discovery Worker..."
npx prisma generate
node --max-old-space-size=1536 dist/workers/tokenDiscoveryWorker.js
