/**
 * Badge Leaderboard Component
 * 
 * Display users with most badges in Mario theme
 */

'use client';

import React, { useState, useEffect } from 'react';
import { UserBadges } from './user-badges';

interface LeaderboardEntry {
  userId: string;
  user: {
    handle: string;
    avatarUrl?: string;
  };
  badgeCount: number;
  topBadges: Array<{
    id: string;
    badge: {
      id: string;
      name: string;
      icon: string;
      rarity: string;
    };
  }>;
}

interface BadgeLeaderboardProps {
  limit?: number;
  className?: string;
}

export function BadgeLeaderboard({ limit = 10, className = '' }: BadgeLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`/api/badges/leaderboard?limit=${limit}`);
        const data = await response.json();
        
        if (data.success) {
          setLeaderboard(data.leaderboard);
        }
      } catch (error) {
        console.error('Failed to fetch badge leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [limit]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border-4 border-pipe-300 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-pipe-200 rounded mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-pipe-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border-4 border-pipe-300 p-6 ${className}`}>
      <h2 className="font-mario text-2xl text-pipe-800 mb-6">Badge Leaders</h2>
      
      <div className="space-y-4">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.userId}
            className={`
              bg-white rounded-lg border-3 p-4 flex items-center gap-4
              ${index === 0 ? 'border-coin-yellow-500 shadow-coin-glow' : ''}
              ${index === 1 ? 'border-pipe-400 shadow-mario' : ''}
              ${index === 2 ? 'border-luigi-green-500 shadow-mario' : ''}
              ${index > 2 ? 'border-pipe-300' : ''}
              hover:scale-105 transition-all duration-200
            `}
          >
            {/* Rank */}
            <div className="flex-shrink-0">
              {index === 0 && (
                <div className="w-8 h-8 bg-coin-yellow-500 rounded-full flex items-center justify-center">
                  <span className="font-mario text-white">👑</span>
                </div>
              )}
              {index === 1 && (
                <div className="w-8 h-8 bg-pipe-400 rounded-full flex items-center justify-center">
                  <span className="font-mario text-white">2</span>
                </div>
              )}
              {index === 2 && (
                <div className="w-8 h-8 bg-luigi-green-500 rounded-full flex items-center justify-center">
                  <span className="font-mario text-white">3</span>
                </div>
              )}
              {index > 2 && (
                <div className="w-8 h-8 bg-pipe-300 rounded-full flex items-center justify-center">
                  <span className="font-mario text-pipe-700">{index + 1}</span>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {entry.user.avatarUrl ? (
                  <img
                    src={entry.user.avatarUrl}
                    alt={entry.user.handle}
                    className="w-8 h-8 rounded-full border-2 border-pipe-300"
                  />
                ) : (
                  <div className="w-8 h-8 bg-pipe-200 rounded-full border-2 border-pipe-300 flex items-center justify-center">
                    <span className="font-mario text-pipe-600 text-sm">
                      {entry.user.handle.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                
                <div>
                  <div className="font-mario text-pipe-800">{entry.user.handle}</div>
                  <div className="text-sm text-pipe-600">
                    {entry.badgeCount} badge{entry.badgeCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Badges */}
            <div className="flex-shrink-0">
              <UserBadges 
                userId={entry.userId} 
                maxDisplay={3}
                className="flex gap-1"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
