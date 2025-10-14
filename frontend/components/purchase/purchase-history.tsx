'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { PurchaseHistory } from '@/lib/types/backend';

interface PurchaseHistoryTableProps {
  purchases: PurchaseHistory[];
  isLoading?: boolean;
}

export function PurchaseHistoryTable({ purchases, isLoading }: PurchaseHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No purchase history yet</p>
        <p className="text-sm mt-1">Your purchases will appear here</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead className="text-right">Real SOL</TableHead>
            <TableHead className="text-right">Simulated SOL</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Transaction</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.map((purchase) => (
            <TableRow key={purchase.id}>
              <TableCell className="font-medium">
                {format(new Date(purchase.createdAt), 'MMM d, yyyy HH:mm')}
              </TableCell>
              <TableCell>
                {purchase.tierLabel || 'N/A'}
              </TableCell>
              <TableCell className="text-right">
                {parseFloat(purchase.realSolAmount).toFixed(3)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                +{parseFloat(purchase.simulatedSolAmount).toFixed(0)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    purchase.status === 'COMPLETED'
                      ? 'default'
                      : purchase.status === 'PENDING'
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {purchase.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {purchase.explorerUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 px-2"
                  >
                    <a
                      href={purchase.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
