/**
 * Badge Collection Component
 * 
 * Full badge collection display with Mario theme, filtering, and search
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from './badge';
import { Badge as BadgeType, UserBadge } from '@/types/badge';

interface BadgeCollectionProps {
  userId: string;
  className?: string;
}

export function BadgeCollection({ userId, className = '' }: BadgeCollectionProps) {
  const [allBadges, setAllBadges] = useState<BadgeType[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');

  const categories = ['ALL', 'FOUNDER', 'TRADING', 'COMMUNITY', 'SPECIAL', 'MODERATION'];
  const rarities = ['ALL', 'COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];

  // Fetch badges
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const [allBadgesRes, userBadgesRes] = await Promise.all([
          fetch('/api/badges'),
          fetch(`/api/badges/user/${userId}`)
        ]);

        const [allBadgesData, userBadgesData] = await Promise.all([
          allBadgesRes.json(),
          userBadgesRes.json()
        ]);

        if (allBadgesData.success) {
          setAllBadges(allBadgesData.badges);
        }
        if (userBadgesData.success) {
          setUserBadges(userBadgesData.badges);
        }
      } catch (error) {
        console.error('Failed to fetch badges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [userId]);

  // Filter badges
  const filteredBadges = allBadges.filter(badge => {
    const matchesSearch = badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         badge.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || badge.category === selectedCategory;
    const matchesRarity = selectedRarity === 'ALL' || badge.rarity === selectedRarity;
    
    return matchesSearch && matchesCategory && matchesRarity;
  });

  // Group badges by category
  const groupedBadges = filteredBadges.reduce((acc, badge) => {
    if (!acc[badge.category]) {
      acc[badge.category] = [];
    }
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<string, BadgeType[]>);

  if (loading) {
    return (
      <div className={`bg-[var(--card)] rounded-lg border-4 border-pipe-300 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-pipe-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-pipe-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[var(--card)] rounded-lg border-4 border-pipe-300 p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="font-mario text-2xl text-pipe-800 mb-4">Badge Collection</h2>
        
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search badges..."
            value={searchTerm}
            autoComplete="off"
            data-form-type="other"
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border-2 border-pipe-300 rounded-lg font-mario
                     focus:border-mario-red-500 focus:outline-none"
          />
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border-2 border-pipe-300 rounded-lg font-mario
                     focus:border-mario-red-500 focus:outline-none"
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <select
            value={selectedRarity}
            onChange={(e) => setSelectedRarity(e.target.value)}
            className="px-4 py-2 border-2 border-pipe-300 rounded-lg font-mario
                     focus:border-mario-red-500 focus:outline-none"
          >
            {rarities.map(rarity => (
              <option key={rarity} value={rarity}>{rarity}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Badge Collection */}
      <div className="space-y-6">
        {Object.entries(groupedBadges).map(([category, badges]) => (
          <div key={category} className="mb-8">
            <h3 className="font-mario text-xl text-pipe-700 mb-4 capitalize">
              {category.toLowerCase()} Badges
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {badges.map(badge => {
                const userBadge = userBadges.find(ub => ub.badgeId === badge.id);
                const isEarned = !!userBadge;
                const isActive = userBadge?.isActive ?? false;
                
                return (
                  <div
                    key={badge.id}
                    className={`
                      bg-[var(--card)] rounded-lg border-3 p-4 text-center transition-all duration-200
                      ${isEarned ? 'border-mario-red-500 shadow-mario' : 'border-pipe-300 opacity-50'}
                      ${isActive ? 'ring-2 ring-mario-red-300' : ''}
                      hover:scale-105 cursor-pointer
                    `}
                  >
                    <div className="mb-2 flex justify-center">
                      <Badge 
                        badge={badge} 
                        size="lg"
                        animated={isEarned && (badge.rarity === 'LEGENDARY' || badge.rarity === 'MYTHIC')}
                        glow={isEarned && badge.rarity === 'MYTHIC'}
                      />
                    </div>
                    
                    <div className="font-mario text-sm text-pipe-800 mb-1">
                      {badge.name}
                    </div>
                    
                    <div className="text-xs text-pipe-600 mb-2">
                      {badge.description}
                    </div>
                    
                    <div className="text-xs font-mario capitalize">
                      <span className={`
                        px-2 py-1 rounded-full text-white
                        ${badge.rarity === 'COMMON' ? 'bg-luigi-green-500' : ''}
                        ${badge.rarity === 'UNCOMMON' ? 'bg-sky-blue-500' : ''}
                        ${badge.rarity === 'RARE' ? 'bg-star-yellow-500' : ''}
                        ${badge.rarity === 'EPIC' ? 'bg-mario-red-500' : ''}
                        ${badge.rarity === 'LEGENDARY' ? 'bg-coin-yellow-500' : ''}
                        ${badge.rarity === 'MYTHIC' ? 'bg-star-yellow-400' : ''}
                      `}>
                        {badge.rarity.toLowerCase()}
                      </span>
                    </div>
                    
                    {isEarned && (
                      <div className="text-xs text-mario-red-600 font-mario mt-2">
                        {isActive ? 'Active' : 'Hidden'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


