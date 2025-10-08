# SolSim Backend API

Backend API server for the SolSim Solana trading simulator platform. Built with Node.js, Express, TypeScript, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL database
- Redis (optional, for caching and rate limiting)

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Build the project
npm run build

# Start the server
npm start
```

### Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## 📁 Project Structure

```
backend/
├── src/                    # Source code
│   ├── config/            # Configuration files
│   ├── lib/               # Core libraries and utilities
│   ├── middleware/        # Express middleware
│   ├── routes/            # API route handlers
│   │   └── v1/           # API v1 routes
│   ├── services/         # Business logic services
│   ├── shared/           # Shared types and utilities
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── index.ts          # Main entry point
├── prisma/               # Database schema and migrations
├── scripts/              # Utility scripts
├── tests/                # Test files
└── dist/                 # Compiled JavaScript output
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available configuration options. Key variables:

#### Server
- `NODE_ENV` - Environment (development/production)
- `PORT` - API server port (default: 4002)
- `FRONTEND_ORIGIN` - CORS origin for frontend

#### Database
- `DATABASE_URL` - PostgreSQL connection string

#### Redis (Optional)
- `REDIS_URL` - Redis connection string for caching

#### Authentication
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - Token expiration time

#### API Keys (Optional - Enhanced Features)
- `BIRDEYE_API_KEY` - Birdeye API for price data
- `HELIUS_API_KEY` - Helius API for Solana data
- `COINGECKO_API_KEY` - CoinGecko API for price data
- `SOLANA_TRACKER_API_KEY` - Solana Tracker API

## 🛣️ API Routes

### Authentication (`/api/v1/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /me` - Get current user

### Trading (`/api/v1/trades`)
- `POST /buy` - Execute buy order
- `POST /sell` - Execute sell order
- `GET /history` - Get trade history

### Portfolio (`/api/v1/portfolio`)
- `GET /` - Get user portfolio
- `GET /holdings` - Get current holdings
- `GET /performance` - Get portfolio performance

### Market Data (`/api/v1/market`)
- `GET /trending` - Get trending tokens
- `GET /price/:tokenAddress` - Get token price
- `GET /search` - Search tokens

### Leaderboard (`/api/v1/leaderboard`)
- `GET /` - Get top traders

### User (`/api/v1/user`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update profile
- `POST /avatar` - Upload avatar

### Monitoring (`/api/v1/monitoring`)
- `GET /health` - Health check
- `GET /metrics` - Performance metrics

## 🔐 Security

### Implemented Security Measures

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Request throttling
- **Input Validation** - Request sanitization
- **JWT Authentication** - Secure token-based auth
- **SQL Injection Prevention** - Parameterized queries via Prisma
- **XSS Protection** - HTML sanitization

### Rate Limits

- API: 200 requests/minute
- Authentication: 10 requests/15 minutes
- Read operations: 200 requests/minute
- Write operations: 100 requests/minute

## 🗄️ Database

### Schema Management

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Create new migration
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

### Models

- **User** - User accounts and authentication
- **Trade** - Trade history records
- **Holding** - Current token holdings
- **Token** - Token metadata and market data
- **TransactionHistory** - FIFO tax lot tracking

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- <filename>

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Categories

- **Unit Tests** - Service logic tests
- **Integration Tests** - API endpoint tests
- **FIFO Tests** - Tax calculation tests

## 📊 Monitoring

### Health Check

```bash
GET /api/v1/monitoring/health
```

Returns:
- Database status
- Memory usage
- Uptime
- Response time

### Performance Metrics

```bash
GET /api/v1/monitoring/metrics
```

Returns Prometheus-compatible metrics for:
- HTTP requests
- Database queries
- Cache operations
- External API calls

## 🔄 Services

### Core Services

- **PriceService** - Token price fetching and caching
- **TradingService** - Trade execution logic
- **PortfolioService** - Portfolio calculations
- **MetadataService** - Token metadata fetching
- **TrendingService** - Trending token calculations
- **TransactionService** - FIFO tax lot tracking

### External APIs

- DexScreener - Primary price source
- Birdeye - Alternative price source
- CoinGecko - Fallback price source
- Helius - Solana blockchain data

## 🚢 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure secure `JWT_SECRET` (32+ chars)
- [ ] Set up PostgreSQL database
- [ ] Configure Redis (recommended)
- [ ] Add API keys for price services
- [ ] Set `FRONTEND_ORIGIN` to production URL

### Deployment Platforms

Configured for:
- Railway (via `railway.toml`)
- Vercel (via `vercel.json`)
- Nixpacks (via `nixpacks.toml`)

## 🐛 Debugging

### Enable Debug Logging

```bash
# Development
NODE_ENV=development npm run dev

# Production (with debug logs)
LOG_LEVEL=debug npm start
```

### Common Issues

**Database Connection**
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check network connectivity

**Price Data Not Loading**
- Verify API keys are set
- Check API rate limits
- Review external API status

**Authentication Errors**
- Verify `JWT_SECRET` is set
- Check token expiration
- Review auth middleware logs

## 📝 Scripts

### Utility Scripts

```bash
# Verify environment variables
node scripts/verify-env.mjs

# Migrate to FIFO accounting
npm run tsx scripts/migrate-to-fifo.ts

# Backfill token metadata
npm run tsx src/scripts/backfillMetadata.ts
```

See `scripts/README.md` for more details.

## 🤝 Contributing

### Code Style

- TypeScript strict mode disabled for flexibility
- ESLint for linting
- Prettier for formatting
- Conventional commits recommended

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with tests
3. Run linter and tests
4. Submit PR with description

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- Frontend: `../frontend`
- Documentation: See individual service files for detailed docs
- API Docs: Available at `/api/docs` (if enabled)

## 📞 Support

For issues and questions:
- Check existing documentation
- Review test files for usage examples
- Open an issue on GitHub

