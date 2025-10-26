# 1UP SOL - Solana Paper Trading Game

A gamified Solana paper trading platform with real-time price tracking, XP progression, leaderboards, and Mario-themed UI.

<!-- Trigger Vercel deployment -->

**Live**: [oneupsol.fun](https://oneupsol.fun)

---

## 🎮 Features

### Trading & Portfolio
- **Paper trading** with real-time Solana token prices
- **FIFO position tracking** with accurate PnL calculations
- **Live price updates** via Helius WebSocket
- **Portfolio analytics** with profit/loss tracking
- **Trade history** with detailed performance metrics

### Gamification
- **XP system** - Earn experience points from trading activity
- **Level progression** - 20 Mario-themed levels (Goomba Trader → Legendary Luigi)
- **Leaderboards** - Compete with other traders globally
- **Achievements** - Unlock milestones and earn bonus XP

### Data & Discovery
- **Trending tokens** - Real-time hot coins and market movers
- **Token search** - Find any Solana token by name or mint address
- **Price charts** - DexScreener integration with custom overlays
- **KOL wallet tracking** - Follow successful traders (copy trading)

### UI/UX
- **Mario theme** - Retro game aesthetic with vibrant colors
- **Light mode only** - Bright, colorful, nostalgic Nintendo-inspired design
- **Responsive** - Works on desktop, tablet, and mobile
- **Performance** - Optimized with React Query, Redis caching, and GPU acceleration

---

## 🏗️ Architecture

### Backend
- **Fastify** - High-performance web framework
- **Prisma** - Type-safe ORM with PostgreSQL
- **Redis** - Caching and real-time pub/sub
- **Helius** - Solana RPC + WebSocket for price streaming
- **DexScreener** - Token metadata and price data

### Frontend
- **Next.js 14+** - App Router with Server Components
- **TanStack Query** - Server state management
- **Tailwind v4** - CSS-first theming with OKLCH colors
- **Display-P3** - Wide-gamut color support for modern displays
- **View Transitions API** - Smooth page transitions (Chrome 111+, Safari 18+)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Helius API key ([helius.dev](https://helius.dev))

### Installation

#### 1. Clone & Install
```bash
git clone https://github.com/your-org/solsim.git
cd solsim
npm install
```

#### 2. Setup Environment Variables
Create `.env` files for backend and frontend:

**Backend** (see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)):
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
```

**Frontend**:
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your API URL
```

#### 3. Setup Database
```bash
cd backend
npm run prisma:migrate
npm run db:seed  # Optional: seed with test data
```

#### 4. Run Development Servers
Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Backend runs on http://localhost:4000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:3000
```

#### 5. Open in Browser
Visit [http://localhost:3000](http://localhost:3000)

---

## 📖 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Fast setup guide
- **[CLAUDE.md](./CLAUDE.md)** - AI assistant development guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture deep dive
- **[WORKFLOW.md](./WORKFLOW.md)** - Development workflow and Git branching
- **[ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)** - Complete environment configuration
- **[frontend/MARIO_THEME_DESIGN_SYSTEM.md](./frontend/MARIO_THEME_DESIGN_SYSTEM.md)** - Mario theme design guidelines

---

## 🎨 Mario Theme

1UP SOL features a complete Mario-themed design system:

- **Color Palette**: Mario Red, Luigi Green, Star Yellow, Coin Gold, Sky Blue, Pipe Green
- **Typography**: Luckiest Guy pixel font for headers, system fonts for readability
- **Components**: Bold 3-4px borders, 3D block shadows, flat design aesthetic
- **OKLCH Colors**: Perceptually uniform colors with Display-P3 wide gamut support
- **Animations**: Coin bounces, level-up pops, floating power-ups

See [frontend/MARIO_THEME_DESIGN_SYSTEM.md](./frontend/MARIO_THEME_DESIGN_SYSTEM.md) for complete design guidelines.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend
```

---

## 🚢 Deployment

### Automated (Recommended)
Link your GitHub repository to Railway (backend) and Vercel (frontend) for automatic deployments.

See [GITHUB_DEPLOYMENT_SETUP.md](./GITHUB_DEPLOYMENT_SETUP.md) for complete setup.

### Manual
```bash
# Deploy backend to Railway
npm run deploy:backend

# Deploy frontend to Vercel
npm run deploy:frontend
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

---

## 🙏 Credits

- **Solana** - Blockchain infrastructure
- **Helius** - Real-time price data and RPC
- **DexScreener** - Token metadata and charts
- **Jupiter** - Price aggregation
- **Nintendo** - Inspiration for Mario theme aesthetic

---

**Built with ❤️ by the 1UP SOL team**

Level up your trading skills! 🍄⭐💰
