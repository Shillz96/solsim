# VirtualSol Frontend

React/Next.js frontend for [VirtualSol.fun](https://virtualsol.fun), a Solana paper trading simulator. Practice trading Solana tokens with virtual SOL in a risk-free environment.

## 🚀 Features

- **Modern Trading Interface** - Intuitive buy/sell interface with real-time price updates
- **Portfolio Dashboard** - Track positions, PnL, and trading performance with interactive charts
- **Real-time Price Feeds** - Live token prices via WebSocket connections
- **Responsive Design** - Mobile-first approach with desktop optimization
- **Authentication System** - Support for email/password and Solana wallet sign-in
- **Leaderboards** - Competitive trading rankings and social features
- **Token Discovery** - Search and explore trending Solana tokens
- **Trade History** - Detailed transaction history and analytics
- **Reward System** - Earn and claim SIM tokens based on performance

## 🛠 Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
- **UI Framework**: [React 18](https://reactjs.org/) with TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom components
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) component library
- **State Management**: [React Query (TanStack Query)](https://tanstack.com/query) for server state
- **Real-time**: WebSocket integration for live price updates
- **Wallet Integration**: [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- **Charts**: [Recharts](https://recharts.org/) for data visualization
- **Forms**: [React Hook Form](https://react-hook-form.com/) with Zod validation
- **PWA**: Service Worker support for offline functionality

## 📋 Prerequisites

- Node.js 18+ and npm
- Running VirtualSol backend API server

## ⚡ Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd frontend
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```bash
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# Optional: Analytics and monitoring
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🏗 Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Homepage
│   ├── portfolio/         # Portfolio pages
│   ├── trade/             # Trading pages
│   ├── leaderboard/       # Leaderboard pages
│   └── profile/           # User profile pages
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── trading/          # Trading-specific components
│   ├── portfolio/        # Portfolio components
│   ├── leaderboard/      # Leaderboard components
│   ├── modals/           # Modal dialogs
│   ├── navigation/       # Navigation components
│   └── shared/           # Shared utility components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── api.ts           # API client
│   ├── types/           # TypeScript type definitions
│   ├── utils.ts         # Utility functions
│   └── use-price-stream.ts # WebSocket price stream
├── public/              # Static assets
└── styles/              # Additional stylesheets
```

## 🔧 Key Components

### Trading System
- **TradingPanel** - Main trading interface with buy/sell functionality
- **TradeHistory** - Transaction history with filtering and pagination
- **TokenSearch** - Search and select tokens for trading

### Portfolio Management
- **ActivePositions** - Current holdings with real-time values
- **PortfolioChart** - Performance visualization over time
- **PnLCard** - Profit/loss summary with key metrics

### Real-time Features
- **PriceStreamProvider** - WebSocket price stream context
- **usePriceStream** - Hook for real-time price updates
- **LivePriceDisplay** - Real-time price components

### Authentication
- **AuthModal** - Email/password and wallet authentication
- **AuthGuard** - Protected route wrapper
- **useAuth** - Authentication state management

## 🌐 API Integration

The frontend communicates with the backend via:

### REST API (`lib/api.ts`)
- Trade execution
- Portfolio data
- User authentication  
- Token search and metadata
- Leaderboard data
- Reward claims

### WebSocket (`lib/use-price-stream.ts`)
- Real-time token price updates
- Subscription management
- Automatic reconnection handling

### Type Safety
All API responses are typed using TypeScript interfaces in `lib/types/backend.ts`, ensuring type safety across the application.

## 🎨 Styling and Theming

### Tailwind CSS
The project uses Tailwind CSS for styling with custom configuration:

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build
```

### Component System
Built on shadcn/ui components with customization:
- Consistent design tokens
- Dark/light theme support
- Responsive breakpoints
- Accessible components

## 📱 Responsive Design

The application is built mobile-first with breakpoints:
- **Mobile**: < 768px - Optimized for touch interfaces
- **Tablet**: 768px - 1024px - Enhanced navigation
- **Desktop**: > 1024px - Full feature set with sidebars

## 🔐 Authentication Flow

### Email/Password
1. User enters credentials
2. Frontend calls `/api/auth/login-email`
3. JWT token stored in localStorage
4. Protected routes accessible

### Solana Wallet
1. User connects wallet (Phantom, Solflare, etc.)
2. Frontend requests nonce from `/api/auth/wallet/nonce`
3. User signs message with wallet
4. Signature verified via `/api/auth/wallet/verify`
5. User authenticated with wallet address

## 📊 Performance Optimizations

### Code Splitting
- Automatic route-based code splitting
- Dynamic imports for heavy components
- Lazy loading of non-critical features

### State Management
- React Query for efficient server state caching
- Optimistic updates for better UX
- Background refetching for fresh data

### Real-time Updates
- WebSocket connection pooling
- Selective subscription management
- Efficient re-render prevention

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure
- **Unit Tests** - Component logic and utilities
- **Integration Tests** - API client and hooks
- **E2E Tests** - Critical user flows (planned)

## 🚀 Build and Deployment

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Static Export (if needed)
```bash
npm run build
npm run export
```

### Environment Variables

Production environment variables:

```bash
NEXT_PUBLIC_API_URL=https://api.virtualsol.fun
NEXT_PUBLIC_WS_URL=wss://api.virtualsol.fun
NEXT_PUBLIC_ANALYTICS_ID=production-analytics-id
```

## 🔧 Configuration Files

- `next.config.mjs` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `components.json` - shadcn/ui configuration
- `tsconfig.json` - TypeScript configuration
- `.env.local` - Local environment variables

## 🚀 PWA Features

The application includes Progressive Web App features:
- Service worker for offline functionality
- App manifest for installation
- Caching strategies for static assets
- Background sync for critical data

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and add tests
4. Ensure all tests pass: `npm test`
5. Check TypeScript types: `npm run type-check`
6. Format code: `npm run format`  
7. Submit a pull request

### Code Standards
- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for code formatting
- Consistent naming conventions
- Component documentation

## 📄 License

See LICENSE file for details.

## 🆘 Support

For issues and questions:
- Check existing GitHub issues
- Create detailed bug reports
- Join our Discord community
- Review documentation and API reference
