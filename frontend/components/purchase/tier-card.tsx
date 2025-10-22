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
        'relative cursor-pointer transition-all duration-200 group',
        selected && 'scale-105'
      )}
      onClick={onSelect}
    >
      <Card
        className={cn(
          'relative h-full transition-all duration-200 mario-card',
          'border-4 border-[var(--outline-black)] bg-white',
          'shadow-[4px_4px_0_var(--outline-black)]',
          selected
            ? 'bg-[var(--star-yellow)] border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]'
            : 'hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-1',
          tier.popular && !selected && 'border-[var(--mario-red)]'
        )}
      >
        <CardContent className="p-5 relative space-y-4">
          {/* Popular badge */}
          {tier.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
              <Badge className="bg-[var(--mario-red)] text-white border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] px-3 py-1.5 text-xs font-mario">
                <Sparkles className="h-3 w-3 mr-1" />
                MOST POPULAR
              </Badge>
            </div>
          )}

          {/* Selection indicator */}
          {selected && (
            <div className="absolute top-3 right-3 z-10">
              <div className="h-7 w-7 rounded-full bg-[var(--luigi-green)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
                <Check className="h-4 w-4 text-white stroke-[3]" />
              </div>
            </div>
          )}

          {/* Tier label */}
          <div className="flex items-center justify-between pt-1 mb-3">
            <div className="text-xs font-mario uppercase tracking-widest text-[var(--outline-black)]">
              {tier.label}
            </div>
            {tier.bonus > 0 && (
              <Badge variant="secondary" className="bg-[var(--luigi-green)] text-white border-2 border-[var(--outline-black)] text-[10px] font-mario px-2 py-0.5">
                +{tier.bonus}%
              </Badge>
            )}
          </div>

          {/* Main display */}
          <div className="space-y-3">
            {/* Simulated SOL amount */}
            <div className="text-center py-5 px-3 rounded-lg border-3 border-[var(--outline-black)] bg-white shadow-[3px_3px_0_var(--outline-black)]">
              <div className="text-4xl font-mario leading-tight mb-1 text-[var(--outline-black)]">
                {tier.simulatedSol}
              </div>
              <div className="text-[10px] font-bold text-[var(--outline-black)] uppercase tracking-wider mt-1">
                Simulated SOL
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 py-0.5">
              <div className="h-1 flex-1 bg-[var(--outline-black)] rounded-full" />
              <Zap className="h-3.5 w-3.5 text-[var(--star-yellow)]" />
              <div className="h-1 flex-1 bg-[var(--outline-black)] rounded-full" />
            </div>

            {/* Price */}
            <div className="text-center space-y-1.5">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-3xl font-mario text-[var(--outline-black)]">
                  {tier.realSol}
                </span>
                <span className="text-base font-bold text-[var(--outline-black)]">
                  SOL
                </span>
              </div>
              <div className="text-xs text-[var(--outline-black)] font-semibold min-h-[18px]">
                {tier.bonus > 0 ? (
                  <span className="text-[var(--luigi-green)]">
                    Save {(tier.realSol * tier.bonus / 100).toFixed(3)} SOL
                  </span>
                ) : (
                  <span>Base: 2000:1 ratio</span>
                )}
              </div>
            </div>
          </div>

          {/* Select indicator at bottom */}
          <div className={cn(
            "text-center text-xs font-mario py-2.5 px-4 rounded-lg transition-all duration-200 mt-3 border-3 border-[var(--outline-black)]",
            selected
              ? "bg-[var(--luigi-green)] text-white shadow-[3px_3px_0_var(--outline-black)] scale-105"
              : "bg-white text-[var(--outline-black)] group-hover:shadow-[3px_3px_0_var(--outline-black)] group-hover:scale-105"
          )}>
            {selected ? '✓ SELECTED' : 'SELECT TIER'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
