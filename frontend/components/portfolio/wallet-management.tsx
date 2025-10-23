'use client';

/**
 * Wallet Management Component
 * 
 * Comprehensive wallet management for portfolio page.
 * Features full Mario theme with:
 * - Bold borders (border-3, border-4)
 * - Mario cards with shadow-mario
 * - Mario color palette (mario-red, luigi-green, pipe-*, star-yellow, coin-yellow)
 * - Pixel font for headers
 * - 3D block shadows
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Wallet2,
  Plus,
  Download,
  ArrowRightLeft,
  Edit2,
  KeyRound,
  Trash2,
  Check,
  Star,
  AlertTriangle,
} from 'lucide-react';
import { ImportWalletModal } from '@/components/modals/import-wallet-modal';
import { TransferFundsModal } from '@/components/modals/transfer-funds-modal';
import { ExportPrivateKeyModal } from '@/components/modals/export-private-key-modal';
import { formatNumber } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';

interface Wallet {
  id: string;
  name: string;
  walletType: 'PLATFORM_GENERATED' | 'IMPORTED';
  address: string;
  balance: string;
  isActive: boolean;
  createdAt: string;
  hasEncryptedKey?: boolean;
}

export function WalletManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showImportModal, setShowImportModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExportKeyModal, setShowExportKeyModal] = useState(false);
  const [selectedWalletForExport, setSelectedWalletForExport] = useState<string | null>(null);
  const [transferFromWallet, setTransferFromWallet] = useState<string | undefined>();

  // Fetch wallets
  const { data: wallets = [], isLoading, error } = useQuery<Wallet[]>({
    queryKey: ['wallets', user?.id],
    queryFn: () => (user?.id ? api.getUserWallets(user.id) : Promise.resolve([])),
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const handleCreateWallet = async () => {
    if (!user?.id) return;

    const walletName = prompt('Enter wallet name:', `Wallet ${wallets.length + 1}`);
    if (!walletName) return;

    try {
      await api.createWallet(user.id, walletName);
      await queryClient.invalidateQueries({ queryKey: ['wallets', user.id] });

      toast({
        title: '🎉 Wallet Created!',
        description: `${walletName} has been created`,
      });
    } catch (error: any) {
      console.error('Failed to create wallet:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create wallet',
        variant: 'destructive',
      });
    }
  };

  const handleSetActive = async (walletId: string) => {
    if (!user?.id) return;

    try {
      await api.setActiveWallet(user.id, walletId);
      await queryClient.invalidateQueries({ queryKey: ['wallets', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['portfolio', user.id] });

      const wallet = wallets.find(w => w.id === walletId);
      toast({
        title: '✅ Active Wallet Changed',
        description: `Now using ${wallet?.name}`,
      });
    } catch (error: any) {
      console.error('Failed to set active wallet:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to set active wallet',
        variant: 'destructive',
      });
    }
  };

  const handleRename = async (walletId: string, currentName: string) => {
    if (!user?.id) return;

    const newName = prompt('Enter new wallet name:', currentName);
    if (!newName || newName === currentName) return;

    try {
      await api.renameWallet(user.id, walletId, newName);
      await queryClient.invalidateQueries({ queryKey: ['wallets', user.id] });

      toast({
        title: '✏️ Wallet Renamed',
        description: `Renamed to "${newName}"`,
      });
    } catch (error: any) {
      console.error('Failed to rename wallet:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to rename wallet',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (walletId: string, walletName: string) => {
    if (!user?.id) return;

    if (!confirm(`Are you sure you want to delete "${walletName}"?\n\nThis action cannot be undone. Make sure the wallet balance is 0 before deleting.`)) {
      return;
    }

    try {
      await api.deleteWallet(user.id, walletId);
      await queryClient.invalidateQueries({ queryKey: ['wallets', user.id] });

      toast({
        title: '🗑️ Wallet Deleted',
        description: `${walletName} has been removed`,
      });
    } catch (error: any) {
      console.error('Failed to delete wallet:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete wallet',
        variant: 'destructive',
      });
    }
  };

  const handleExportKey = (walletId: string) => {
    setSelectedWalletForExport(walletId);
    setShowExportKeyModal(true);
  };

  const handleTransfer = (fromWalletId: string) => {
    setTransferFromWallet(fromWalletId);
    setShowTransferModal(true);
  };

  // Calculate total balance
  const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance), 0);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-pipe-300 border-t-mario-red-500"></div>
        <p className="mt-4 text-pipe-600 font-medium">Loading wallets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4 border-3 border-mario-red-500">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load wallets. Please try again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mario text-2xl text-pipe-900 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
            My Wallets
          </h2>
          <p className="text-pipe-600 mt-1">
            Manage your wallets and transfer funds
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCreateWallet}
            className="mario-btn bg-star-yellow-500 text-pipe-900 hover:bg-star-yellow-400 shadow-mario font-bold border-3 border-pipe-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Wallet
          </Button>
          <Button
            onClick={() => setShowImportModal(true)}
            className="mario-btn bg-mario-red-500 text-white hover:bg-mario-red-600 shadow-mario font-bold border-3 border-pipe-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Import Wallet
          </Button>
        </div>
      </div>

      {/* Total Balance Card */}
      <div className="mario-card bg-gradient-to-br from-coin-yellow-400 to-coin-yellow-500 border-4 border-pipe-700 shadow-mario">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pipe-700 font-medium text-sm uppercase">Total Balance</p>
              <p className="text-4xl font-bold text-pipe-900 font-mono mt-1">
                {formatNumber(totalBalance)} SOL
              </p>
              <p className="text-pipe-700 text-sm mt-1">
                Across {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="bg-white/30 p-4 rounded-lg border-3 border-pipe-700">
              <Wallet2 className="h-12 w-12 text-pipe-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className={`mario-card bg-white border-4 shadow-mario transition-all hover:scale-[1.02] ${
              wallet.isActive
                ? 'border-luigi-green-500 bg-luigi-green-50'
                : 'border-pipe-400'
            }`}
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-pipe-900 truncate">
                      {wallet.name}
                    </h3>
                    {wallet.isActive && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-luigi-green-500 text-white text-xs font-bold rounded border-2 border-pipe-700">
                        <Star className="h-3 w-3 fill-current" />
                        ACTIVE
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded border-2 font-medium ${
                      wallet.walletType === 'IMPORTED'
                        ? 'bg-star-yellow-100 border-star-yellow-500 text-star-yellow-800'
                        : 'bg-sky-100 border-sky-500 text-sky-800'
                    }`}>
                      {wallet.walletType === 'IMPORTED' ? '📥 Imported' : '🏠 Platform'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Balance */}
              <div className="p-3 bg-pipe-50 border-3 border-pipe-300 rounded mb-4">
                <p className="text-xs text-pipe-600 uppercase font-medium">Balance</p>
                <p className="text-2xl font-bold text-pipe-900 font-mono">
                  {formatNumber(parseFloat(wallet.balance))} SOL
                </p>
              </div>

              {/* Address */}
              <div className="mb-4">
                <p className="text-xs text-pipe-600 uppercase font-medium mb-1">Address</p>
                <p className="text-xs font-mono text-pipe-700 break-all bg-pipe-100 p-2 rounded border-2 border-pipe-300">
                  {wallet.address}
                </p>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                {!wallet.isActive && (
                  <Button
                    onClick={() => handleSetActive(wallet.id)}
                    size="sm"
                    className="mario-btn bg-luigi-green-500 text-white hover:bg-luigi-green-600 text-xs border-2 border-pipe-700"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Set Active
                  </Button>
                )}
                <Button
                  onClick={() => handleTransfer(wallet.id)}
                  size="sm"
                  variant="outline"
                  className="border-3 border-pipe-400 hover:bg-pipe-50 text-pipe-800 text-xs font-medium"
                >
                  <ArrowRightLeft className="mr-1 h-3 w-3" />
                  Transfer
                </Button>
                <Button
                  onClick={() => handleRename(wallet.id, wallet.name)}
                  size="sm"
                  variant="outline"
                  className="border-3 border-pipe-400 hover:bg-pipe-50 text-pipe-800 text-xs font-medium"
                >
                  <Edit2 className="mr-1 h-3 w-3" />
                  Rename
                </Button>
                {wallet.walletType === 'IMPORTED' && (
                  <Button
                    onClick={() => handleExportKey(wallet.id)}
                    size="sm"
                    variant="outline"
                    className="border-3 border-star-yellow-500 hover:bg-star-yellow-50 text-star-yellow-800 text-xs font-medium"
                  >
                    <KeyRound className="mr-1 h-3 w-3" />
                    Export Key
                  </Button>
                )}
                {!wallet.isActive && parseFloat(wallet.balance) === 0 && (
                  <Button
                    onClick={() => handleDelete(wallet.id, wallet.name)}
                    size="sm"
                    variant="outline"
                    className="border-3 border-mario-red-500 hover:bg-mario-red-50 text-mario-red-700 text-xs font-medium"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {wallets.length === 0 && (
        <div className="mario-card bg-white border-4 border-pipe-400 shadow-mario">
          <div className="p-12 text-center">
            <Wallet2 className="h-16 w-16 text-pipe-400 mx-auto mb-4" />
            <h3 className="font-mario text-xl text-pipe-800 mb-2">
              No Wallets Yet
            </h3>
            <p className="text-pipe-600 mb-6">
              Create or import a wallet to get started
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleCreateWallet}
                className="mario-btn bg-star-yellow-500 text-pipe-900 hover:bg-star-yellow-400 shadow-mario font-bold"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Wallet
              </Button>
              <Button
                onClick={() => setShowImportModal(true)}
                className="mario-btn bg-mario-red-500 text-white hover:bg-mario-red-600 shadow-mario font-bold"
              >
                <Download className="mr-2 h-4 w-4" />
                Import Wallet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {user && (
        <>
          <ImportWalletModal
            open={showImportModal}
            onOpenChange={setShowImportModal}
            userId={user.id}
          />
          <TransferFundsModal
            open={showTransferModal}
            onOpenChange={setShowTransferModal}
            userId={user.id}
            wallets={wallets}
            defaultFromWalletId={transferFromWallet}
          />
          {selectedWalletForExport && (
            <ExportPrivateKeyModal
              open={showExportKeyModal}
              onOpenChange={setShowExportKeyModal}
              userId={user.id}
              balance={wallets.find(w => w.id === selectedWalletForExport)?.balance || '0'}
            />
          )}
        </>
      )}
    </div>
  );
}

