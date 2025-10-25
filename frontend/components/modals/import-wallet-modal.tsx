'use client';

/**
 * Import Wallet Modal Component
 * 
 * Allows users to import an external Solana wallet by providing:
 * - Private key (as JSON array or base64 string)
 * - Wallet name
 * 
 * Features Mario-themed styling with security warnings.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Keypair } from '@solana/web3.js';
import { AlertTriangle, Eye, EyeOff, Wallet, Check } from 'lucide-react';
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface ImportWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function ImportWalletModal({ open, onOpenChange, userId }: ImportWalletModalProps) {
  const [walletName, setWalletName] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewAddress, setPreviewAddress] = useState('');
  const [agreedToWarning, setAgreedToWarning] = useState(false);

  const queryClient = useQueryClient();

  // Validate and preview wallet address
  const handlePrivateKeyChange = (value: string) => {
    setPrivateKeyInput(value);
    setError('');
    setPreviewAddress('');

    if (!value.trim()) return;

    try {
      // Try parsing as JSON array
      let keyArray: number[];
      
      if (value.startsWith('[')) {
        keyArray = JSON.parse(value);
      } else if (value.length === 88) {
        // Base64 encoded (88 chars for 64 bytes)
        const buffer = Buffer.from(value, 'base64');
        keyArray = Array.from(buffer);
      } else {
        // Assume it's comma-separated numbers
        keyArray = value.split(',').map(n => parseInt(n.trim()));
      }

      if (!Array.isArray(keyArray) || keyArray.length !== 64) {
        setError('Invalid private key format. Expected 64-byte array.');
        return;
      }

      // Validate by creating keypair
      const keypair = Keypair.fromSecretKey(Uint8Array.from(keyArray));
      setPreviewAddress(keypair.publicKey.toBase58());
    } catch (err) {
      setError('Invalid private key format. Please provide a valid Solana private key.');
    }
  };

  const handleImport = async () => {
    if (!walletName.trim()) {
      setError('Please enter a wallet name');
      return;
    }

    if (!privateKeyInput.trim()) {
      setError('Please enter a private key');
      return;
    }

    if (!agreedToWarning) {
      setError('Please acknowledge the security warning');
      return;
    }

    if (!previewAddress) {
      setError('Invalid private key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Parse private key
      let keyArray: number[];
      
      if (privateKeyInput.startsWith('[')) {
        keyArray = JSON.parse(privateKeyInput);
      } else if (privateKeyInput.length === 88) {
        const buffer = Buffer.from(privateKeyInput, 'base64');
        keyArray = Array.from(buffer);
      } else {
        keyArray = privateKeyInput.split(',').map(n => parseInt(n.trim()));
      }

      // Import wallet via API
      await api.importWallet(userId, walletName.trim(), keyArray);

      // Invalidate wallet queries to refetch
      await queryClient.invalidateQueries({ queryKey: ['wallets', userId] });
      await queryClient.invalidateQueries({ queryKey: ['activeWallet', userId] });

      // Reset form and close
      setWalletName('');
      setPrivateKeyInput('');
      setPreviewAddress('');
      setAgreedToWarning(false);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to import wallet:', err);
      setError(err.message || 'Failed to import wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setWalletName('');
    setPrivateKeyInput('');
    setPreviewAddress('');
    setAgreedToWarning(false);
    setError('');
    setShowPrivateKey(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="mario-card bg-[var(--card)] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-mario-red-500" />
            <DialogTitle className="font-mario text-lg">Import Wallet</DialogTitle>
          </div>
          <DialogDescription>
            Import an external Solana wallet using its private key. This wallet will be added to your account and encrypted for security.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Security Warning */}
          <Alert className="border-3 border-star-yellow-500 bg-star-yellow-50">
            <AlertTriangle className="h-5 w-5 text-star-yellow-700" />
            <AlertDescription className="text-sm text-star-yellow-900 font-medium">
              <strong>Security Warning:</strong> Only import wallets you own and trust. Never share your private key with anyone. Your private key will be encrypted and stored securely.
            </AlertDescription>
          </Alert>

          {/* Wallet Name */}
          <div className="space-y-2">
            <Label htmlFor="wallet-name" className="text-pipe-800 font-medium">
              Wallet Name
            </Label>
            <Input
              id="wallet-name"
              placeholder="e.g., My Trading Wallet"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              disabled={isLoading}
              className="border-2 border-pipe-300 focus:border-mario-red-500"
            />
          </div>

          {/* Private Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="private-key" className="text-pipe-800 font-medium">
                Private Key
              </Label>
              <button
                type="button"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="text-xs text-pipe-600 hover:text-pipe-800 flex items-center gap-1"
              >
                {showPrivateKey ? (
                  <>
                    <EyeOff className="h-3 w-3" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" />
                    Show
                  </>
                )}
              </button>
            </div>
            <Textarea
              id="private-key"
              placeholder="[123,45,67,89,...] or base64 string"
              value={privateKeyInput}
              onChange={(e) => handlePrivateKeyChange(e.target.value)}
              disabled={isLoading}
              className={`font-mono text-xs border-2 border-pipe-300 focus:border-mario-red-500 min-h-[120px] ${
                showPrivateKey ? '' : 'blur-sm focus:blur-none hover:blur-none'
              }`}
            />
            <p className="text-xs text-pipe-600">
              Paste your private key as a JSON array [1,2,3...] or base64 string
            </p>
          </div>

          {/* Address Preview */}
          {previewAddress && (
            <div className="space-y-2 p-3 bg-luigi-green-50 border-2 border-luigi-green-500 rounded">
              <div className="flex items-center gap-2 text-luigi-green-700">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Valid Wallet Address</span>
              </div>
              <div className="font-mono text-xs text-pipe-700 break-all">
                {previewAddress}
              </div>
            </div>
          )}

          {/* Security Acknowledgment */}
          <div className="flex items-start gap-2 p-3 bg-pipe-50 border-2 border-pipe-300 rounded">
            <input
              type="checkbox"
              id="agree-warning"
              checked={agreedToWarning}
              onChange={(e) => setAgreedToWarning(e.target.checked)}
              disabled={isLoading}
              className="mt-1"
            />
            <label htmlFor="agree-warning" className="text-xs text-pipe-700">
              I understand that this private key will be encrypted and stored on 1UP SOL servers. I acknowledge the security implications and confirm I own this wallet.
            </label>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="border-3 border-mario-red-500">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            onClick={handleClose}
            disabled={isLoading}
            variant="outline"
            className="border-2 border-pipe-400 hover:bg-pipe-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isLoading || !previewAddress || !walletName.trim() || !agreedToWarning}
            className="mario-btn bg-mario-red-500 text-white hover:bg-mario-red-600"
          >
            {isLoading ? 'Importing...' : 'Import Wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

