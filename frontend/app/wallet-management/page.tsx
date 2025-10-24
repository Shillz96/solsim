'use client';

import { WalletManagement } from '@/components/portfolio/wallet-management';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Wallet2, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Wallet Management Page
 * 
 * Comprehensive wallet management interface featuring:
 * - View all wallets with balances
 * - Import external wallets
 * - Export private keys
 * - Transfer funds between wallets
 * - Track P&L across wallets
 * - Set active wallet
 * - Mario-themed styling
 */
export default function WalletManagementPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Auth check
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Alert className="mario-card border-4 border-mario-red-500 bg-mario-red-50">
            <Lock className="h-5 w-5 text-mario-red-600" />
            <AlertDescription className="text-mario-red-800 font-medium">
              Please log in to access wallet management
            </AlertDescription>
          </Alert>
          <div className="mt-6 flex justify-center">
            <Button
              onClick={() => router.push('/')}
              className="mario-btn bg-star-yellow-500 text-pipe-900 hover:bg-star-yellow-400 shadow-mario font-bold border-3 border-pipe-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-pipe-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-star-yellow-400 via-coin-yellow-400 to-star-yellow-400 border-b-4 border-pipe-700 shadow-mario">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="border-3 border-pipe-700 bg-white hover:bg-pipe-50 shadow-[3px_3px_0_rgba(0,0,0,1)]"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="font-mario text-2xl md:text-3xl text-pipe-900 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.25)] flex items-center gap-2">
                  <Wallet2 className="h-7 w-7" />
                  Wallet Management
                </h1>
                <p className="text-pipe-700 text-sm md:text-base mt-1">
                  Manage your wallets, transfer funds, and track performance
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <WalletManagement />
      </div>

      {/* Info Footer */}
      <div className="container mx-auto px-4 pb-8">
        <div className="mario-card bg-gradient-to-br from-pipe-100 to-pipe-50 border-4 border-pipe-300 shadow-mario">
          <div className="p-6 space-y-3">
            <h3 className="font-mario text-lg text-pipe-900">📋 Wallet Management Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-pipe-700">
              <div className="flex items-start gap-2">
                <span className="text-luigi-green-600 font-bold">✓</span>
                <div>
                  <strong className="text-pipe-900">Multiple Wallets</strong>
                  <p className="text-xs mt-1">Create and manage multiple wallets for different trading strategies</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-luigi-green-600 font-bold">✓</span>
                <div>
                  <strong className="text-pipe-900">Import/Export</strong>
                  <p className="text-xs mt-1">Import external wallets or export private keys securely</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-luigi-green-600 font-bold">✓</span>
                <div>
                  <strong className="text-pipe-900">Fund Transfers</strong>
                  <p className="text-xs mt-1">Transfer SOL between your wallets instantly</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-luigi-green-600 font-bold">✓</span>
                <div>
                  <strong className="text-pipe-900">Balance Tracking</strong>
                  <p className="text-xs mt-1">Monitor total balance across all your wallets</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
