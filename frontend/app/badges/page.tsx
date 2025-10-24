/**
 * Badges Documentation Page
 * 
 * Complete guide to all badges, how to earn them, and their rarity
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/badges/badge';
import { Badge as BadgeType } from '@/types/badge';

interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC' | 'DEVELOPER';
  category: 'FOUNDER' | 'TRADING' | 'COMMUNITY' | 'SPECIAL' | 'MODERATION' | 'DEVELOPER';
  howToEarn: string;
  requirements: string;
  isVisible: boolean;
  isSpecial?: boolean;
}

const badgeData: BadgeInfo[] = [
  // Founder Badges
  {
    id: 'badge_founder',
    name: 'Founder',
    description: 'One of the first 100 users to join 1UP SOL',
    icon: '👑',
    color: 'bg-mario-red-500',
    rarity: 'LEGENDARY',
    category: 'FOUNDER',
    howToEarn: 'Be among the first 100 users to create an account',
    requirements: 'Account created when total users ≤ 100',
    isVisible: true
  },
  {
    id: 'badge_early_adopter',
    name: 'Early Adopter',
    description: 'One of the first 1000 users to join',
    icon: '⭐',
    color: 'bg-star-yellow-500',
    rarity: 'EPIC',
    category: 'FOUNDER',
    howToEarn: 'Be among the first 1000 users to create an account',
    requirements: 'Account created when total users ≤ 1000',
    isVisible: true
  },
  {
    id: 'badge_beta_tester',
    name: 'Beta Tester',
    description: 'Joined during the beta phase',
    icon: '🚀',
    color: 'bg-sky-blue-500',
    rarity: 'RARE',
    category: 'FOUNDER',
    howToEarn: 'Create an account during the beta testing period',
    requirements: 'Beta user flag set during registration',
    isVisible: true
  },
  {
    id: 'badge_diamond_hands',
    name: 'Diamond Hands',
    description: 'Held VSOL tokens for 30+ days',
    icon: '💎',
    color: 'bg-coin-yellow-500',
    rarity: 'RARE',
    category: 'FOUNDER',
    howToEarn: 'Hold VSOL tokens for at least 30 consecutive days',
    requirements: '30+ days of continuous VSOL token holding',
    isVisible: true
  },

  // Trading Badges
  {
    id: 'badge_first_trade',
    name: 'First Trade',
    description: 'Completed your first trade',
    icon: '🎯',
    color: 'bg-luigi-green-500',
    rarity: 'COMMON',
    category: 'TRADING',
    howToEarn: 'Execute your first buy or sell trade',
    requirements: 'Complete 1 trade',
    isVisible: true
  },
  {
    id: 'badge_trading_novice',
    name: 'Trading Novice',
    description: 'Completed 10 trades',
    icon: '📈',
    color: 'bg-sky-blue-500',
    rarity: 'UNCOMMON',
    category: 'TRADING',
    howToEarn: 'Complete 10 total trades',
    requirements: 'Complete 10 trades',
    isVisible: true
  },
  {
    id: 'badge_trading_expert',
    name: 'Trading Expert',
    description: 'Completed 100 trades',
    icon: '📊',
    color: 'bg-star-yellow-500',
    rarity: 'RARE',
    category: 'TRADING',
    howToEarn: 'Complete 100 total trades',
    requirements: 'Complete 100 trades',
    isVisible: true
  },
  {
    id: 'badge_trading_master',
    name: 'Trading Master',
    description: 'Completed 1000 trades',
    icon: '🏆',
    color: 'bg-mario-red-500',
    rarity: 'EPIC',
    category: 'TRADING',
    howToEarn: 'Complete 1000 total trades',
    requirements: 'Complete 1000 trades',
    isVisible: true
  },
  {
    id: 'badge_profit_maker',
    name: 'Profit Maker',
    description: 'Made a profit of $1000+',
    icon: '💰',
    color: 'bg-coin-yellow-500',
    rarity: 'RARE',
    category: 'TRADING',
    howToEarn: 'Achieve a total profit of $1000 or more',
    requirements: 'Total realized PnL ≥ $1000',
    isVisible: true
  },
  {
    id: 'badge_whale_trader',
    name: 'Whale Trader',
    description: 'Made a single trade worth $10,000+',
    icon: '🐋',
    color: 'bg-mario-red-500',
    rarity: 'EPIC',
    category: 'TRADING',
    howToEarn: 'Execute a single trade worth $10,000 or more',
    requirements: 'Single trade value ≥ $10,000',
    isVisible: true
  },

  // Community Badges
  {
    id: 'badge_helpful_member',
    name: 'Helpful Member',
    description: 'Helped other users in the community',
    icon: '🤝',
    color: 'bg-luigi-green-500',
    rarity: 'UNCOMMON',
    category: 'COMMUNITY',
    howToEarn: 'Be recognized as helpful by the community',
    requirements: 'Community recognition for helpfulness',
    isVisible: true
  },
  {
    id: 'badge_community_champion',
    name: 'Community Champion',
    description: 'Active and positive community member',
    icon: '🌟',
    color: 'bg-star-yellow-500',
    rarity: 'RARE',
    category: 'COMMUNITY',
    howToEarn: 'Maintain high community standing and positive interactions',
    requirements: 'High trust score + positive community interactions',
    isVisible: true
  },
  {
    id: 'badge_social_butterfly',
    name: 'Social Butterfly',
    description: 'Very active in community discussions',
    icon: '🦋',
    color: 'bg-sky-blue-500',
    rarity: 'UNCOMMON',
    category: 'COMMUNITY',
    howToEarn: 'Participate actively in community discussions',
    requirements: 'High message count + positive interactions',
    isVisible: true
  },

  // Special Badges
  {
    id: 'badge_lucky_winner',
    name: 'Lucky Winner',
    description: 'Won a community contest or event',
    icon: '🍀',
    color: 'bg-star-yellow-500',
    rarity: 'RARE',
    category: 'SPECIAL',
    howToEarn: 'Win a community contest, event, or special promotion',
    requirements: 'Win a community event or contest',
    isVisible: true
  },
  {
    id: 'badge_event_participant',
    name: 'Event Participant',
    description: 'Participated in a community event',
    icon: '🎪',
    color: 'bg-sky-blue-500',
    rarity: 'UNCOMMON',
    category: 'SPECIAL',
    howToEarn: 'Participate in community events and activities',
    requirements: 'Participate in community events',
    isVisible: true
  },

  // Moderation Badges
  {
    id: 'badge_moderator',
    name: 'Moderator',
    description: 'Community moderator',
    icon: '🛡️',
    color: 'bg-mario-red-500',
    rarity: 'EPIC',
    category: 'MODERATION',
    howToEarn: 'Be appointed as a community moderator',
    requirements: 'Appointed by administrators',
    isVisible: true
  },
  {
    id: 'badge_trusted_member',
    name: 'Trusted Member',
    description: 'High trust score member',
    icon: '⭐',
    color: 'bg-star-yellow-500',
    rarity: 'RARE',
    category: 'MODERATION',
    howToEarn: 'Maintain a high trust score through positive behavior',
    requirements: 'Trust score ≥ 80',
    isVisible: true
  },

  // Developer Badge (Ultra Rare 1/1)
  {
    id: 'badge_developer',
    name: 'Developer',
    description: 'Core developer of 1UP SOL - The rarest badge in existence',
    icon: '👨‍💻',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    rarity: 'DEVELOPER',
    category: 'DEVELOPER',
    howToEarn: 'Be a core developer of the 1UP SOL platform',
    requirements: 'Core development team member',
    isVisible: true,
    isSpecial: true
  }
];

const rarityInfo = {
  COMMON: { name: 'Common', color: 'text-luigi-green-600', bgColor: 'bg-luigi-green-100', description: 'Easily obtainable badges' },
  UNCOMMON: { name: 'Uncommon', color: 'text-sky-blue-600', bgColor: 'bg-sky-blue-100', description: 'Moderately challenging to earn' },
  RARE: { name: 'Rare', color: 'text-star-yellow-600', bgColor: 'bg-star-yellow-100', description: 'Challenging to obtain' },
  EPIC: { name: 'Epic', color: 'text-mario-red-600', bgColor: 'bg-mario-red-100', description: 'Very difficult to earn' },
  LEGENDARY: { name: 'Legendary', color: 'text-coin-yellow-600', bgColor: 'bg-coin-yellow-100', description: 'Extremely rare and prestigious' },
  MYTHIC: { name: 'Mythic', color: 'text-purple-600', bgColor: 'bg-purple-100', description: 'Legendary status badges' },
  DEVELOPER: { name: 'Developer', color: 'text-purple-600', bgColor: 'bg-gradient-to-r from-purple-100 to-pink-100', description: 'Ultra-rare 1/1 developer badge' }
};

export default function BadgesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');

  const categories = ['ALL', 'FOUNDER', 'TRADING', 'COMMUNITY', 'SPECIAL', 'MODERATION', 'DEVELOPER'];
  const rarities = ['ALL', 'COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC', 'DEVELOPER'];

  const filteredBadges = badgeData.filter(badge => {
    const categoryMatch = selectedCategory === 'ALL' || badge.category === selectedCategory;
    const rarityMatch = selectedRarity === 'ALL' || badge.rarity === selectedRarity;
    return categoryMatch && rarityMatch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-luigi-green-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-mario text-4xl text-pipe-800 mb-4">🏆 Badge Collection</h1>
          <p className="text-lg text-pipe-600 max-w-3xl mx-auto">
            Discover all the badges you can earn in 1UP SOL! Each badge represents a unique achievement 
            and tells the story of your journey in the Mario-themed trading universe.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border-4 border-pipe-300 p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block font-mario text-pipe-800 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border-2 border-pipe-300 rounded-lg font-mario focus:border-mario-red-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-mario text-pipe-800 mb-2">Rarity</label>
              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value)}
                className="px-4 py-2 border-2 border-pipe-300 rounded-lg font-mario focus:border-mario-red-500"
              >
                {rarities.map(rarity => (
                  <option key={rarity} value={rarity}>{rarity}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Rarity Guide */}
        <div className="bg-white rounded-lg border-4 border-pipe-300 p-6 mb-8">
          <h2 className="font-mario text-2xl text-pipe-800 mb-4">📊 Rarity Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(rarityInfo).map(([rarity, info]) => (
              <div key={rarity} className={`p-4 rounded-lg border-2 ${info.bgColor}`}>
                <div className={`font-mario text-lg ${info.color} mb-2`}>{info.name}</div>
                <div className="text-sm text-pipe-600">{info.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBadges.map((badge) => (
            <div
              key={badge.id}
              className={`bg-white rounded-lg border-4 p-6 transition-all duration-200 hover:scale-105 ${
                badge.isSpecial 
                  ? 'border-purple-500 shadow-lg shadow-purple-200' 
                  : 'border-pipe-300 hover:border-pipe-400'
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`${badge.isSpecial ? 'animate-sparkle' : ''}`}>
                  <Badge 
                    badge={{
                      id: badge.id,
                      name: badge.name,
                      description: badge.description,
                      icon: badge.icon,
                      color: badge.color,
                      rarity: badge.rarity,
                      category: badge.category,
                      isVisible: badge.isVisible,
                      requirements: badge.requirements,
                      createdAt: new Date()
                    }}
                    size="xl"
                    animated={badge.rarity === 'LEGENDARY' || badge.rarity === 'MYTHIC' || badge.rarity === 'DEVELOPER'}
                    glow={badge.rarity === 'MYTHIC' || badge.rarity === 'DEVELOPER'}
                  />
                </div>
                <div>
                  <h3 className="font-mario text-lg text-pipe-800">{badge.name}</h3>
                  <div className={`text-sm font-mario ${rarityInfo[badge.rarity].color}`}>
                    {rarityInfo[badge.rarity].name}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-pipe-700">{badge.description}</p>
                
                <div>
                  <div className="font-mario text-pipe-800 text-sm mb-1">How to Earn:</div>
                  <div className="text-sm text-pipe-600">{badge.howToEarn}</div>
                </div>

                <div>
                  <div className="font-mario text-pipe-800 text-sm mb-1">Requirements:</div>
                  <div className="text-sm text-pipe-600">{badge.requirements}</div>
                </div>

                {badge.isSpecial && (
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-3 rounded-lg border-2 border-purple-300">
                    <div className="font-mario text-purple-800 text-sm">✨ Ultra Rare 1/1 Badge</div>
                    <div className="text-xs text-purple-600">Only one of these badges exists in the entire universe!</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Badge Tips */}
        <div className="bg-white rounded-lg border-4 border-pipe-300 p-6 mt-8">
          <h2 className="font-mario text-2xl text-pipe-800 mb-4">💡 Badge Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-mario text-lg text-pipe-800 mb-2">🎯 Getting Started</h3>
              <ul className="space-y-2 text-sm text-pipe-600">
                <li>• Complete your first trade to get the "First Trade" badge</li>
                <li>• Be active in the community to earn social badges</li>
                <li>• Maintain a high trust score for moderation badges</li>
                <li>• Participate in community events for special badges</li>
              </ul>
            </div>
            <div>
              <h3 className="font-mario text-lg text-pipe-800 mb-2">🏆 Advanced Badges</h3>
              <ul className="space-y-2 text-sm text-pipe-600">
                <li>• Trade frequently to unlock trading mastery badges</li>
                <li>• Make profitable trades for profit badges</li>
                <li>• Help other users to earn community recognition</li>
                <li>• Be among the first users for founder badges</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
