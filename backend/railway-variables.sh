#!/bin/bash
# Railway Environment Variables Setup Script
# Copy and paste these commands into your Railway dashboard Variables section

echo "=== REQUIRED RAILWAY BUILD VARIABLES ==="
echo "Add these variables in Railway Dashboard -> Your Service -> Variables:"
echo ""
echo "RAILWAY_BUILDER=NIXPACKS"
echo "RAILWAY_BUILD_SYSTEM=NIXPACKS" 
echo "NIXPACKS_BUILD_CMD=npm ci && npm run build"
echo "NIXPACKS_START_CMD=npm run railway:start"
echo "NIXPACKS_NO_CACHE=1"
echo "NIXPACKS_NO_DOCKER=1"
echo "NODE_OPTIONS=--max-old-space-size=4096"
echo ""
echo "=== HOW TO ADD THESE ==="
echo "1. Go to: https://railway.app"
echo "2. Click your project -> solsim-backend service"
echo "3. Click 'Variables' tab"
echo "4. Click '+ New Variable' for each one above"
echo "5. Redeploy after adding all variables"
echo ""
echo "This will force Railway to use Nixpacks instead of Railpack"