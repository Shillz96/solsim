"use client"

import type { ReactNode } from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { GlobalErrorBoundary } from "@/components/error-boundary-enhanced"
import { QueryProvider } from "@/lib/query-provider"
import { PriceStreamProvider } from "@/lib/price-stream-provider"
import { SolanaWalletProvider } from "@/lib/solana-wallet-provider"
import { TradingModeProvider } from "@/lib/trading-mode-context"
import { NotificationProvider } from "@/components/shared/enhanced-notifications"
import { OnboardingProvider } from "@/lib/onboarding-provider"
import { ChatProvider } from "@/lib/contexts/ChatContext"
// PWA features removed for now

interface AppProvidersProps {
  children: ReactNode
}

/**
 * Unified App Providers
 * Wraps the entire app with all necessary context providers
 * Maintains proper provider hierarchy for optimal functionality
 *
 * Provider Order (outer to inner):
 * 1. GlobalErrorBoundary - Catches all React errors
 * 2. QueryProvider - React Query for data fetching
 * 3. SolanaWalletProvider - Wallet connectivity
 * 4. TradingModeProvider - Paper/Real trading mode management
 * 5. PriceStreamProvider - Real-time price updates
 * 6. ChatProvider - Real-time chat functionality
 * 7. NotificationProvider - Enhanced notification system
 * 8. OnboardingProvider - Product tour and user onboarding
 * 9. ThemeProvider - LIGHT MODE ONLY (Mario theme!)
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <GlobalErrorBoundary>
      <QueryProvider>
        <SolanaWalletProvider>
          <TradingModeProvider>
            <PriceStreamProvider>
              <ChatProvider>
                <NotificationProvider>
                  <OnboardingProvider>
                    <ThemeProvider
                      attribute="class"
                      forcedTheme="light"
                      disableTransitionOnChange
                    >
                      {children}
                    </ThemeProvider>
                  </OnboardingProvider>
                </NotificationProvider>
              </ChatProvider>
            </PriceStreamProvider>
          </TradingModeProvider>
        </SolanaWalletProvider>
      </QueryProvider>
    </GlobalErrorBoundary>
  )
}

