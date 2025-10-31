'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle,
  Copy,
  Download,
  Eye,
  EyeOff,
  Lock,
  Shield,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';

interface ExportPrivateKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  depositAddress?: string;
  balance?: string;
}

/**
 * Export Private Key Modal
 *
 * ⚠️ SECURITY CRITICAL COMPONENT
 *
 * Features:
 * - Multiple confirmation steps
 * - Security warnings
 * - Blurred private key display
 * - Copy and download options
 * - Audit logging
 */
export function ExportPrivateKeyModal({
  open,
  onOpenChange,
  userId,
  depositAddress,
  balance,
}: ExportPrivateKeyModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'warning' | 'export' | 'success'>('warning');
  const [isExporting, setIsExporting] = useState(false);
  const [privateKeyData, setPrivateKeyData] = useState<{
    privateKey: number[];
    privateKeyBase58: string;
    depositAddress: string;
    balance: string;
  } | null>(null);

  // Security confirmations
  const [confirmUnderstand, setConfirmUnderstand] = useState(false);
  const [confirmResponsibility, setConfirmResponsibility] = useState(false);
  const [confirmNoShare, setConfirmNoShare] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const canProceed = confirmUnderstand && confirmResponsibility && confirmNoShare;

  const handleExport = async () => {
    if (!canProceed) return;

    setIsExporting(true);
    try {
      const result = await api.exportDepositPrivateKey(userId);

      setPrivateKeyData({
        privateKey: result.privateKey,
        privateKeyBase58: result.privateKeyBase58,
        depositAddress: result.depositAddress,
        balance: result.balance,
      });

      setStep('export');

      toast({
        title: '🔑 Private Key Exported',
        description: 'Your private key has been generated. Store it securely!',
        duration: 5000,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export private key',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    if (!privateKeyData) return;

    // Copy as JSON array format (importable to Phantom, Solflare, etc.)
    const keyJson = JSON.stringify(privateKeyData.privateKey);

    try {
      await navigator.clipboard.writeText(keyJson);
      toast({
        title: '📋 Copied!',
        description: 'Private key copied to clipboard',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = () => {
    if (!privateKeyData) return;

    const data = {
      privateKey: privateKeyData.privateKey,
      depositAddress: privateKeyData.depositAddress,
      balance: privateKeyData.balance,
      exportedAt: new Date().toISOString(),
      warning: 'KEEP THIS FILE SECURE! Anyone with this key can access your funds.',
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `1upsol-wallet-${privateKeyData.depositAddress.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: '💾 Downloaded!',
      description: 'Private key saved to file',
      duration: 3000,
    });
  };

  const handleClose = () => {
    setStep('warning');
    setConfirmUnderstand(false);
    setConfirmResponsibility(false);
    setConfirmNoShare(false);
    setShowPrivateKey(false);
    setPrivateKeyData(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <AnimatePresence mode="wait">
          {step === 'warning' && (
            <motion.div
              key="warning"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="font-mario text-xl text-outline flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-mario" />
                  Export Private Key
                </DialogTitle>
                <DialogDescription className="text-sm text-pipe-600">
                  You are about to export your deposit wallet's private key
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-6">
                {/* Critical Warning */}
                <Alert className="border-3 border-mario bg-mario-red-50">
                  <AlertTriangle className="h-5 w-5 text-mario" />
                  <AlertDescription className="text-mario font-bold ml-2">
                    ⚠️ CRITICAL SECURITY WARNING
                  </AlertDescription>
                </Alert>

                {/* Wallet Info */}
                {depositAddress && (
                  <div className="p-4 bg-pipe-50 border-2 border-pipe-900 rounded-lg">
                    <div className="text-xs text-pipe-600 mb-1">Deposit Address</div>
                    <div className="font-mono text-sm font-bold break-all">{depositAddress}</div>
                    {balance && (
                      <div className="text-xs text-pipe-600 mt-2">
                        Balance: <span className="font-bold">{balance} SOL</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Security Warnings */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-card border-2 border-pipe-900 rounded-lg">
                    <Shield className="w-5 h-5 text-mario-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-sm text-pipe-900 mb-1">
                        Anyone with this key controls your funds
                      </div>
                      <div className="text-xs text-pipe-600">
                        Your private key gives complete access to all SOL in this wallet. Never share it with anyone.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-card border-2 border-pipe-900 rounded-lg">
                    <Lock className="w-5 h-5 text-star-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-sm text-pipe-900 mb-1">
                        Store it offline in a secure location
                      </div>
                      <div className="text-xs text-pipe-600">
                        Write it down on paper, use a hardware wallet, or store in an encrypted password manager.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-card border-2 border-pipe-900 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-mario-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-sm text-pipe-900 mb-1">
                        Lost keys cannot be recovered
                      </div>
                      <div className="text-xs text-pipe-600">
                        If you lose your private key, you lose access to your funds permanently. Make multiple secure backups.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirmation Checkboxes */}
                <div className="space-y-3 pt-4 border-t-2 border-pipe-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={confirmUnderstand}
                      onCheckedChange={(checked) => setConfirmUnderstand(checked === true)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-pipe-900">
                      I understand that anyone with my private key can access and control my funds
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={confirmResponsibility}
                      onCheckedChange={(checked) => setConfirmResponsibility(checked === true)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-pipe-900">
                      I take full responsibility for securely storing my private key
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={confirmNoShare}
                      onCheckedChange={(checked) => setConfirmNoShare(checked === true)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-pipe-900">
                      I will never share my private key with anyone, including 1UP SOL support
                    </span>
                  </label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose} className="mario-btn">
                  Cancel
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={!canProceed || isExporting}
                  className="mario-btn mario-btn-red"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      I Understand - Export Key
                    </>
                  )}
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {step === 'export' && privateKeyData && (
            <motion.div
              key="export"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="font-mario text-xl text-outline flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-luigi-green-600" />
                  Your Private Key
                </DialogTitle>
                <DialogDescription className="text-sm text-pipe-600">
                  Copy or download your private key. Store it securely offline.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-6">
                {/* Private Key Display */}
                <div className="relative">
                  <div
                    className={cn(
                      'p-4 bg-pipe-900 rounded-lg font-mono text-sm break-all transition-all',
                      !showPrivateKey && 'blur-md select-none'
                    )}
                  >
                    <div className="text-pipe-400 text-xs mb-2">Private Key (JSON Array)</div>
                    <div className="text-white text-xs leading-relaxed">
                      {JSON.stringify(privateKeyData.privateKey)}
                    </div>
                  </div>

                  {!showPrivateKey && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button
                        onClick={() => setShowPrivateKey(true)}
                        className="mario-btn mario-btn-yellow"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Click to Reveal
                      </Button>
                    </div>
                  )}

                  {showPrivateKey && (
                    <Button
                      onClick={() => setShowPrivateKey(false)}
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                    >
                      <EyeOff className="w-4 h-4 mr-1" />
                      Hide
                    </Button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleCopy} className="mario-btn mario-btn-green">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </Button>
                  <Button onClick={handleDownload} className="mario-btn mario-btn-yellow">
                    <Download className="w-4 h-4 mr-2" />
                    Download as File
                  </Button>
                </div>

                {/* Import Instructions */}
                <Alert className="border-2 border-luigi-green-500 bg-luigi-green-50">
                  <AlertDescription className="text-xs">
                    <div className="font-bold mb-2">💡 How to Import:</div>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>
                        <strong>Phantom:</strong> Settings → Add / Connect Wallet → Import Private Key → Paste array
                      </li>
                      <li>
                        <strong>Solflare:</strong> Import Wallet → Private Key → Paste array
                      </li>
                      <li>
                        <strong>solana-keygen:</strong> Import from JSON file
                      </li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button onClick={handleClose} className="mario-btn mario-btn-green">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Done - I've Saved It Securely
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

