"use client"

import type { ReactNode } from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { GlobalErrorBoundary } from "@/components/error-boundary-enhanced"
import { QueryProvider } from "@/lib/query-provider"
import { PriceStreamProvider } from "@/lib/price-stream-provider"
import { SolanaWalletProvider } from "@/lib/solana-wallet-provider"
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
 * 4. PriceStreamProvider - Real-time price updates
 * 5. ThemeProvider - Dark/light mode theming
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <GlobalErrorBoundary>
      <QueryProvider>
        <SolanaWalletProvider>
          <PriceStreamProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </PriceStreamProvider>
        </SolanaWalletProvider>
      </QueryProvider>
    </GlobalErrorBoundary>
  )
}

