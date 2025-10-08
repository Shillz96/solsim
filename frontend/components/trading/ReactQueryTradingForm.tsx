"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useExecuteTrade, useTokenDetails, useBalance } from '@/hooks/use-react-query-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowUpDown } from 'lucide-react';

// Trade form schema
const tradeFormSchema = z.object({
  tokenAddress: z.string().min(1, { message: "Token is required" }),
  amountSol: z
    .string()
    .min(1, { message: "Amount is required" })
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;

interface ReactQueryTradingFormProps {
  initialTokenAddress?: string;
  className?: string;
}

export function ReactQueryTradingForm({ 
  initialTokenAddress = '', 
  className = '' 
}: ReactQueryTradingFormProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [selectedToken, setSelectedToken] = useState<string | null>(
    initialTokenAddress || null
  );
  
  // React Query hooks
  const balance = useBalance();
  const tokenDetails = useTokenDetails(selectedToken);
  const trade = useExecuteTrade();

  // Form definition
  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      tokenAddress: initialTokenAddress || '',
      amountSol: '',
    },
  });

  // Form submission handler
  const onSubmit = async (values: TradeFormValues) => {
    try {
      await trade.mutateAsync({
        action: activeTab,
        tokenAddress: values.tokenAddress,
        amountSol: parseFloat(values.amountSol),
      });
      
      // Reset amount field after successful trade
      form.reset({ 
        tokenAddress: values.tokenAddress,
        amountSol: ''
      });
      
      // You could show a success toast here
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle>Trade with React Query</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'buy' | 'sell')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="sell">Sell</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              {/* Token selection field would go here */}
              <FormField
                control={form.control}
                name="tokenAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Token address"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setSelectedToken(e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Token details from React Query */}
              {selectedToken && tokenDetails.isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading token details...</span>
                </div>
              )}
              
              {selectedToken && tokenDetails.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Could not load token details
                  </AlertDescription>
                </Alert>
              )}
              
              {selectedToken && tokenDetails.data && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <div className="flex justify-between">
                    <span>Token Name:</span>
                    <span className="font-medium">{tokenDetails.data.tokenName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Price:</span>
                    <span className="font-medium">${tokenDetails.data.price || 'N/A'}</span>
                  </div>
                </div>
              )}

              {/* User balance from React Query */}
              <div className="flex justify-between text-sm">
                <span>Available Balance:</span>
                <span className="font-medium">
                  {balance.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  ) : balance.data ? (
                    `${balance.data.toFixed(4)} SOL`
                  ) : (
                    'Error loading balance'
                  )}
                </span>
              </div>

              {/* Amount field */}
              <FormField
                control={form.control}
                name="amountSol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (SOL)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.001"
                        min="0"
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Submit button with loading state */}
              <Button 
                type="submit" 
                className="w-full" 
                variant={activeTab === 'buy' ? 'default' : 'destructive'}
                disabled={trade.isPending}
              >
                {trade.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {activeTab === 'buy' ? 'Buy Token' : 'Sell Token'}
              </Button>
              
              {/* Display trade error */}
              {trade.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {(trade.error as Error)?.message || 'Trade failed'}
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </Form>
        </Tabs>
      </CardContent>
    </Card>
  );
}