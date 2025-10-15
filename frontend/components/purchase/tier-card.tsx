'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PurchaseTier } from '@/lib/types/backend';

interface TierCardProps {
  tier: PurchaseTier;
  selected: boolean;
  onSelect: () => void;
}

export function TierCard({ tier, selected, onSelect }: TierCardProps) {
  return (
    <div
      className={cn(
        'relative cursor-pointer transition-all duration-300 group',
        selected && 'scale-105'
      )}
      onClick={onSelect}
    >
      {/* Glow effect on hover/select */}
      {(selected || tier.popular) && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-primary/50 to-primary rounded-xl opacity-75 blur group-hover:opacity-100 transition duration-300" />
      )}
      
      <Card
        className={cn(
          'relative h-full transition-all duration-300',
          'border-2 backdrop-blur-sm',
          selected
            ? 'border-primary bg-gradient-to-br from-primary/10 via-background to-background shadow-2xl'
            : 'border-border/50 bg-background/95 hover:border-primary/50 hover:shadow-xl',
          tier.popular && !selected && 'border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background'
        )}
      >
        <CardContent className="p-6 relative space-y-5">
          {/* Popular badge */}
          {tier.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
              <Badge className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white border-0 shadow-lg px-3 py-1.5 text-xs font-bold">
                <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
                MOST POPULAR
              </Badge>
            </div>
          )}

          {/* Selection indicator */}
          {selected && (
            <div className="absolute top-4 right-4 z-10">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg ring-4 ring-primary/20 animate-in zoom-in-50">
                <Check className="h-4 w-4 text-primary-foreground stroke-[3]" />
              </div>
            </div>
          )}

          {/* Tier label */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs font-bold uppercase tracking-widest text-foreground/70">
              {tier.label}
            </div>
            {tier.bonus > 0 && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 text-[10px] font-bold px-2 py-0.5">
                +{tier.bonus}%
              </Badge>
            )}
          </div>

          {/* Main display */}
          <div className="space-y-4">
            {/* Simulated SOL amount */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-lg" />
              <div className="relative text-center py-6 px-4 rounded-lg border border-border/50 bg-gradient-to-br from-background/80 to-muted/20">
                <div className="text-5xl font-black leading-none mb-2">
                  <span className="text-white">
                    {tier.simulatedSol}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-foreground/80 uppercase tracking-widest">
                  Simulated SOL
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 py-1">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              <Zap className="h-3.5 w-3.5 text-primary" />
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            {/* Price */}
            <div className="text-center space-y-2">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl font-black text-primary">
                  {tier.realSol}
                </span>
                <span className="text-lg font-bold text-primary/70">
                  SOL
                </span>
              </div>
              <div className="text-xs text-foreground/60 min-h-[20px]">
                {tier.bonus > 0 ? (
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    💰 Save {(tier.realSol * tier.bonus / 100).toFixed(3)} SOL
                  </span>
                ) : (
                  <span>Base: 2000:1 ratio</span>
                )}
              </div>
            </div>
          </div>

          {/* Select indicator at bottom */}
          <div className={cn(
            "text-center text-xs font-bold py-3 px-4 rounded-lg transition-all duration-200 mt-2",
            selected
              ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg scale-105"
              : "bg-muted/30 text-muted-foreground group-hover:bg-muted/50 group-hover:scale-105"
          )}>
            {selected ? '✓ SELECTED' : 'SELECT TIER'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
