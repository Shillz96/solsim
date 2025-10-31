'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  ArrowRight,
  Wallet,
  Shield,
  Zap,
  DollarSign,
  Lock,
  TrendingUp,
  ArrowDownToLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealTradingOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userHasBalance: boolean;
  onDepositChoice: () => void;
  onWalletChoice: () => void;
}

/**
 * Real Trading Onboarding Modal
 *
 * Multi-step onboarding flow when user switches to REAL mode:
 * 1. Warning screen - confirm understanding of real money trading
 * 2. Funding choice screen - choose between deposited or wallet funding
 *
 * Only shows funding choice if user has 0 balance
 */
export function RealTradingOnboardingModal({
  open,
  onOpenChange,
  userHasBalance,
  onDepositChoice,
  onWalletChoice,
}: RealTradingOnboardingModalProps) {
  const [step, setStep] = useState<'warning' | 'funding'>('warning');
  const [understoodChecked, setUnderstoodChecked] = useState(false);

  // Reset state when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep('warning');
      setUnderstoodChecked(false);
    }
    onOpenChange(newOpen);
  };

  // Handle continue from warning screen
  const handleContinue = () => {
    if (!understoodChecked) return;

    // If user already has balance, just close
    if (userHasBalance) {
      handleOpenChange(false);
      return;
    }

    // Otherwise, show funding choice
    setStep('funding');
  };

  // Handle deposit choice
  const handleDepositChoice = () => {
    onDepositChoice();
    handleOpenChange(false);
  };

  // Handle wallet choice
  const handleWalletChoice = () => {
    onWalletChoice();
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-[var(--background)] border-4 border-[var(--outline)] shadow-[8px_8px_0_var(--outline-black)] z-50">
        <AnimatePresence mode="wait">
          {step === 'warning' ? (
            <WarningStep
              key="warning"
              understoodChecked={understoodChecked}
              onCheckChange={setUnderstoodChecked}
              onContinue={handleContinue}
              onCancel={() => handleOpenChange(false)}
            />
          ) : (
            <FundingChoiceStep
              key="funding"
              onDepositChoice={handleDepositChoice}
              onWalletChoice={handleWalletChoice}
              onBack={() => setStep('warning')}
            />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Step 1: Warning Screen
 */
interface WarningStepProps {
  understoodChecked: boolean;
  onCheckChange: (checked: boolean) => void;
  onContinue: () => void;
  onCancel: () => void;
}

function WarningStep({
  understoodChecked,
  onCheckChange,
  onContinue,
  onCancel,
}: WarningStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <DialogHeader>
        <DialogTitle className="font-mario text-2xl text-mario-red-600 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8" />
          SWITCHING TO LIVE TRADING
        </DialogTitle>
        <DialogDescription className="text-base pt-2">
          You're about to enter live trading mode where real money is at stake.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Main warning */}
        <Alert className="border-4 border-star-yellow-500 bg-star-yellow-50">
          <AlertTriangle className="h-5 w-5 text-star-yellow-700" />
          <AlertDescription className="text-star-yellow-900 font-semibold">
            <p className="mb-2">This is REAL trading. You'll use REAL SOL on Solana mainnet.</p>
            <p className="text-sm font-normal text-star-yellow-800">
              Trades execute on-chain, fees apply, and transactions cannot be reversed.
              Only trade with funds you can afford to lose.
            </p>
          </AlertDescription>
        </Alert>

        {/* What this means */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 bg-pipe-50 rounded-xl border-4 border-pipe-900 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <div className="flex items-start gap-2">
              <DollarSign className="w-5 h-5 text-mario-red-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-pipe-900 mb-1">Real Money</h4>
                <p className="text-xs text-pipe-700">
                  Trades use actual SOL from your deposited balance or connected wallet
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-pipe-50 rounded-xl border-4 border-pipe-900 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-5 h-5 text-luigi-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-pipe-900 mb-1">On-Chain Execution</h4>
                <p className="text-xs text-pipe-700">
                  Every trade is a real Solana transaction that's publicly verifiable
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-pipe-50 rounded-xl border-4 border-pipe-900 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <div className="flex items-start gap-2">
              <Zap className="w-5 h-5 text-star-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-pipe-900 mb-1">Trading Fees</h4>
                <p className="text-xs text-pipe-700">
                  1% fee (deposited) or 0.5% fee (wallet) plus network fees apply
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-pipe-50 rounded-xl border-4 border-pipe-900 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <div className="flex items-start gap-2">
              <Lock className="w-5 h-5 text-pipe-700 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-pipe-900 mb-1">No Reversals</h4>
                <p className="text-xs text-pipe-700">
                  Blockchain transactions are final and cannot be undone
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation checkbox */}
        <div className="flex items-start space-x-3 p-4 bg-mario-red-50 rounded-lg border-3 border-mario-red-300">
          <Checkbox
            id="understood"
            checked={understoodChecked}
            onCheckedChange={(checked) => onCheckChange(checked === true)}
            className="mt-1"
          />
          <label
            htmlFor="understood"
            className="text-sm font-medium leading-tight cursor-pointer select-none text-pipe-900"
          >
            I understand that this is live trading with real money, and I have read and accept the risks involved.
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-2 border-pipe-400"
        >
          Cancel
        </Button>
        <Button
          onClick={onContinue}
          disabled={!understoodChecked}
          className="bg-mario-red-500 hover:bg-mario-red-600 text-white border-3 border-mario-red-700 shadow-mario font-semibold"
        >
          Continue to Live Trading
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Step 2: Funding Choice Screen
 */
interface FundingChoiceStepProps {
  onDepositChoice: () => void;
  onWalletChoice: () => void;
  onBack: () => void;
}

function FundingChoiceStep({
  onDepositChoice,
  onWalletChoice,
  onBack,
}: FundingChoiceStepProps) {
  const [hoveredCard, setHoveredCard] = useState<'deposit' | 'wallet' | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <DialogHeader>
        <DialogTitle className="font-mario text-xl text-pipe-900 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-star-yellow-600" />
          Choose How to Fund Your Account
        </DialogTitle>
        <DialogDescription>
          Select how you'd like to fund your live trading account
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
        {/* Deposit Option */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          onHoverStart={() => setHoveredCard('deposit')}
          onHoverEnd={() => setHoveredCard(null)}
          className={cn(
            "relative p-6 rounded-xl border-4 cursor-pointer transition-all duration-300",
            hoveredCard === 'deposit'
              ? "border-star-yellow-700 bg-star-yellow-50 shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
              : "border-pipe-900 bg-card shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
          )}
          onClick={onDepositChoice}
        >
          {/* Recommended badge */}
          <div className="absolute -top-2 -right-2 bg-luigi-green-500 text-white text-[10px] px-2 py-1 rounded-full font-bold border-2 border-white">
            RECOMMENDED
          </div>

          <div className="flex flex-col items-center text-center space-y-3">
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-star-yellow-400 to-coin-yellow-500 rounded-lg flex items-center justify-center border-3 border-star-yellow-700 shadow-mario">
              <ArrowDownToLine className="w-8 h-8 text-white" />
            </div>

            {/* Title */}
            <h3 className="font-mario text-lg text-pipe-900">
              Deposit SOL
            </h3>

            {/* Fee */}
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-pipe-100 rounded-full border-2 border-pipe-300">
              <Zap className="w-3 h-3 text-star-yellow-600" />
              <span className="text-xs font-semibold text-pipe-800">1% per trade</span>
            </div>

            {/* Description */}
            <p className="text-sm text-pipe-700">
              Deposit SOL to our platform for trading. Easier for beginners, no wallet signatures needed.
            </p>

            {/* Features */}
            <div className="w-full space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs text-pipe-700">
                <Shield className="w-4 h-4 text-luigi-green-600" />
                <span>Platform-held, secure</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-pipe-700">
                <Zap className="w-4 h-4 text-star-yellow-600" />
                <span>One-click trading</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-pipe-700">
                <TrendingUp className="w-4 h-4 text-luigi-green-600" />
                <span>Easy to get started</span>
              </div>
            </div>

            {/* Button */}
            <Button
              className="w-full bg-star-yellow-500 hover:bg-star-yellow-600 text-pipe-900 font-semibold border-3 border-star-yellow-700 shadow-mario mt-4"
            >
              Deposit SOL
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Wallet Option */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          onHoverStart={() => setHoveredCard('wallet')}
          onHoverEnd={() => setHoveredCard(null)}
          className={cn(
            "p-6 rounded-xl border-4 cursor-pointer transition-all duration-300",
            hoveredCard === 'wallet'
              ? "border-coin-yellow-700 bg-coin-yellow-50 shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
              : "border-pipe-900 bg-card shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
          )}
          onClick={onWalletChoice}
        >
          <div className="flex flex-col items-center text-center space-y-3">
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-coin-yellow-400 to-star-yellow-500 rounded-lg flex items-center justify-center border-3 border-coin-yellow-700 shadow-mario">
              <Wallet className="w-8 h-8 text-white" />
            </div>

            {/* Title */}
            <h3 className="font-mario text-lg text-pipe-900">
              Connect Wallet
            </h3>

            {/* Fee */}
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-pipe-100 rounded-full border-2 border-pipe-300">
              <Zap className="w-3 h-3 text-luigi-green-600" />
              <span className="text-xs font-semibold text-pipe-800">0.5% per trade</span>
            </div>

            {/* Description */}
            <p className="text-sm text-pipe-700">
              Trade directly from your wallet (Phantom, Solflare, etc.). You maintain full control of your keys.
            </p>

            {/* Features */}
            <div className="w-full space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs text-pipe-700">
                <Lock className="w-4 h-4 text-luigi-green-600" />
                <span>You control your keys</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-pipe-700">
                <DollarSign className="w-4 h-4 text-luigi-green-600" />
                <span>Lower fees (0.5%)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-pipe-700">
                <Wallet className="w-4 h-4 text-coin-yellow-600" />
                <span>Approve each trade</span>
              </div>
            </div>

            {/* Button */}
            <Button
              className="w-full bg-coin-yellow-500 hover:bg-coin-yellow-600 text-pipe-900 font-semibold border-3 border-coin-yellow-700 shadow-mario mt-4"
            >
              Connect Wallet
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Back button */}
      <div className="flex items-center justify-start pt-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-pipe-600 hover:text-pipe-900"
        >
          ← Back
        </Button>
      </div>
    </motion.div>
  );
}
