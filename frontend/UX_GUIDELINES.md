# SolSim UX Guidelines: Common Interaction Patterns

## Introduction

This document establishes UX guidelines and interaction patterns for the SolSim trading simulator. These patterns ensure a consistent, intuitive user experience across the application, with special focus on financial trading interactions.

## Core Principles

### 1. Clarity Over Cleverness
- Prioritize clear communication over visual flourishes
- Make financial data immediately understandable
- Use established patterns that users already understand

### 2. Confidence Through Feedback
- Provide immediate feedback for all user actions
- Confirm important actions like trades and transactions
- Show system status at all times (loading, success, error)

### 3. Progressive Disclosure
- Present information in digestible layers
- Don't overwhelm users with all options at once
- Surface advanced features as users gain experience

### 4. Financial Context Awareness
- Always provide market context for decision-making
- Show relevant price information near action points
- Maintain visibility of user's portfolio status

---

## Navigation Patterns

### Global Navigation

**Pattern:** Bottom navigation on mobile, sidebar on desktop

```tsx
// Mobile navigation
<nav className="fixed bottom-0 left-0 right-0 border-t bg-background p-2 md:hidden">
  <div className="flex justify-around">
    <NavButton icon={<Home />} href="/" label="Home" />
    <NavButton icon={<LineChart />} href="/trending" label="Trending" />
    <NavButton icon={<PieChart />} href="/portfolio" label="Portfolio" />
    <NavButton icon={<Settings />} href="/profile" label="Profile" />
  </div>
</nav>

// Desktop sidebar
<aside className="hidden md:block w-64 border-r h-screen">
  <div className="p-4">
    <Logo />
    <nav className="mt-8 space-y-2">
      <NavLink href="/" icon={<Home />}>Dashboard</NavLink>
      <NavLink href="/trending" icon={<LineChart />}>Trending</NavLink>
      <NavLink href="/portfolio" icon={<PieChart />}>Portfolio</NavLink>
      <NavLink href="/trade" icon={<DollarSign />}>Trade</NavLink>
      <NavLink href="/profile" icon={<User />}>Profile</NavLink>
    </nav>
  </div>
</aside>
```

**Guidelines:**
1. Keep navigation visible and accessible at all times
2. Highlight current section clearly
3. Use consistent icons with text labels
4. Group related sections together

### Section Navigation

**Pattern:** Tab navigation for related content sections

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="positions">Positions</TabsTrigger>
    <TabsTrigger value="history">History</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    <PortfolioOverview />
  </TabsContent>
  <TabsContent value="positions">
    <ActivePositions />
  </TabsContent>
  <TabsContent value="history">
    <TradeHistory />
  </TabsContent>
</Tabs>
```

**Guidelines:**
1. Use tabs for related content within the same context
2. Order tabs by frequency of use (most common first)
3. Preserve tab state during session when possible
4. Limit to 2-5 tabs per section

---

## Trading Interaction Patterns

### Token Selection

**Pattern:** Search with tokenized selections and metadata

```tsx
<div className="space-y-2">
  <Label htmlFor="token-search">Select Token</Label>
  <TokenSearch
    id="token-search"
    placeholder="Search by name or address"
    onSelect={handleTokenSelect}
    selectedToken={selectedToken}
    recentTokens={recentTokens}
  />
  
  {selectedToken && (
    <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-secondary">
      <Avatar className="w-8 h-8">
        <AvatarImage src={selectedToken.logoUrl} alt={selectedToken.name} />
        <AvatarFallback>{selectedToken.symbol.substring(0, 2)}</AvatarFallback>
      </Avatar>
      <div>
        <div className="font-medium">{selectedToken.name}</div>
        <div className="text-xs text-muted-foreground">{selectedToken.symbol}</div>
      </div>
      <div className="ml-auto">
        <TrendIndicator value={selectedToken.priceChangePercent24h} />
      </div>
    </div>
  )}
