# SolSim Dual-Tier Signup System Integration Plan

## Overview
This plan outlines the integration of dual-tier signup system and role-based access control into the existing SolSim trading simulator. The implementation leverages the current authentication infrastructure while adding Solana wallet connectivity and $SIM token verification for premium tier benefits.

## Current State Analysis

### ✅ Existing Strengths
- **Unified Authentication**: Robust JWT auth with development bypass (`src/lib/unifiedAuth.ts`)
- **PostgreSQL Database**: User model with virtual SOL balance and Solana wallet field
- **Frontend Auth Components**: Auth wrapper, service, and modal components
- **Rate Limiting & Security**: API protection and error handling infrastructure
- **Real-time Features**: WebSocket price streaming and trading simulation

### ⚠️ Missing Components
- Solana wallet adapter integration
- $SIM token balance verification
- Tier-based access control middleware
- Wallet connection UI components
- Tiered user registration flow

## 1. Project Setup & Dependencies

### Backend Dependencies
- [ ] **Install Solana Web3.js Library**
  - Add `@solana/web3.js` for RPC connections and wallet verification
  - Add `@solana/spl-token` for SPL token balance queries
  - Configure Solana RPC endpoints in environment variables

### Frontend Dependencies  
- [ ] **Install Solana Wallet Adapter**
  - Add `@solana/wallet-adapter-base`
  - Add `@solana/wallet-adapter-react`
  - Add `@solana/wallet-adapter-react-ui`
  - Add `@solana/wallet-adapter-wallets` (Phantom, Solflare, etc.)
  - Add `@solana/web3.js` for frontend wallet interactions

### Environment Configuration
- [ ] **Update Environment Variables**
  - `SOLANA_RPC_ENDPOINT` for mainnet/devnet connections
  - `SIM_TOKEN_MINT_ADDRESS` for $SIM token contract
  - `MINIMUM_SIM_TOKENS` for premium tier threshold
  - `SOLANA_NETWORK` (mainnet-beta/devnet) configuration

## 2. Database Schema Extensions

### User Model Enhancements
- [ ] **Add Tier System Fields**
  ```prisma
  enum UserTier {
    EMAIL_USER      // 10 SOL, limited features
    WALLET_USER     // Same as email if no $SIM tokens
    SIM_HOLDER      // 100 SOL, premium features
    ADMINISTRATOR   // Platform management access
  }
  
  model User {
    // ... existing fields
    userTier           UserTier    @default(EMAIL_USER)
    walletAddress      String?     // Connected Solana wallet address
    walletVerified     Boolean     @default(false)
    simTokenBalance    Decimal?    // Cached $SIM token balance
    simBalanceUpdated  DateTime?   // Last token balance check
    monthlyConversions Decimal     @default("0") // SOL converted this month
    conversionResetAt  DateTime?   // Monthly limit reset date
    premiumFeatures    String?     @default("[]") // JSON array of enabled features
  }
  ```

### Conversion Tracking
- [ ] **Create Conversion Model**
  ```prisma
  model ConversionHistory {
    id                String   @id @default(uuid())
    userId            String
    virtualSolAmount  Decimal  // Amount of virtual SOL converted
    simTokensReceived Decimal  // Amount of $SIM tokens received
    conversionRate    Decimal  // Rate at time of conversion
    transactionHash   String?  // Solana transaction hash
    status            String   // PENDING, COMPLETED, FAILED
    createdAt         DateTime @default(now())
    
    user User @relation(fields: [userId], references: [id], onDelete: Cascade)
    
    @@index([userId, createdAt(sort: Desc)])
  }
  ```

### Migration Script
- [ ] **Create Database Migration**
  - Generate Prisma migration for new fields
  - Update existing users with EMAIL_USER tier by default
  - Set initial virtual SOL balance based on tier (10 for email, 100 for verified wallets)

## 3. Backend Foundation

