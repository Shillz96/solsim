# SolSim Component Implementation Standards

This document outlines the technical implementation standards for components in the SolSim frontend application, focusing on validation patterns, data fetching, error handling, and other key aspects.

## Form Validation Patterns

### Zod Schema Validation

All form components should use Zod for validation with React Hook Form:

```tsx
// Define schema with context-aware validation
const createTradingFormSchema = (balance: number, minTradeAmount: number = 0.1) => {
  return z.object({
    tradeType: z.enum(['buy', 'sell']),
    token: z.object({
      id: z.string(),
      name: z.string(),
      symbol: z.string(),
    }).nullable().refine(val => val !== null, {
      message: "Token selection is required"
    }),
    amount: z.string()
      .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Amount must be greater than 0"
      })
      .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= minTradeAmount, {
        message: `Minimum trade amount is ${minTradeAmount}`
      })
      .refine(
        (val) => {
          // Conditional validation based on trade type
          if (tradeType === 'buy') {
            return parseFloat(val) <= balance;
          }
          return true;
        },
        { message: "Insufficient balance for this trade" }
      ),
    isUsdInput: z.boolean(),
  });
};

// Use with React Hook Form
const form = useForm<TradingFormData>({
  resolver: zodResolver(tradingFormSchema),
  defaultValues: {
    tradeType: 'buy',
    token: null,
    amount: '',
    isUsdInput: true,
  },
  mode: 'onChange', // Validate on each change
});
```

### Multi-Field Validation

For validations involving multiple fields, use `refine` with access to the entire form:

```tsx
const transferFormSchema = z.object({
  recipient: z.string().min(1, "Recipient is required"),
  amount: z.string().min(1, "Amount is required"),
}).refine(data => {
  // Cross-field validation
  const amount = parseFloat(data.amount);
  return amount <= userBalance;
}, {
  message: "Transfer amount exceeds available balance",
  path: ["amount"] // Highlight which field has the error
});
```

### Async Validation

For server-dependent checks, use async validation with `refine`:

```tsx
const registrationSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
}).refine(
  async (data) => {
    // Check if username is available
    const response = await fetch(`/api/check-username?username=${data.username}`);
    const result = await response.json();
    return result.isAvailable;
  },
  {
    message: "Username is already taken",
    path: ["username"]
  }
);
```

## Data Fetching with React Query

### Query Hook Pattern

Use custom hooks for data fetching with React Query:

```tsx
// API hook for trending tokens
export function useTrendingTokens(limit = 10) {
  return useQuery({
    queryKey: ['trendingTokens', limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      
      const response = await apiClient.get<{ tokens: TrendingToken[] }>
        (`/api/solana-tracker/trending?${params.toString()}`);
      return response.tokens;
    },
    staleTime: 60000, // 1 minute
  });
}

// Component usage with loading/error states
function TrendingTokensList() {
  const { data, isLoading, error } = useTrendingTokens(5);
  
  if (isLoading) return <TrendingTokensSkeleton />;
  if (error) return <ErrorState message="Failed to load trending tokens" />;
  
  return (
    <ul>
      {data.map(token => (
        <TrendingTokenItem key={token.address} token={token} />
      ))}
    </ul>
  );
}
```

### Mutation Pattern

Use mutations for data modification operations:

```tsx
// API mutation hook
export function useExecuteTrade() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tradeData: TradeRequest) => {
      const response = await apiClient.post<TradeResponse>('/api/v1/trades', tradeData);
      return response;
    },
    onSuccess: () => {
      // Invalidate affected queries after successful trade
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// Component usage
function TradingForm() {
  const { mutate, isPending, isError } = useExecuteTrade();
  
  const handleSubmit = (data: TradeFormData) => {
    mutate(data, {
      onSuccess: () => {
        toast.success('Trade executed successfully');
      },
      onError: (error) => {
        toast.error(`Trade failed: ${error.message}`);
      }
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Processing...' : 'Execute Trade'}
      </Button>
    </form>
  );
}
```

## Error Handling

### Component Error States

Implement consistent error states in components:

```tsx
// Loading and error states
if (isLoading) return <PortfolioSkeleton />;

if (isError || !portfolio) {
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive">
            {(error as Error)?.message || "Failed to load portfolio data"}
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Error Boundaries

Use Error Boundaries to catch rendering errors:

```tsx
import { ErrorBoundaryEnhanced } from '@/components/error-boundary-enhanced';

// In parent component
<ErrorBoundaryEnhanced
  fallback={<TradingErrorFallback onRetry={handleRetry} />}
  onError={(error, info) => errorLogger.logError(error, info)}
>
  <TradingForm />
</ErrorBoundaryEnhanced>
```

## Utility Function Usage

### Formatting Functions

Use the shared utility functions for consistent formatting:

```tsx
import { formatNumber, formatPercent } from '@/lib/utils';

// Format currency values
<span>${formatNumber(price, 2)}</span> // Default 2 decimal places

// Format percentages with sign
<span className={pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
  {formatPercent(pnl)}
</span> // Outputs "+12.34%" or "-12.34%"
```

### Component Class Merging

Use the `cn` utility for class name merging:

```tsx
import { cn } from '@/lib/utils';

function Button({ className, ...props }) {
  return (
    <button 
      className={cn(
        "px-4 py-2 rounded bg-primary text-primary-foreground",
        className
      )}
      {...props}
    />
  );
}
```

## Component Documentation

### Component JSDoc

Document components with JSDoc for better development experience:

```tsx
/**
 * Enhanced trading form with advanced validation
 * 
 * Features:
 * - FIFO accounting for accurate P&L
 * - Real-time price updates
 * - Multi-field validation
 * - Responsive layout for mobile
 * 
 * @example
 * <EnhancedTradingForm 
 *   tokens={availableTokens} 
 *   userBalance={100} 
 * />
 */
export function EnhancedTradingForm({ tokens, userBalance }: EnhancedTradingFormProps) {
  // ...
}
```

### Storybook Documentation

Provide comprehensive documentation in Storybook:

```tsx
const meta: Meta<typeof EnhancedTradingForm> = {
  title: 'Trading/EnhancedTradingForm',
  component: EnhancedTradingForm,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
A trading form component that handles token selection, amount input, and trade execution.
It includes advanced validation, real-time price updates, and responsive design for mobile devices.
        `,
      },
    },
  },
  argTypes: {
    tokens: { control: 'object', description: 'Available tokens for trading' },
    userBalance: { control: 'number', description: 'User\'s available balance' },
  }
};

export default meta;
```

## Mobile Responsiveness

See the [MOBILE_GUIDELINES.md](./MOBILE_GUIDELINES.md) document for detailed mobile implementation standards.