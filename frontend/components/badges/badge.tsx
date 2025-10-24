/**
 * Badge Component
 * 
 * Mario-themed badge display with rarity colors, animations, and tooltips
 */

'use client';

import React from 'react';
import { Badge as BadgeType } from '@/types/badge';

interface BadgeProps {
  badge: BadgeType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTooltip?: boolean;
  animated?: boolean;
  glow?: boolean;
  className?: string;
}

export function Badge({ 
  badge, 
  size = 'md', 
  showTooltip = true, 
  animated = false, 
  glow = false,
  className = ''
}: BadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-6 h-6 text-sm', 
    lg: 'w-8 h-8 text-lg',
    xl: 'w-12 h-12 text-xl'
  };

  const rarityClasses = {
    COMMON: 'bg-luigi-green-500 border-luigi-green-600',
    UNCOMMON: 'bg-sky-blue-500 border-sky-blue-600',
    RARE: 'bg-star-yellow-500 border-star-yellow-600',
    EPIC: 'bg-mario-red-500 border-mario-red-600',
    LEGENDARY: 'bg-coin-yellow-500 border-coin-yellow-600',
    MYTHIC: 'bg-star-yellow-400 border-star-yellow-500'
  };

  const glowClasses = {
    COMMON: 'shadow-luigi-glow',
    UNCOMMON: 'shadow-sky-glow',
    RARE: 'shadow-star-glow',
    EPIC: 'shadow-mario-glow',
    LEGENDARY: 'shadow-coin-glow',
    MYTHIC: 'shadow-mythic-glow'
  };

  return (
    <div className={`
      ${sizeClasses[size]}
      ${rarityClasses[badge.rarity]}
      ${glow ? glowClasses[badge.rarity] : 'shadow-mario'}
      ${animated ? 'animate-pulse' : ''}
      ${glow ? 'animate-glow' : ''}
      rounded-full border-3 flex items-center justify-center
      cursor-pointer transition-all duration-200 hover:scale-110
      group relative
      ${className}
    `}>
      <span className="select-none">{badge.icon}</span>
      
      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 
                       hidden group-hover:block z-50">
          <div className="bg-pipe-800 text-white px-3 py-2 rounded-lg text-sm 
                         whitespace-nowrap border-2 border-pipe-600 shadow-mario">
            <div className="font-mario text-base mb-1">{badge.name}</div>
            <div className="text-xs opacity-90">{badge.description}</div>
            <div className="text-xs mt-1 opacity-75 capitalize">
              {badge.rarity.toLowerCase()} • {badge.category.toLowerCase()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
