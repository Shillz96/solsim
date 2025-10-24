/**
 * User Badges Component
 * 
 * Display user's badge collection with Mario theme
 */

'use client';

import React, { useState } from 'react';
import { Badge } from './badge';
import { UserBadge } from '@/types/badge';

interface UserBadgesProps {
  userId: string;
  maxDisplay?: number;
  showAll?: boolean;
  className?: string;
}

export function UserBadges({ 
  userId, 
  maxDisplay = 5, 
  showAll = false,
  className = ''
}: UserBadgesProps) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullCollection, setShowFullCollection] = useState(false);

  // Fetch user badges
  React.useEffect(() => {
    const fetchBadges = async () => {
      try {
        const response = await fetch(`/api/badges/user/${userId}`);
        const data = await response.json();
        
        if (data.success) {
          setBadges(data.badges);
        }
      } catch (error) {
        console.error('Failed to fetch user badges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [userId]);

  if (loading) {
    return (
      <div className={`flex gap-1 ${className}`}>
        {[...Array(maxDisplay)].map((_, i) => (
          <div key={i} className="w-6 h-6 bg-pipe-200 rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  const activeBadges = badges.filter(ub => ub.isActive);
  const displayBadges = showFullCollection ? activeBadges : activeBadges.slice(0, maxDisplay);
  const remainingCount = activeBadges.length - maxDisplay;

  return (
    <div className={`flex gap-1 items-center ${className}`}>
      {displayBadges.map((userBadge) => (
        <Badge 
          key={userBadge.id} 
          badge={userBadge.badge} 
          size="sm"
          animated={userBadge.badge.rarity === 'LEGENDARY' || userBadge.badge.rarity === 'MYTHIC'}
          glow={userBadge.badge.rarity === 'MYTHIC'}
        />
      ))}
      
      {!showFullCollection && remainingCount > 0 && (
        <div 
          className="w-6 h-6 bg-pipe-300 rounded-full flex items-center justify-center text-xs 
                     font-mario cursor-pointer hover:bg-pipe-400 transition-colors"
          onClick={() => setShowFullCollection(true)}
          title={`${remainingCount} more badges`}
        >
          +{remainingCount}
        </div>
      )}
      
      {showFullCollection && (
        <button
          onClick={() => setShowFullCollection(false)}
          className="text-xs text-pipe-600 hover:text-pipe-800 font-mario"
        >
          Show Less
        </button>
      )}
    </div>
  );
}