### Solana Integration Service
- [ ] **Create Wallet Verification Service** (`src/services/solanaService.ts`)
  ```typescript
  export class SolanaService {
    // Verify wallet ownership through message signing
    async verifyWalletOwnership(walletAddress: string, signature: string, message: string): Promise<boolean>
    
    // Check $SIM token balance for wallet
    async getSimTokenBalance(walletAddress: string): Promise<number>
    
    // Determine user tier based on token holdings
    async calculateUserTier(walletAddress: string): Promise<UserTier>
    
    // Transfer $SIM tokens for conversions
    async transferSimTokens(toWallet: string, amount: number): Promise<string>
  }
  ```

### User Tier Management
- [ ] **Create Tier Management Service** (`src/services/tierService.ts`)
  ```typescript
  export class TierService {
    // Get tier benefits and limits
    getTierBenefits(tier: UserTier): TierBenefits
    
    // Check if user can perform action based on tier
    canPerformAction(userId: string, action: string): Promise<boolean>
    
    // Update user tier based on wallet verification
    updateUserTier(userId: string, walletAddress: string): Promise<User>
    
    // Check monthly conversion limits
    checkConversionLimits(userId: string, amount: number): Promise<boolean>
  }
  ```

### Authentication Middleware Enhancement
- [ ] **Extend Unified Auth** (`src/lib/unifiedAuth.ts`)
  ```typescript
  // Add tier-based access control
  export function requireTier(minimumTier: UserTier) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = getUser(req);
      const userTier = await getTierService().getUserTier(user.id);
      
      if (!hasRequiredTier(userTier, minimumTier)) {
        throw new AuthorizationError('Insufficient tier privileges');
      }
      next();
    };
  }
  
  // Premium feature access middleware
  export function requirePremiumFeature(feature: string) {
    return requireTier(UserTier.SIM_HOLDER);
  }
  ```

## 4. Feature-Specific Backend Implementation

### Wallet Connection Endpoints
- [ ] **Create Wallet Auth Routes** (`src/routes/wallet.ts`)
  ```typescript
  // POST /api/v1/wallet/connect
  // Verify wallet ownership and update user tier
  
  // POST /api/v1/wallet/verify
  // Re-verify $SIM token balance and update tier
  
  // DELETE /api/v1/wallet/disconnect
  // Remove wallet connection and revert to email tier
  
  // GET /api/v1/wallet/balance
  // Get current $SIM token balance
  ```

### Enhanced Registration Endpoints
- [ ] **Update Auth Routes** (`src/routes/auth.ts`)
  ```typescript
  // POST /api/v1/auth/register
  // Support both email-only and wallet+email registration
  
  // POST /api/v1/auth/register-wallet
  // Register with wallet verification and automatic tier assignment
  
  // GET /api/v1/auth/tier-info
  // Get current user tier and benefits
  ```

### Virtual SOL Conversion System
- [ ] **Create Conversion Routes** (`src/routes/conversion.ts`)
  ```typescript
  // POST /api/v1/conversion/quote
  // Get conversion rate and fee calculation
  
  // POST /api/v1/conversion/execute
  // Execute virtual SOL to $SIM conversion
  
  // GET /api/v1/conversion/history
  // Get user's conversion history
  
  // GET /api/v1/conversion/limits
  // Get current month's conversion limits and usage
  ```

### Premium Features API
- [ ] **Create Premium Routes** (`src/routes/premium.ts`)
  ```typescript
  // GET /api/v1/premium/features
  // List available premium features for user's tier
  
  // POST /api/v1/premium/staking/stake
  // Stake $SIM tokens for additional rewards
  
  // POST /api/v1/premium/staking/unstake
  // Unstake $SIM tokens
  
  // GET /api/v1/premium/analytics
  // Advanced trading analytics (premium only)
  ```

## 5. Frontend Foundation

### Solana Wallet Provider Setup
- [ ] **Configure Wallet Adapter** (`app/layout.tsx`)
  ```typescript
  import { WalletProvider } from '@solana/wallet-adapter-react';
  import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
  import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
  
  // Add wallet providers to root layout
  // Configure for mainnet/devnet based on environment
  ```

