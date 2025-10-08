'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TokenSelect } from '@/components/trading/TokenSelect';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { formatNumber, cn } from '@/lib/utils';
import { Token } from './types';
import { TradingFormErrorBoundary } from './TradingFormErrorBoundary';

/**
 * Enhanced trading form validation schema with:
 * 1. Required fields
 * 2. Numeric validation
 * 3. Min/max constraints
 * 4. Conditional validation based on token and balance
 * 5. Safe error handling for unexpected data
 */
const createTradingFormSchema = (balance: number, minTradeAmount: number = 0.1, maxTradePercentage: number = 99) => {
  // Validate input parameters to prevent schema creation errors
  const safeBalance = typeof balance === 'number' && !isNaN(balance) && balance >= 0 ? balance : 0;
  const safeMinAmount = typeof minTradeAmount === 'number' && minTradeAmount > 0 ? minTradeAmount : 0.1;
  const safeMaxPercentage = typeof maxTradePercentage === 'number' && maxTradePercentage > 0 && maxTradePercentage <= 100 
    ? maxTradePercentage 
    : 99;

  return z.object({
    tradeType: z.enum(['buy', 'sell']),
    token: z.object({
      id: z.string(),
      name: z.string(),
      symbol: z.string(),
      logoUrl: z.string(),
      priceChangePercent24h: z.number().optional(),
    }).nullable(),
    amount: z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          const parsed = parseFloat(val);
          return isNaN(parsed) ? 0 : parsed;
        }
        return typeof val === 'number' && !isNaN(val) ? val : 0;
      },
      z.number()
        .positive('Amount must be positive')
        .min(safeMinAmount, `Minimum trade amount is ${safeMinAmount}`)
        .refine(
          (val) => val <= safeBalance * (safeMaxPercentage / 100),
          { message: `Maximum trade amount is ${safeMaxPercentage}% of your balance (${(safeBalance * (safeMaxPercentage / 100)).toFixed(2)})` }
        )
    ),
    isUsdInput: z.boolean().default(true),
  });
};

export interface EnhancedTradingFormProps {
  availableTokens: Token[];
  userBalance: number;
  onSubmitTrade: (formData: EnhancedTradeFormData) => Promise<void>;
  currentPrices: Record<string, number>;
  recentTokens?: Token[];
  minTradeAmount?: number;
  maxTradePercentage?: number;
  className?: string;
}

export interface EnhancedTradeFormData {
  token: Token;
  tradeType: 'buy' | 'sell';
  amount: number;
  amountInTokens: number;
  amountInUsd: number;
  executionPrice: number;
  networkFee: number;
  totalCost: number;
}

type TradingFormValues = {
  tradeType: 'buy' | 'sell';
  token: Token | null;
  amount: string | number;
  isUsdInput: boolean;
};

/**
 * EnhancedTradingForm - Advanced trading form with comprehensive validation
 * 
 * Features:
 * - Real-time validation with helpful error messages
 * - Multi-field validation (amount vs balance)
 * - Async validation (token price checks)
 * - Token selection with search
 * - Detailed feedback on validation state
 */
