'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, RefreshCw, ExternalLink, Loader2, Coins } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DepositHistory {
  id: string;
  amount: string;
  txSignature: string;
  status: string;
  confirmedAt?: string;
  createdAt: string;
  explorerUrl: string;
}

export function DepositModal({ open, onOpenChange }: DepositModalProps) {
  const { user, getUserId } = useAuth();
  const { toast } = useToast();

  const [depositAddress, setDepositAddress] = useState<string>('');
  const [depositAddressShort, setDepositAddressShort] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [depositHistory, setDepositHistory] = useState<DepositHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch deposit address
  useEffect(() => {
    if (open && user) {
      fetchDepositAddress();
      fetchDepositHistory();
    }
  }, [open, user]);

  const fetchDepositAddress = async () => {
    const userId = getUserId();
    if (!userId) return;

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/wallet/deposit-address/${userId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch deposit address');
      }

      const data = await response.json();
      setDepositAddress(data.depositAddress);
      setDepositAddressShort(data.depositAddressShort);
    } catch (error) {
      console.error('Error fetching deposit address:', error);
      toast({
        title: 'Error',
        description: 'Failed to load deposit address',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepositHistory = async () => {
    const userId = getUserId();
    if (!userId) return;

    setLoadingHistory(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/wallet/deposits/${userId}?limit=5`);

      if (!response.ok) {
        throw new Error('Failed to fetch deposit history');
      }

      const data = await response.json();
      setDepositHistory(data.deposits || []);
    } catch (error) {
      console.error('Error fetching deposit history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    toast({
      title: '✅ Copied!',
      description: 'Deposit address copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const refreshHistory = () => {
    fetchDepositHistory();
    toast({
      title: '🔄 Refreshing',
      description: 'Checking for new deposits...',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-3 border-pipe-400 shadow-mario">
        <DialogHeader>
          <DialogTitle className="font-mario text-lg flex items-center gap-2">
            <Coins className="w-5 h-5 text-coin-yellow-500" />
            Deposit SOL
          </DialogTitle>
          <DialogDescription>
            Send SOL to your unique deposit address to fund your real trading account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Deposit Address */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-mario-red-500" />
            </div>
          ) : (
            <>
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-card rounded-lg border-3 border-pipe-300">
                <QRCodeSVG
                  value={depositAddress}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Address Display */}
              <div>
                <label className="text-xs font-bold text-pipe-600 mb-2 block">
                  Your Deposit Address:
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-pipe-50 rounded border-2 border-pipe-300 font-mono text-sm break-all">
                    {depositAddress}
                  </div>
                  <Button
                    onClick={copyAddress}
                    variant="outline"
                    size="icon"
                    className="shrink-0 border-2"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-luigi-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <Alert className="border-2 border-star-yellow-300 bg-star-yellow-50">
                <AlertDescription className="text-sm text-pipe-700">
                  <strong>Instructions:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Send SOL to the address above</li>
                    <li>Minimum deposit: 0.01 SOL</li>
                    <li>Deposits confirm in 1-2 minutes</li>
                    <li>Your balance will update automatically</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Deposit History */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-pipe-700">Recent Deposits</h3>
                  <Button
                    onClick={refreshHistory}
                    variant="ghost"
                    size="sm"
                    className="h-8"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                </div>

                {loadingHistory ? (
                  <div className="text-center py-4 text-sm text-pipe-500">
                    Loading history...
                  </div>
                ) : depositHistory.length > 0 ? (
                  <div className="space-y-2">
                    {depositHistory.map((deposit) => (
                      <div
                        key={deposit.id}
                        className="p-3 bg-pipe-50 rounded border border-pipe-200 text-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-luigi-green-600">
                            +{parseFloat(deposit.amount).toFixed(4)} SOL
                          </span>
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded font-bold',
                              deposit.status === 'CONFIRMED' && 'bg-luigi-green-100 text-luigi-green-700',
                              deposit.status === 'PENDING' && 'bg-star-yellow-100 text-star-yellow-700',
                              deposit.status === 'FAILED' && 'bg-mario-red-100 text-mario-red-700'
                            )}
                          >
                            {deposit.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-pipe-500">
                          <span>
                            {new Date(deposit.createdAt).toLocaleDateString()}
                          </span>
                          <a
                            href={deposit.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-mario-red-500 transition-colors"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-pipe-500">
                    No deposits yet. Send SOL to get started!
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="flex-1 border-2"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