### Wallet Context Integration
- [ ] **Create Wallet Service** (`lib/wallet-service.ts`)
  ```typescript
  class WalletService {
    // Connect wallet and verify ownership
    async connectWallet(): Promise<{ address: string; signature: string }>
    
    // Check $SIM token balance
    async getSimBalance(address: string): Promise<number>
    
    // Verify user owns wallet through message signing
    async verifyOwnership(address: string): Promise<boolean>
    
    // Disconnect wallet
    async disconnectWallet(): Promise<void>
  }
  ```

### Enhanced Auth Wrapper
- [ ] **Update Auth Wrapper** (`components/auth/auth-wrapper.tsx`)
  ```typescript
  // Add wallet connection state management
  // Integrate tier-based access control
  // Handle wallet verification flow
  // Display tier status and benefits
  ```

## 6. Feature-Specific Frontend Implementation

### Dual Registration Flow
- [ ] **Enhanced Registration Modal** (`components/modals/auth-modal.tsx`)
  ```typescript
  // Add wallet connection option
  // Show tier benefits comparison
  // Handle email-only vs wallet registration
  // Display SOL allocation based on selected method
  ```

### Wallet Connection Components
- [ ] **Wallet Connect Button** (`components/auth/wallet-connect-button.tsx`)
  - Wallet selection dropdown (Phantom, Solflare, etc.)
  - Connection status indicator
  - Wallet address display with copy functionality
  - Tier status badge

- [ ] **Tier Status Display** (`components/auth/tier-status.tsx`)
  - Current tier badge and benefits
  - Upgrade prompt for email users
  - $SIM token balance display
  - Monthly conversion limits status

### Enhanced Navigation
- [ ] **Update Navigation Components**
  - Add tier status indicator to navbar
  - Show wallet connection status
  - Display $SIM token balance
  - Premium features highlighting

### Profile Management
- [ ] **Wallet Profile Section** (`app/profile/wallet-settings.tsx`)
  ```typescript
  // Wallet connection management
  // $SIM token balance display
  // Tier upgrade options
  // Staking interface for premium users
  ```

### Conversion Interface
- [ ] **SOL Conversion Modal** (`components/modals/conversion-modal.tsx`)
  ```typescript
  // Virtual SOL to $SIM conversion calculator
  // Rate display and fee breakdown
  // Monthly limit tracking
  // Transaction history
  ```

### Premium Features UI
- [ ] **Premium Dashboard** (`app/premium/dashboard.tsx`)
  - Advanced analytics charts
  - Staking rewards interface
  - Exclusive feature access
  - VIP status indicators

## 7. Integration & Testing

### Wallet Integration Testing
- [ ] **Test Wallet Connections**
  - Verify multiple wallet adapters (Phantom, Solflare)
  - Test wallet disconnection and reconnection
  - Validate signature verification process
  - Test network switching (mainnet/devnet)

### Tier System Validation
- [ ] **Test Tier Access Controls**
  - Verify email user limitations (10 SOL, 5 SOL/month conversion)
  - Test premium user benefits (100 SOL, 50 SOL/month conversion)
  - Validate tier upgrade/downgrade scenarios
  - Test admin access controls

### Conversion System Testing
- [ ] **Test SOL Conversion Flow**
  - Validate conversion rate calculations
  - Test monthly limit enforcement
  - Verify transaction history tracking
  - Test escrow system for email users

### Error Handling & Edge Cases
- [ ] **Test Error Scenarios**
  - Wallet connection failures
  - Network switching during transactions
  - Invalid $SIM token balances
  - Rate limiting and abuse prevention

## 8. Security & Compliance

### Wallet Security
- [ ] **Implement Security Measures**
  - Message signing for wallet ownership verification
  - Rate limiting on wallet connection attempts
  - Secure storage of wallet addresses
  - Transaction signature validation

