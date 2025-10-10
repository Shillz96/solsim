# Security Environment Variables for SolSim Backend

# Copy these to your .env file and set appropriate values

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars-change-this-in-production
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/solsim

# Redis (for session storage, nonces, and rate limiting)
REDIS_URL=redis://localhost:6379

# API Configuration
PORT=4000
FRONTEND_URL=https://solsim.fun

# Solana Configuration  
HELIUS_RPC_URL=wss://mainnet.helius-rpc.com
SOLANA_RPC_URL=https://mainnet.helius-rpc.com
SIM_TOKEN_MINT=your-sim-token-mint-address

# Security Configuration (Optional - defaults provided)
# NONCE_TTL=300                    # Nonce expiry in seconds (default: 5 minutes)
# MAX_NONCE_ATTEMPTS=3             # Max nonce requests per hour (default: 3)
# BCRYPT_SALT_ROUNDS=12            # Password hashing rounds (default: 12)

# Rate Limiting Configuration (Optional - defaults provided)
# AUTH_RATE_LIMIT_MAX=5            # Auth requests per 15 minutes (default: 5)
# TRADING_RATE_LIMIT_MAX=100       # Trades per minute (default: 100)
# GENERAL_RATE_LIMIT_MAX=1000      # General API requests per minute (default: 1000)

## Production Security Checklist:

1. **Change JWT_SECRET** - Generate a strong, random secret (min 32 characters)
2. **Use HTTPS** - All production traffic should use SSL/TLS
3. **Secure Redis** - Use Redis AUTH and TLS in production
4. **Database Security** - Use connection pooling and secure credentials
5. **Environment Variables** - Never commit .env files to source control
6. **Rate Limiting** - Adjust limits based on your usage patterns
7. **Monitoring** - Set up logging and monitoring for security events

## JWT Secret Generation:
```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Testing Configuration:
```bash
# Test JWT token generation
curl -X POST http://localhost:4000/api/auth/login-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:4000/api/auth/login-email \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' &
done
```