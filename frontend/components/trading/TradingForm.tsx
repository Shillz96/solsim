'use client';

import { useState, useEffect } from 'react';
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatNumber } from '@/lib/utils';
import { TradingFormProps, TradeDetails, TradeType } from './types';

/**
 * TradingForm component for buying and selling tokens
 * 
 * Follows the UX pattern guidelines for trade entry forms:
 * - Clear action tabs for buy/sell
 * - Amount input with unit toggle (USD/token)
 * - Real-time conversion display
 * - Trade preview before submission
 */
export function TradingForm({
  token,
  currentPrice,
  initialTradeType = 'buy',
  onSubmitTrade,
  className = '',
  children
}: TradingFormProps) {
  const [tradeType, setTradeType] = useState<TradeType>(initialTradeType);
  const [amount, setAmount] = useState<string>('');
  const [isUsdInput, setIsUsdInput] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Reset form if token changes
  useEffect(() => {
    setAmount('');
  }, [token.id]);

  // Calculate converted amounts based on input
  const amountValue = parseFloat(amount) || 0;
  const amountInTokens = isUsdInput ? amountValue / currentPrice : amountValue;
  const amountInUsd = isUsdInput ? amountValue : amountValue * currentPrice;
  
  // Calculate trade preview data
  const executionPrice = currentPrice;
  const networkFee = 0; // In a real implementation, calculate network fees
  const totalCost = amountInUsd + networkFee;

  // Form validation
  const isValid = amountValue > 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Accept only numbers and decimal points
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setAmount(value);
  };

  const handleTradeTypeChange = (value: string) => {
    setTradeType(value as TradeType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid || isLoading) return;
    
    setIsLoading(true);
    
    // Create trade details object
    const tradeDetails: TradeDetails = {
      token,
      tradeType,
      executionPrice,
      networkFee,
      totalCost,
      amountInTokens,
      amountInUsd,
      tokenAmount: amountInTokens,
      totalValue: totalCost,
      timestamp: new Date()
    };
    
    try {
      await onSubmitTrade(tradeDetails);
      // Reset form on successful submission
      setAmount('');
    } catch (error) {
      import('@/lib/error-logger').then(({ errorLogger }) => {
        errorLogger.error('Trade submission failed', {
          error: error as Error,
          action: 'trade_submit_failed',
          metadata: { 
            tokenId: token.id,
            tradeType,
            amount: amountValue
          }
        })
      })
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Trade {token.name}</CardTitle>
        <CardDescription>
          Current Price: ${formatNumber(currentPrice)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={tradeType} onValueChange={handleTradeTypeChange}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="sell">Sell</TabsTrigger>
          </TabsList>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="amount">Amount</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">USD</span>
                    <Switch
                      checked={isUsdInput}
                      onCheckedChange={setIsUsdInput}
                    />
                    <span className="text-xs text-muted-foreground">{token.symbol}</span>
                  </div>
                </div>
                
                <div className="relative">
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className="pl-8"
                    aria-label={`Amount in ${isUsdInput ? 'USD' : token.symbol}`}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    {isUsdInput ? '$' : ''}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground text-right">
                  {isUsdInput && amount
                    ? `≈ ${formatNumber(amountInTokens, 6)} ${token.symbol}`
                    : amount ? `≈ $${formatNumber(amountInUsd)}` : ''}
                </div>
              </div>
              
              {amountValue > 0 && (
                <div className="space-y-2 p-3 rounded-md bg-secondary">
                  <div className="text-sm font-medium">Trade Preview</div>
                  <div className="flex justify-between text-sm">
                    <span>Execution Price</span>
                    <span className="font-medium">${formatNumber(executionPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Network Fee</span>
                    <span className="font-medium">${formatNumber(networkFee)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span className="font-medium">${formatNumber(totalCost)}</span>
                  </div>
                </div>
              )}
              
              {children}
              
              <Button type="submit" className="w-full" disabled={!isValid || isLoading}>
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${token.symbol}`
                )}
              </Button>
            </div>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}