### Access Control Security
- [ ] **Tier-Based Security**
  - Middleware validation for premium features
  - API endpoint protection based on user tier
  - Conversion limit enforcement
  - Anti-abuse measures for virtual SOL farming

### Data Privacy
- [ ] **Privacy Compliance**
  - Secure storage of wallet addresses
  - Option to make wallet address private
  - GDPR compliance for wallet data
  - Clear privacy policy for wallet connections

## 9. Documentation

### API Documentation
- [ ] **Update API Documentation**
  - Document wallet connection endpoints
  - Add tier system API reference
  - Conversion API documentation
  - Premium features API guide

### User Documentation
- [ ] **Create User Guides**
  - Wallet connection tutorial
  - Tier system explanation
  - Conversion process guide
  - Premium features overview

### Developer Documentation
- [ ] **Technical Documentation**
  - Wallet integration architecture
  - Tier system implementation
  - Database schema changes
  - Testing procedures

## 10. Deployment & Monitoring

### Environment Configuration
- [ ] **Production Setup**
  - Configure mainnet Solana RPC endpoints
  - Set production $SIM token contract address
  - Configure tier thresholds and conversion rates
  - Set up wallet connection security parameters

### Monitoring & Analytics
- [ ] **Implementation Monitoring**
  - Track wallet connection success rates
  - Monitor tier distribution and upgrades
  - Track conversion volume and patterns
  - Alert on failed wallet verifications

### Performance Optimization
- [ ] **Optimize Wallet Operations**
  - Cache $SIM token balance queries
  - Batch wallet verification requests
  - Optimize tier calculation queries
  - Implement efficient conversion processing

## Success Metrics

### User Adoption Metrics
- **Wallet Connection Rate**: Target 40% of new users connecting wallets
- **Tier Upgrade Rate**: Target 25% of email users upgrading to premium
- **Premium Retention**: Target 85% monthly retention for premium users
- **Conversion Volume**: Track virtual SOL to $SIM conversion trends

### Technical Performance Metrics
- **Wallet Connection Time**: Target <3 seconds for successful connections
- **Tier Verification Speed**: Target <2 seconds for $SIM balance checks
- **API Response Times**: Maintain <500ms for tier-protected endpoints
- **System Uptime**: Target 99.9% uptime for wallet-related services

## Risk Mitigation

### Technical Risks
- **Solana Network Issues**: Implement retry logic and fallback RPC endpoints
- **Wallet Adapter Compatibility**: Regular testing with popular wallet updates
- **$SIM Token Contract Changes**: Flexible configuration for contract updates
- **Rate Limiting Bypass**: Comprehensive abuse detection and prevention

### Business Risks
- **Conversion Rate Volatility**: Dynamic rate calculation with safeguards
- **Premium Feature Adoption**: A/B testing for feature engagement
- **Token Price Fluctuations**: Protected conversion limits and rate adjustments
- **Regulatory Compliance**: Legal review of conversion mechanisms

## Phase Implementation Timeline

### Phase 1: Foundation (Week 1-2)
- Install dependencies and configure wallet adapters
- Extend database schema with tier system
- Create basic Solana integration service
- Implement wallet connection UI components

### Phase 2: Core Features (Week 3-4)
- Build tier management system
- Implement enhanced registration flow
- Create conversion system backend
- Develop premium features access control

### Phase 3: Integration & Polish (Week 5-6)
- Complete frontend wallet integration
- Implement conversion UI
- Add premium features dashboard
- Comprehensive testing and bug fixes

### Phase 4: Security & Launch (Week 7-8)
- Security audit and penetration testing
- Performance optimization
- Documentation completion
- Production deployment and monitoring setup

This plan leverages your existing robust authentication infrastructure while seamlessly adding the dual-tier system and Solana wallet integration. The phased approach ensures minimal disruption to current functionality while building toward the complete premium ecosystem outlined in your PRD.