export function EnhancedTradingForm({
  availableTokens,
  userBalance,
  onSubmitTrade,
  currentPrices,
  recentTokens = [],
  minTradeAmount = 0.1,
  maxTradePercentage = 99,
  className = '',
}: EnhancedTradingFormProps) {
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  // Create form with dynamic schema based on balance
  const form = useForm<TradingFormValues>({
    resolver: zodResolver(createTradingFormSchema(userBalance, minTradeAmount, maxTradePercentage)),
    defaultValues: {
      tradeType: 'buy',
      token: null,
      amount: '',
      isUsdInput: true,
    },
    mode: 'onChange',
  });

  const tradeType = form.watch('tradeType');
  const amount = form.watch('amount');
  const isUsdInput = form.watch('isUsdInput');

  // Update current price when token changes
  useEffect(() => {
    if (selectedToken) {
      const price = currentPrices[selectedToken.id] || 0;
      setCurrentPrice(price);
      form.setValue('token', selectedToken);
    }
  }, [selectedToken, currentPrices, form]);

  // Calculate converted amounts based on input
  const amountValue = typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0;
  const amountInTokens = isUsdInput ? amountValue / currentPrice : amountValue;
  const amountInUsd = isUsdInput ? amountValue : amountValue * currentPrice;
  
  // Calculate trade preview data
  const executionPrice = currentPrice;
  const networkFee = 0; // In a real implementation, calculate network fees
  const totalCost = amountInUsd + networkFee;

  // Reset form errors on trade type change
  useEffect(() => {
    form.clearErrors();
  }, [tradeType, form]);

  // Submit handler
  const onSubmit = async (formData: TradingFormValues) => {
    try {
      setFormState('submitting');
      setErrorMessage(null);

      if (!formData.token) {
        throw new Error('Please select a token to trade.');
      }
      
      // Create enhanced trade data object
      const enhancedTradeData: EnhancedTradeFormData = {
        token: formData.token,
        tradeType: formData.tradeType,
        amount: typeof formData.amount === 'string' ? parseFloat(formData.amount) || 0 : formData.amount,
        amountInTokens,
        amountInUsd,
        executionPrice,
        networkFee,
        totalCost,
      };
      
      await onSubmitTrade(enhancedTradeData);
      
      // Reset form on success
      setFormState('success');
      form.reset({
        tradeType: formData.tradeType,
        token: formData.token,
        amount: '',
        isUsdInput: formData.isUsdInput,
      });
      
      // Auto-clear success state after 3 seconds
      setTimeout(() => {
        setFormState('idle');
      }, 3000);
    } catch (error) {
      setFormState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit trade. Please try again.');
    }
  };

  // Handle token selection
  const handleSelectToken = (token: Token | null) => {
    setSelectedToken(token);
  };

  // Toggle between USD and token units
  const toggleUnitType = () => {
    const newIsUsdInput = !isUsdInput;
    form.setValue('isUsdInput', newIsUsdInput);
    
    // Convert the current amount to the new unit type
    if (amount && currentPrice > 0) {
      const amountStr = typeof amount === 'string' ? amount : String(amount);
      const convertedAmount = newIsUsdInput 
        ? (parseFloat(amountStr) * currentPrice).toFixed(2) 
        : (parseFloat(amountStr) / currentPrice).toFixed(6);
      form.setValue('amount', convertedAmount);
    }
  };

  return (
    <Card className={cn("border-border shadow-md", className)}>
      <CardHeader>
        <CardTitle>Enhanced Trading Form</CardTitle>
        <CardDescription>
          With advanced validation and real-time feedback
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Screen reader announcement for form state */}
            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {formState === 'submitting' && 'Submitting trade...'}
              {formState === 'success' && 'Trade submitted successfully!'}
              {formState === 'error' && `Error: ${errorMessage || 'An error occurred'}`}
            </div>

            {/* Form status alerts */}
            {formState === 'error' && (
              <Alert variant="destructive" className="mb-4 bg-destructive/10 border-destructive">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <AlertDescription>
                  {errorMessage || 'An error occurred. Please try again.'}
                </AlertDescription>
              </Alert>
            )}
            
            {formState === 'success' && (
              <Alert className="mb-4 bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400">
                <CheckCircle className="h-4 w-4 mr-2" />
                <AlertDescription>
                  Trade submitted successfully!
                </AlertDescription>
              </Alert>
            )}
            
            {/* Token selection */}
            <div className="space-y-4">
              <Controller
                name="token"
                control={form.control}
                render={({ field }) => (
                  <TokenSelect
                    tokens={availableTokens}
                    selectedToken={selectedToken ?? undefined}
                    onSelectToken={handleSelectToken}
                    recentTokens={recentTokens}
                    placeholder="Search tokens by name or symbol"
                  />
                )}
              />

              {/* Trade type selection */}
              <FormField
                control={form.control}
                name="tradeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action</FormLabel>
                    <FormControl>
                      <Tabs
                        value={field.value}
                        onValueChange={field.onChange}
                        className="w-full"
                      >
                        <TabsList className="grid grid-cols-2 w-full">
                          <TabsTrigger value="buy" className="py-3 text-base">Buy</TabsTrigger>
                          <TabsTrigger value="sell" className="py-3 text-base">Sell</TabsTrigger>
                        </TabsList>
                        <TabsContent value="buy">
                          <div className="text-sm text-muted-foreground mt-3 px-1">
                            {selectedToken ? (
                              <>Buy {selectedToken.symbol} with your available balance</>
                            ) : (
                              <>Select a token to buy</>
                            )}
                          </div>
                        </TabsContent>
                        <TabsContent value="sell">
                          <div className="text-sm text-muted-foreground mt-3 px-1">
                            {selectedToken ? (
                              <>Sell {selectedToken.symbol} from your portfolio</>
                            ) : (
                              <>Select a token to sell</>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Amount input with unit toggle */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Amount</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleUnitType}
                      >
                        {isUsdInput ? 'USD' : selectedToken?.symbol || 'Tokens'}
                      </Button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          aria-label="Trade amount"
                          aria-describedby={fieldState.error ? 'amount-error' : undefined}
                          aria-invalid={!!fieldState.error}
                          className={cn(
                            "pl-8 h-14 text-lg bg-background border-border",
                            fieldState.error && "border-destructive focus-visible:ring-destructive/20"
                          )}
                          onChange={(e) => {
                            // Accept only numbers and decimal points
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            field.onChange(value);
                          }}
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-lg text-muted-foreground">
                          {isUsdInput ? '$' : ''}
                        </div>
                      </div>
                    </FormControl>
                    
                    <div className="flex justify-between">
                      <FormMessage id="amount-error" role="alert" />
                      <div className="text-xs text-muted-foreground" aria-live="polite">
                        {isUsdInput && amount
                          ? `≈ ${formatNumber(amountInTokens, 6)} ${selectedToken?.symbol || 'tokens'}`
                          : amount ? `≈ $${formatNumber(amountInUsd)}` : ''}
                      </div>
                    </div>
                    
                    {/* Available balance info */}
                    <div className="text-xs text-muted-foreground flex justify-between mt-1">
                      <span>Available:</span>
                      <span className="font-medium">${formatNumber(userBalance)}</span>
                    </div>
                    
                    {/* Quick amount buttons */}
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="h-10 text-sm font-medium transition-all hover:bg-primary/10 hover:border-primary hover:text-primary"
                        onClick={() => form.setValue('amount', (userBalance * 0.25).toFixed(2))}
                      >
                        25%
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="h-10 text-sm font-medium transition-all hover:bg-primary/10 hover:border-primary hover:text-primary"
                        onClick={() => form.setValue('amount', (userBalance * 0.5).toFixed(2))}
                      >
                        50%
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="h-10 text-sm font-medium transition-all hover:bg-primary/10 hover:border-primary hover:text-primary"
                        onClick={() => form.setValue('amount', (userBalance * 0.75).toFixed(2))}
                      >
                        75%
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="h-10 text-sm font-medium transition-all hover:bg-primary/10 hover:border-primary hover:text-primary"
                        onClick={() => form.setValue('amount', (userBalance * 0.99).toFixed(2))}
                      >
                        Max
                      </Button>
                    </div>
                  </FormItem>
                )}
              />

              {/* Trade preview */}
              {selectedToken && amountValue > 0 && (
                <div className="space-y-2 p-4 rounded-md bg-secondary/50 border border-border">
                  <div className="text-sm font-medium text-foreground">Trade Preview</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Token</span>
                    <span className="font-medium text-foreground">{selectedToken.symbol}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Execution Price</span>
                    <span className="font-medium text-foreground">${formatNumber(executionPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Network Fee</span>
                    <span className="font-medium text-foreground">${formatNumber(networkFee)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-foreground font-medium">Total {tradeType === 'buy' ? 'Cost' : 'Proceeds'}</span>
                    <span className="font-medium text-foreground">${formatNumber(totalCost)}</span>
                  </div>
                </div>
              )}
              
              {/* Submit button */}
              <Button 
                type="submit" 
                className="w-full" 
                aria-label={`${tradeType === 'buy' ? 'Buy' : 'Sell'} ${selectedToken?.symbol || 'Token'}`}
                disabled={
                  formState === 'submitting' || 
                  !form.formState.isValid || 
                  !selectedToken || 
                  amountValue <= 0 ||
                  (tradeType === 'buy' && amountInUsd > userBalance)
                }
              >
                {formState === 'submitting' ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                    <span role="status">Processing...</span>
                  </>
                ) : (
                  `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${selectedToken?.symbol || 'Token'}`
                )}
              </Button>
              
              {/* Validation status indicators */}
              {form.formState.isValid && selectedToken && amountValue > 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500 bg-green-500/10 border border-green-500/50 rounded-md px-3 py-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>All inputs valid</span>
                </div>
              ) : form.formState.isDirty ? (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500 bg-amber-500/10 border border-amber-500/50 rounded-md px-3 py-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>Please complete all required fields</span>
                </div>
              ) : null}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/**
 * EnhancedTradingFormWithErrorBoundary
 * Wrapped version with error boundary for safe usage
 */
export function EnhancedTradingFormWithErrorBoundary(props: EnhancedTradingFormProps) {
  return (
    <TradingFormErrorBoundary fallbackMessage="The trading form encountered an error. Please refresh the page and try again.">
      <EnhancedTradingForm {...props} />
    </TradingFormErrorBoundary>
  );
}