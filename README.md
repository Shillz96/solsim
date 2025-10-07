# SolSim - Solana Trading Simulator

A full-stack web application for simulating cryptocurrency trading on the Solana blockchain with real-time market data, portfolio management, and social features.

## 🚀 Features

### Trading & Portfolio Management
- **Real-time Trading Simulation**: Execute virtual trades with live market data
- **Dual-Tier Signup System**: Email signup (10 SOL) or wallet connection with $SIM token verification (100 SOL)
- **Portfolio Tracking**: Monitor your virtual portfolio performance with detailed analytics
- **Position Management**: Track open positions, profit/loss, and trade history
- **Virtual to Real Conversion**: Convert earned virtual SOL into real $SIM tokens
- **Risk Management**: Built-in risk assessment and position sizing tools

### Market Data & Analysis
- **Live Market Data**: Real-time price feeds for SOL and other Solana tokens
- **Trending Tokens**: Discover hot tokens with trend analysis and scoring
- **Price Charts**: Interactive charts with technical indicators
- **Market Statistics**: Comprehensive market cap, volume, and price change data

### Social Features
- **Leaderboard**: Compete with other traders and track rankings
- **User Profiles**: Customize your profile and showcase trading achievements
- **Trade Sharing**: Share successful trades and strategies

### Modern Tech Stack
- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js with Express, TypeScript, Prisma ORM
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: JWT-based secure authentication
- **Real-time**: WebSocket connections for live data updates
- **Caching**: Redis-based caching for optimal performance
- **Monitoring**: Comprehensive logging and performance monitoring

## 📋 Prerequisites

Before you begin, ensure you have installed:
- **Node.js** (v18 or higher)
- **npm** or **pnpm**
- **Git**

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/solsim.git
cd solsim
```

### 2. Backend Setup
```bash
cd backend
npm install

# Copy environment variables
cp .env.example .env

# Set up the database
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed

# Start the backend server
npm run dev
```

The backend will be available at `http://localhost:4002`

### 3. Frontend Setup
```bash
cd frontend
npm install

# Copy environment variables
cp .env.example .env.local

# Start the frontend development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🔧 Environment Variables

### Backend (.env)
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-jwt-secret-key"
PORT=4002
NODE_ENV=development
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
REDIS_URL="redis://localhost:6379"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:4002
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm test                 # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

### Backend Tests
```bash
cd backend
npm test                # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
```

## 📦 Building for Production

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
npm start
```

## 🔄 Database Management

### Prisma Commands
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Check migration status
npx prisma migrate status
```

## 📱 API Documentation

The API provides the following main endpoints:

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `POST /api/v1/auth/logout` - User logout

### Trading
- `POST /api/v1/trades` - Execute a trade
- `GET /api/v1/trades/history` - Get trade history
- `GET /api/v1/trades/recent` - Get recent trades
- `GET /api/v1/trades/stats` - Get trading statistics

### Portfolio
- `GET /api/v1/portfolio` - Get portfolio summary
- `GET /api/v1/portfolio/performance` - Get performance data
- `GET /api/v1/portfolio/positions` - Get current positions

### Market Data
- `GET /api/v1/market/trending` - Get trending tokens
- `GET /api/v1/market/price/:address` - Get token price
- `POST /api/v1/market/prices` - Get multiple token prices
- `GET /api/v1/market/search` - Search tokens

### User Management
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update user profile
- `POST /api/v1/users/avatar` - Upload user avatar

## 🏗️ Project Structure

```
solsim/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic services
│   │   ├── middleware/     # Express middleware
│   │   ├── lib/           # Utility libraries
│   │   └── types/         # TypeScript type definitions
│   ├── prisma/            # Database schema and migrations
│   ├── tests/             # Backend tests
│   └── scripts/           # Development scripts
└── frontend/              # Next.js frontend application
    ├── app/               # Next.js app router pages
    ├── components/        # React components
    ├── lib/              # Frontend utilities and services
    ├── hooks/            # Custom React hooks
    ├── __tests__/        # Frontend tests
    └── public/           # Static assets
```

## 🚀 Deployment

### Using Docker (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Manual Deployment
1. Build both frontend and backend for production
2. Set up production environment variables
3. Configure your web server (nginx recommended)
4. Set up SSL certificates
5. Configure database (PostgreSQL for production)
6. Set up Redis for caching

## 🔧 Performance Optimization

### Built-in Optimizations
- **API Caching**: Redis-based caching for market data and user sessions
- **Database Optimization**: Efficient queries with Prisma ORM
- **Frontend Bundling**: Next.js optimization with code splitting
- **Image Optimization**: Next.js Image component with WebP support
- **Static Generation**: Pre-rendered pages for better performance

### Monitoring
- **Error Logging**: Comprehensive error tracking and logging
- **Performance Metrics**: Real-time performance monitoring
- **Health Checks**: Built-in health check endpoints
- **Rate Limiting**: API rate limiting for stability

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: Protection against API abuse
- **CORS Configuration**: Secure cross-origin resource sharing
- **Security Headers**: Protection against common web vulnerabilities
- **SQL Injection Protection**: Prisma ORM prevents SQL injection attacks

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-username/solsim/issues) page
2. Create a new issue if your problem isn't already reported
3. Provide detailed information about your environment and the issue

## 🔮 Roadmap

### Upcoming Features
- [ ] $SIM token staking rewards for premium users
- [ ] Advanced charting with TradingView integration
- [ ] Social trading features (copy trading)
- [ ] Quest and achievement system with $SIM rewards
- [ ] Advanced portfolio analytics for token holders
- [ ] Mobile app (React Native)
- [ ] Options trading simulation
- [ ] Educational trading courses
- [ ] API for third-party integrations

### Recent Updates
- ✅ Fixed React 19 compatibility issues
- ✅ Improved Jest test configuration
- ✅ Enhanced error boundary handling
- ✅ Optimized build process
- ✅ Added comprehensive monitoring and logging

---

**Happy Trading! 📈**

*Remember: This is a simulation platform for educational purposes. Virtual trading only - earn real $SIM tokens through successful simulation trading.*