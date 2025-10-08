"use client";

import React, { useState } from 'react';
import { useTransactions } from '@/hooks/use-react-query-hooks';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  ArrowDownUp,
  Calendar,
  Loader2,
  RefreshCw,
  History,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface TransactionHistoryProps {
  className?: string;
  pageSize?: number;
  initialPage?: number;
  showPagination?: boolean;
}

export function TransactionHistory({
  className = '',
  pageSize = 10,
  initialPage = 1,
  showPagination = true,
}: TransactionHistoryProps) {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');
  
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    isPlaceholderData,
  } = useTransactions(pageSize, currentPage);

  // Handle filter change
  const handleFilterChange = (value: string) => {
    setFilter(value as 'all' | 'buy' | 'sell');
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Function to get badge variant based on action
  const getBadgeVariant = (action: string) => {
    if (action.toLowerCase() === 'buy') return 'outline';
    if (action.toLowerCase() === 'sell') return 'destructive';
    return 'secondary';
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy HH:mm');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Filter transactions based on the selected filter
  const filteredTransactions = data?.transactions
    ? filter === 'all'
      ? data.transactions
      : data.transactions.filter(tx => tx.action.toLowerCase() === filter)
    : [];

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Transaction History</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
        <div className="flex justify-between items-center">
          <CardDescription>
            Your recent trading activity
          </CardDescription>
          <Select
            value={filter}
            onValueChange={handleFilterChange}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Filter by</SelectLabel>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="buy">Buy Orders</SelectItem>
                <SelectItem value="sell">Sell Orders</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <TransactionSkeleton key={i} />
            ))}
          </div>
        )}

        {isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {(error as Error)?.message || 'Failed to load transaction history'}
            </AlertDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Try Again
            </Button>
          </Alert>
        )}

        {!isLoading && !isError && filteredTransactions.length === 0 && (
          <div className="text-center py-8">
            <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        )}

        {!isLoading && !isError && filteredTransactions.length > 0 && (
          <div className="space-y-3">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-3">
                    {tx.token?.logoUrl ? (
                      <AvatarImage src={tx.token.logoUrl} alt={tx.token?.symbol || 'Token'} />
                    ) : null}
                    <AvatarFallback>{tx.token?.symbol?.substring(0, 2) || 'TX'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium flex items-center">
                      <span>{tx.token?.name || 'Unknown Token'}</span>
                      <Badge
                        variant={getBadgeVariant(tx.action)}
                        className="ml-2 font-normal"
                      >
                        {tx.action}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(tx.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {tx.tokenAmount} {tx.token?.symbol || 'tokens'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${tx.amountUsd?.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {showPagination && data && data.totalPages > 1 && (
        <CardFooter className="flex justify-center pb-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={cn(
                    "cursor-pointer",
                    currentPage <= 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
              
              {/* Dynamic pagination items */}
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                // Show pages around current page
                const pagesToShow = 5;
                const startPage = Math.max(
                  1, 
                  currentPage - Math.floor(pagesToShow / 2)
                );
                const endPage = Math.min(
                  data.totalPages,
                  startPage + pagesToShow - 1
                );
                
                const pageNum = startPage + i;
                if (pageNum <= endPage) {
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => handlePageChange(pageNum)}
                        isActive={pageNum === currentPage}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                return null;
              })}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(Math.min(data.totalPages, currentPage + 1))}
                  className={cn(
                    "cursor-pointer",
                    currentPage >= data.totalPages && "pointer-events-none opacity-50",
                    isPlaceholderData && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardFooter>
      )}
    </Card>
  );
}

// Skeleton loader for transactions
function TransactionSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 border rounded-md">
      <div className="flex items-center">
        <Skeleton className="h-8 w-8 rounded-full mr-3" />
        <div>
          <Skeleton className="h-5 w-24 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="text-right">
        <Skeleton className="h-5 w-16 mb-1" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}