</div>
```

**Guidelines:**
1. Support both search by name and address
2. Show token metadata (logo, name, symbol)
3. Include price change indication
4. Display recently used tokens for quick access
5. Provide clear feedback when token is selected

### Trade Entry Form

**Pattern:** Clear action tabs with amount input and preview

```tsx
<Card>
  <CardHeader>
    <CardTitle>Trade {selectedToken?.name}</CardTitle>
    <CardDescription>
      Current Price: ${formatNumber(currentPrice)}
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Tabs defaultValue="buy">
      <TabsList className="grid grid-cols-2 mb-4">
        <TabsTrigger value="buy">Buy</TabsTrigger>
        <TabsTrigger value="sell">Sell</TabsTrigger>
      </TabsList>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Amount input with USD toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">USD</span>
                <Switch
                  checked={isUsdInput}
                  onCheckedChange={setIsUsdInput}
                />
                <span className="text-xs text-muted-foreground">{selectedToken?.symbol}</span>
              </div>
            </div>
            
            <div className="relative">
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="pl-8"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                {isUsdInput ? '$' : ''}
              </div>
            </div>
            
            {/* Conversion display */}
            <div className="text-xs text-muted-foreground text-right">
              {isUsdInput
                ? `≈ ${formatNumber(amountInTokens)} ${selectedToken?.symbol}`
                : `≈ $${formatNumber(amountInUsd)}`
              }
            </div>
          </div>
          
          {/* Trade preview */}
          {amount > 0 && (
            <div className="space-y-2 p-3 rounded-md bg-secondary">
              <div className="text-sm font-medium">Trade Preview</div>
              <div className="flex justify-between text-sm">
                <span>Execution Price</span>
                <span className="font-medium">${formatNumber(executionPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Network Fee</span>
                <span className="font-medium">$0.00</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-medium">${formatNumber(totalCost)}</span>
              </div>
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={!isValid || isLoading}>
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Processing...
              </>
            ) : (
              `${activeTab === 'buy' ? 'Buy' : 'Sell'} ${selectedToken?.symbol}`
            )}
          </Button>
        </div>
      </form>
    </Tabs>
  </CardContent>
</Card>
```

**Guidelines:**
1. Always show current price near action buttons
2. Toggle between USD and token units for amount input
3. Show real-time conversion between units
4. Display a trade preview before confirmation
5. Disable the action button when form is invalid
6. Show loading state during submission

### Trade Confirmation

**Pattern:** Two-step confirmation for trades

```tsx
// Confirmation Dialog
<AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirm {tradeType} Order</AlertDialogTitle>
      <AlertDialogDescription>
        Please review your order details before confirming.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <div className="space-y-4 py-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={token.logoUrl} alt={token.name} />
            <AvatarFallback>{token.symbol.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{token.name}</div>
            <div className="text-xs text-muted-foreground">{token.symbol}</div>
          </div>
        </div>
        <TrendIndicator value={token.priceChangePercent24h} />
      </div>
      
      <Separator />
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Type</span>
          <span className="font-medium capitalize">{tradeType}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Amount</span>
          <span className="font-medium">{tokenAmount} {token.symbol}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Price</span>
          <span className="font-medium">${formatNumber(executionPrice)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Total Value</span>
          <span className="font-medium">${formatNumber(totalValue)}</span>
        </div>
      </div>
    </div>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction 
        onClick={handleConfirm}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Processing...
          </>
        ) : (
          `Confirm ${tradeType}`
        )}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Guidelines:**
1. Always use two-step confirmation for trades
2. Display complete order details in confirmation dialog
3. Show token information clearly
4. Display total value prominently
5. Provide easy cancellation option
6. Show loading state during submission

### Trade Outcomes

**Pattern:** Clear success and error states

```tsx
// Success toast notification
<Toast>
  <div className="flex">
    <div className="flex-shrink-0">
      <CheckCircleIcon className="h-5 w-5 text-green-400" />
    </div>
    <div className="ml-3">
      <p className="text-sm font-medium text-gray-900">
        Trade successful
      </p>
      <p className="mt-1 text-sm text-gray-500">
        {tradeType === 'buy' ? 'Bought' : 'Sold'} {tokenAmount} {token.symbol} at ${formatNumber(executionPrice)}
      </p>
    </div>
  </div>
</Toast>

// Error state
<Toast variant="destructive">
  <div className="flex">
    <div className="flex-shrink-0">
      <XCircleIcon className="h-5 w-5 text-red-400" />
    </div>
    <div className="ml-3">
      <p className="text-sm font-medium">
        Trade failed
      </p>
      <p className="mt-1 text-sm opacity-90">
        {errorMessage}
      </p>
      <div className="mt-2">
        <Button variant="outline" size="sm" onClick={retryTransaction}>
          Retry
        </Button>
      </div>
    </div>
  </div>
</Toast>
```

**Guidelines:**
1. Show clear success confirmation with trade details
2. For errors, explain what happened in plain language
3. Provide retry option when appropriate
4. Update portfolio/balance immediately on success
5. Direct users to relevant next steps

---

## Data Visualization Patterns

### Price & Trend Displays

**Pattern:** Consistent price formatting with trend indicators

```tsx
<div className="space-y-1">
  <div className="flex items-baseline gap-2">
    <span className="text-2xl font-semibold tabular-nums">
      ${formatNumber(price)}
    </span>
    <TrendIndicator value={priceChange24h} size="lg" />
  </div>
  <BodySmall>
    24h Volume: ${formatNumber(volume24h)}
  </BodySmall>
</div>
```

**Guidelines:**
1. Always use tabular-nums for price alignment
2. Format prices consistently (e.g., always with 2 decimal places)
3. Include trend indicators with price changes
4. Provide context (e.g., 24h change)

### Portfolio Performance

**Pattern:** Card-based metrics with consistent styling

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
  <StatCard
    title="Portfolio Value"
    value={`$${formatNumber(portfolioValue)}`}
    change={portfolioChange24h}
    changeSuffix="%"
    icon={<Wallet className="h-4 w-4" />}
  />
  
  <StatCard
    title="Total Profit/Loss"
    value={`$${formatNumber(totalPnL)}`}
    change={pnlChangePercent}
    changeSuffix="%"
    icon={totalPnL >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
    trend={totalPnL >= 0 ? 'positive' : 'negative'}
  />
  
  <StatCard
    title="Active Positions"
    value={activePositions.length.toString()}
    icon={<Briefcase className="h-4 w-4" />}
    trend="neutral"
  />
  
  <StatCard
    title="Total Trades"
    value={totalTrades.toString()}
    icon={<Activity className="h-4 w-4" />}
    trend="neutral"
  />
</div>
```

**Guidelines:**
1. Group related metrics together
2. Use consistent visual hierarchy for each metric
3. Include trend indicators for changes over time
4. Use appropriate icons to reinforce meaning
5. Apply semantic coloring (profit = green, loss = red)

### Charts & Graphs

**Pattern:** Interactive charts with consistent controls

```tsx
<Card>
  <CardHeader>
    <CardTitle>Price History</CardTitle>
    <div className="flex space-x-2">
      <Button variant="outline" size="sm" onClick={() => setTimeframe('1D')}>1D</Button>
      <Button variant="outline" size="sm" onClick={() => setTimeframe('1W')}>1W</Button>
      <Button variant="outline" size="sm" onClick={() => setTimeframe('1M')}>1M</Button>
      <Button variant="outline" size="sm" onClick={() => setTimeframe('3M')}>3M</Button>
      <Button variant="outline" size="sm" onClick={() => setTimeframe('1Y')}>1Y</Button>
      <Button variant="outline" size="sm" onClick={() => setTimeframe('ALL')}>ALL</Button>
    </div>
  </CardHeader>
  <CardContent>
    {isLoading ? (
      <ChartSkeleton />
    ) : (
      <PriceChart
        data={chartData}
        timeframe={timeframe}
        onHover={handleChartHover}
        showVolume={showVolume}
      />
    )}
  </CardContent>
  <CardFooter className="justify-between">
    <div className="flex items-center gap-2">
      <Switch
        id="show-volume"
        checked={showVolume}
        onCheckedChange={setShowVolume}
      />
      <Label htmlFor="show-volume">Show volume</Label>
    </div>
    <Button variant="ghost" size="sm" onClick={refreshChart}>
      <RefreshCw className="h-4 w-4 mr-2" />
      Refresh
    </Button>
  </CardFooter>
</Card>
```

**Guidelines:**
1. Provide timeframe options for charts
2. Show loading state (skeleton) during data fetch
3. Allow toggling of additional data layers (e.g., volume)
4. Use semantic colors for price movements
5. Provide hover/touch interaction for detailed data points
6. Maintain proper aspect ratio for charts
7. Offer refresh option for real-time data

---

## Form Patterns

### Input Validation

**Pattern:** Immediate inline validation with clear feedback

```tsx
<div className="space-y-1">
  <Label 
    htmlFor="email"
    className={cn(errors.email && "text-destructive")}
  >
    Email
  </Label>
  <Input
    id="email"
    type="email"
    value={email}
    onChange={handleEmailChange}
    aria-invalid={!!errors.email}
    className={cn(errors.email && "border-destructive focus-visible:ring-destructive")}
  />
  {errors.email && (
    <p className="text-xs text-destructive mt-1">{errors.email}</p>
  )}
</div>
```

**Guidelines:**
1. Validate on blur, not on each keystroke
2. Show clear error messages below the field
3. Use color and icons to reinforce validation state
4. Maintain field value even when invalid
5. Group related fields together
6. Provide helper text for complex inputs

### Success & Error States

**Pattern:** Clear form-level feedback

```tsx
{formState === 'error' && (
  <Alert variant="destructive" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      {formError || "There was a problem submitting the form. Please try again."}
    </AlertDescription>
  </Alert>
)}

{formState === 'success' && (
  <Alert variant="success" className="mb-4">
    <CheckCircle className="h-4 w-4" />
    <AlertTitle>Success</AlertTitle>
    <AlertDescription>
      Your profile has been updated successfully.
    </AlertDescription>
  </Alert>
)}

<form onSubmit={handleSubmit} className="space-y-4">
  {/* Form fields */}
  
  <Button 
    type="submit"
    disabled={isSubmitting || !isValid}
    className="w-full"
  >
    {isSubmitting ? (
      <>
        <Spinner className="mr-2 h-4 w-4" />
        Saving...
      </>
    ) : (
      'Save Changes'
    )}
  </Button>
</form>
```

**Guidelines:**
1. Show form-level errors at the top of the form
2. Include success confirmation when appropriate
3. Disable submit button during submission
4. Show loading state during submission
5. Maintain form values after error for correction
6. Use consistent button text (e.g., "Save" not "Submit")

---

## Empty & Loading States

### Loading States

**Pattern:** Skeleton loaders that match content structure

```tsx
// Card skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-3/4" />
    <Skeleton className="h-4 w-1/2 mt-2" />
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <Skeleton className="h-28 w-full" /> {/* Chart placeholder */}
      <div className="flex justify-between">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
  </CardContent>
</Card>

// Table skeleton
<div className="space-y-3">
  <div className="flex gap-4">
    <Skeleton className="h-8 w-1/6" />
    <Skeleton className="h-8 w-1/6" />
    <Skeleton className="h-8 w-1/6" />
    <Skeleton className="h-8 w-1/6" />
    <Skeleton className="h-8 w-1/6" />
    <Skeleton className="h-8 w-1/6" />
  </div>
  {Array(5).fill(null).map((_, i) => (
    <div key={i} className="flex gap-4">
      <Skeleton className="h-12 w-1/6" />
      <Skeleton className="h-12 w-1/6" />
      <Skeleton className="h-12 w-1/6" />
      <Skeleton className="h-12 w-1/6" />
      <Skeleton className="h-12 w-1/6" />
      <Skeleton className="h-12 w-1/6" />
    </div>
  ))}
</div>
```

**Guidelines:**
1. Match the shape and structure of the expected content
2. Use subtle animation for loading indication
3. Maintain consistent layout during loading to prevent layout shifts
4. Show loading states for any operation taking >300ms

### Empty States

**Pattern:** Helpful empty states with clear actions

```tsx
<Card className="flex flex-col items-center justify-center text-center p-8">
  <div className="rounded-full bg-muted p-4 mb-4">
    <Icon className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-medium mb-2">No active positions</h3>
  <p className="text-muted-foreground mb-4">
    You don't have any active trading positions yet.
  </p>
  <Button asChild>
    <Link href="/trending">
      <Search className="mr-2 h-4 w-4" />
      Find tokens to trade
    </Link>
  </Button>
</Card>
```

**Guidelines:**
1. Use illustrations or icons to visually communicate the empty state
2. Explain why the content is empty in plain language
3. Provide a clear next action when appropriate
4. Maintain visual hierarchy with proper spacing
5. Keep empty states simple and focused

---

## Notifications & Alerts

### Toast Notifications

**Pattern:** Consistent toast notifications for system messages

```tsx
// In a component
const { toast } = useToast()

// Success toast
toast({
  title: "Order placed",
  description: `Successfully purchased ${amount} ${token.symbol} for $${totalCost}`,
  variant: "success",
})

// Error toast
toast({
  title: "Transaction failed",
  description: errorMessage,
  variant: "destructive",
  action: <ToastAction altText="Retry">Retry</ToastAction>,
})

// Info toast
toast({
  title: "Price alert",
  description: `SOL price has increased by 5% in the last hour`,
  variant: "default",
})
```

**Guidelines:**
1. Keep toast messages brief and focused
2. Use consistent variants for different message types
3. Include actions when relevant (e.g., Retry, View)
4. Display toast notifications in a consistent location
5. Limit the number of simultaneous toasts
6. Auto-dismiss non-critical toasts after a few seconds

### In-App Alerts

**Pattern:** Contextual alerts for important information

```tsx
// Warning alert for market volatility
<Alert variant="warning" className="mb-4">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>Market Volatility</AlertTitle>
  <AlertDescription>
    The market for this token is currently experiencing high volatility.
    Trade with caution.
  </AlertDescription>
</Alert>

// Info alert for maintenance
<Alert variant="info" className="mb-4">
  <Info className="h-4 w-4" />
  <AlertTitle>Scheduled Maintenance</AlertTitle>
  <AlertDescription>
    SolSim will be undergoing maintenance on October 10th from 2-4 AM UTC.
    <Button variant="link" className="h-auto p-0 ml-1" asChild>
      <Link href="/status">Learn more</Link>
    </Button>
  </AlertDescription>
</Alert>
```

**Guidelines:**
1. Place alerts close to relevant content
2. Use appropriate variants for different alert types
3. Keep alert messages clear and concise
4. Include actions when relevant
5. Don't overuse alerts or they'll lose impact

---

## Mobile-Specific Patterns

### Responsive Layouts

**Pattern:** Mobile-first design with responsive breakpoints

```tsx
// Mobile-first grid layout
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => (
    <Card key={item.id}>
      {/* Card content */}
    </Card>
  ))}
</div>

// Stack on mobile, side-by-side on desktop
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/3">
    <Sidebar />
  </div>
  <div className="w-full md:w-2/3">
    <MainContent />
  </div>
</div>
```

**Guidelines:**
1. Design for mobile first, then enhance for larger screens
2. Stack elements vertically on mobile
3. Use appropriate touch target sizes (min 44px)
4. Simplify complex interfaces on small screens
5. Maintain consistent spacing scales across breakpoints

### Touch Interactions

**Pattern:** Touch-optimized controls

```tsx
// Touch-friendly dropdown
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" className="py-6 px-4">
      <span>Select Token</span>
      <ChevronDown className="ml-2 h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="min-w-[220px]">
    {tokens.map(token => (
      <DropdownMenuItem
        key={token.id}
        className="py-3"
        onClick={() => selectToken(token)}
      >
        <div className="flex items-center">
          <Avatar className="mr-2 h-6 w-6">
            <AvatarImage src={token.logoUrl} alt={token.name} />
            <AvatarFallback>{token.symbol.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <span>{token.name}</span>
        </div>
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>

// Touch-friendly number input
<div>
  <Label htmlFor="amount">Amount</Label>
  <div className="flex mt-1 rounded-md">
    <Button
      type="button"
      variant="outline"
      className="rounded-r-none px-3"
      onClick={() => updateAmount(amount - 1)}
      disabled={amount <= 1}
    >
      <Minus className="h-4 w-4" />
    </Button>
    <Input
      id="amount"
      type="number"
      className="rounded-none text-center border-x-0"
      value={amount}
      onChange={(e) => updateAmount(Number(e.target.value))}
      min={1}
    />
    <Button
      type="button"
      variant="outline"
      className="rounded-l-none px-3"
      onClick={() => updateAmount(amount + 1)}
    >
      <Plus className="h-4 w-4" />
    </Button>
  </div>
</div>
```

**Guidelines:**
1. Make touch targets at least 44px in height
2. Provide ample spacing between interactive elements (min 8px)
3. Use appropriate input types for mobile (e.g., number keyboard)
4. Implement touch-friendly alternatives to hover states
5. Support both touch and mouse interactions

---

## Accessibility Patterns

### Keyboard Navigation

**Pattern:** Keyboard focus management

```tsx
// Focus trap for modal dialogs
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Settings</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Profile Settings</DialogTitle>
      <DialogDescription>
        Update your profile information and preferences.
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      {/* Form fields */}
    </div>
    <DialogFooter>
      <Button type="button" variant="secondary" onClick={handleCancel}>
        Cancel
      </Button>
      <Button type="button" onClick={handleSave}>
        Save Changes
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Guidelines:**
1. Ensure all interactive elements are keyboard accessible
2. Provide visible focus indicators
3. Maintain logical tab order
4. Use focus traps for modal dialogs
5. Support keyboard shortcuts for common actions

### Screen Reader Support

**Pattern:** Proper ARIA attributes and semantic HTML

```tsx
// Accessible trend indicator
<div 
  className={cn(
    "flex items-center gap-1",
    value > 0 ? "text-profit" : value < 0 ? "text-loss" : "text-muted-foreground"
  )}
  aria-label={`${value > 0 ? "Up" : value < 0 ? "Down" : "Unchanged"} ${Math.abs(value)}%`}
>
  {value > 0 ? (
    <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
  ) : value < 0 ? (
    <ArrowDownIcon className="h-4 w-4" aria-hidden="true" />
  ) : (
    <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
  )}
  <span className="sr-only">{value > 0 ? "Up" : value < 0 ? "Down" : "Unchanged"}</span>
  <span>{Math.abs(value).toFixed(2)}%</span>
</div>

// Accessible loading state
<Button disabled={isLoading} type="submit">
  {isLoading ? (
    <>
      <Spinner className="mr-2 h-4 w-4" aria-hidden="true" />
      <span>Processing...</span>
      <span className="sr-only">Please wait while your request is being processed</span>
    </>
  ) : (
    "Submit"
  )}
</Button>
```

**Guidelines:**
1. Use semantic HTML elements
2. Add appropriate ARIA attributes when needed
3. Provide text alternatives for non-text content
4. Ensure sufficient color contrast
5. Test with screen readers

---

## Form Validation

### Validation Patterns

SolSim uses a consistent approach to form validation built on React Hook Form and zod validation schemas. All forms should follow these patterns:

#### 1. Basic Validation
- Required fields are clearly marked
- Validation errors appear below the affected field
- Errors are descriptive and suggest how to fix the issue
- Error states are visually distinct (red outline, error icon)

#### 2. Multi-Field Validation
- For interdependent fields (e.g., password confirmation), validate as a group
- Display errors at the field level when possible
- For complex validations affecting multiple fields, show a form-level error

#### 3. Asynchronous Validation
- Show loading indicators during async validation
- Don't block form submission while checking (validate on submit)
- Cache validation results when appropriate (e.g., username availability)
- Provide clear error messages for server-side validation failures

#### 4. Conditional Validation
- Only validate fields that are relevant to the current form state
- Clearly indicate when fields become required based on other selections
- Use progressive disclosure to show conditional fields only when needed

### Implementation

```typescript
// Example zod schema with multiple validation patterns
const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }
);
```

See `components/shared/ValidationPatterns.tsx` for reference implementations of all validation patterns.

## Data Fetching

SolSim uses React Query for data fetching, providing a consistent pattern for handling API requests, caching, and state management.

### Core Principles

1. **Separation of Concerns**: API calls are separated from components using custom hooks
2. **Consistent Loading States**: All data-fetching components show consistent loading indicators
3. **Error Handling**: Standardized error handling across all data fetching operations
4. **Optimistic Updates**: Use optimistic updates for better perceived performance
5. **Cache Management**: Intelligent cache invalidation to keep data fresh

### Implementation Patterns

#### Data Fetching Hooks

All data fetching should use custom React Query hooks from `hooks/use-react-query-hooks.ts`:

```typescript
// Example usage
import { usePortfolio, useTokenDetails } from '@/hooks/use-react-query-hooks';

function PortfolioComponent() {
  const { data, isLoading, error } = usePortfolio();
  
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState />;
  
  return <div>{/* Render portfolio data */}</div>;
}
```

#### Loading States

Loading states should be implemented using the following patterns:

1. **Skeleton Loaders**: For initial content loading
2. **Progress Indicators**: For operations with known progress
3. **Inline Spinners**: For small elements or partial updates
4. **Disabled States**: Show disabled state during submission/loading

#### Error States

Error handling follows these patterns:

1. **Inline Errors**: Display errors next to relevant content
2. **Retry Mechanism**: Allow users to retry failed operations
3. **Fallback Content**: Show fallback UI when data can't be loaded
4. **Error Boundaries**: Catch and display errors at appropriate component boundaries

See `components/trading/ReactQueryTradingForm.tsx` for reference implementation.

## Mobile-Specific Patterns

### Responsive Layouts

**Pattern:** Mobile-first design with responsive breakpoints

```tsx
// Mobile-first grid layout
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => (
    <Card key={item.id}>
      {/* Card content */}
    </Card>
  ))}
</div>

// Stack on mobile, side-by-side on desktop
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/3">
    <Sidebar />
  </div>
  <div className="w-full md:w-2/3">
    <MainContent />
  </div>
</div>
```

### Mobile-Optimized Components

The `MobilePortfolioView` component demonstrates best practices for mobile design:

- Tab navigation for content organization
- Compact holding cards for efficient space usage
- Clear hierarchy with prominent portfolio value
- Loading skeletons matching final content shape
- Touch-friendly hit areas for interaction

```tsx
<Card className="w-full">
  <CardHeader className="pb-2">
    <CardTitle className="flex justify-between items-center">
      <span>Portfolio</span>
      <Badge variant={pnlPercentage >= 0 ? 'outline' : 'destructive'}>
        {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%
      </Badge>
    </CardTitle>
    <CardDescription className="text-2xl font-semibold">
      ${totalValueUsd.toLocaleString()}
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Tabs className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="holdings">Holdings</TabsTrigger>
        <TabsTrigger value="chart">Chart</TabsTrigger>
      </TabsList>
      
      {/* Tab content here */}
    </Tabs>
  </CardContent>
</Card>
```

See `components/portfolio/MobilePortfolioView.tsx` for complete implementation.

### Touch Interactions

**Guidelines:**
1. Make touch targets at least 44px in height
2. Provide ample spacing between interactive elements (min 8px)
3. Use appropriate input types for mobile (e.g., number keyboard)
4. Implement touch-friendly alternatives to hover states
5. Support both touch and mouse interactions

## Component Documentation

SolSim uses Storybook for component documentation, providing living examples of all UI patterns and components.

### Storybook Organization

Components are organized in Storybook by functional area:
- **Trading**: Trade execution components
- **Portfolio**: Portfolio management and display
- **Forms**: Form components and validation patterns
- **UI**: Base UI components (buttons, cards, etc.)

### Component Stories

Each component should have the following stories:
1. **Default**: Basic implementation with typical props
2. **Variants**: Different visual or functional variants
3. **States**: Different states (loading, error, empty, etc.)
4. **Responsive**: Demonstration of responsive behavior

### Component Documentation

Component documentation should include:
1. **Description**: What the component does
2. **Props API**: All available props with descriptions
3. **Usage Examples**: Code snippets showing common usage
4. **Best Practices**: Guidelines for when/how to use the component

See the Storybook documentation for complete component reference.

## Implementation Checklist

When implementing any user interaction in SolSim, ensure that it follows these guidelines:

- [ ] **Clarity**: Is the interaction clear and intuitive?
- [ ] **Feedback**: Does the interaction provide appropriate feedback?
- [ ] **Consistency**: Does the interaction follow established patterns?
- [ ] **Accessibility**: Is the interaction accessible to all users?
- [ ] **Mobile Support**: Does the interaction work well on mobile devices?
- [ ] **Performance**: Is the interaction responsive and performant?
- [ ] **Validation**: Does it follow our form validation patterns?
- [ ] **Data Fetching**: Does it use React Query hooks for data operations?
- [ ] **Documentation**: Is it documented in Storybook with examples?

---

## Revision History

- **Oct 8, 2025**: Initial guidelines document created
- **Oct 8, 2025**: Added financial-specific interaction patterns
- **Current Date**: Added form validation patterns, React Query integration, mobile-optimized components, and Storybook documentation guidelines

---

*For questions or suggestions regarding these UX guidelines, please contact the SolSim design team.*