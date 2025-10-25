/**
 * Badge Admin Panel
 * 
 * Admin interface for managing badges and awarding them to users
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useBadges, useBadgeStats, useAwardBadge } from '@/hooks/use-admin-api';
import { AdminCard, AdminButton, AdminInput, AdminSelect, AdminLoadingSkeleton, AdminEmptyState } from './admin-ui';
import { Badge } from '@/components/badges/badge';
import { Badge as BadgeType, UserBadge, BadgeStats } from '@/types/badge';

export function BadgeAdmin() {
  const { user } = useAuth();
  const [selectedBadge, setSelectedBadge] = useState<string>('');
  const [targetUser, setTargetUser] = useState('');
  const [activeTab, setActiveTab] = useState<'badges' | 'award' | 'stats'>('badges');
  const [message, setMessage] = useState<string>('');

  // API hooks
  const { data: badgesData, isLoading: badgesLoading, error: badgesError } = useBadges();
  const { data: statsData, isLoading: statsLoading, error: statsError } = useBadgeStats();
  const awardBadge = useAwardBadge();

  // Check if user is admin
  const isAdmin = user?.userTier === 'ADMINISTRATOR';

  const handleAwardBadge = async () => {
    if (!selectedBadge || !targetUser.trim()) return;

    try {
      await awardBadge.mutateAsync({
        badgeId: selectedBadge,
        userId: targetUser.trim()
      });
      setTargetUser('');
      setSelectedBadge('');
      setMessage('✅ Badge awarded successfully!');
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Failed to award badge:', error);
      setMessage('❌ Failed to award badge. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    }
  };


  if (!isAdmin) {
    return (
      <div className="bg-[var(--card)] rounded-lg border-4 border-pipe-300 p-6 shadow-mario">
        <div className="text-center">
          <div className="font-mario text-xl text-pipe-800 mb-2">👑</div>
          <div className="font-mario text-lg text-pipe-600">Admin Access Required</div>
          <div className="text-sm text-pipe-500">You need administrator privileges to access this panel</div>
        </div>
      </div>
    );
  }

  if (badgesLoading || statsLoading) {
    return (
      <AdminCard>
        <AdminLoadingSkeleton lines={8} />
      </AdminCard>
    );
  }

  return (
    <div className="bg-[var(--card)] rounded-lg border-4 border-pipe-300 p-6 shadow-mario">
      <div className="mb-6">
        <h2 className="font-mario text-3xl text-pipe-800 mb-2">🏆 Badge Admin Panel</h2>
        <div className="text-pipe-600">Manage badges and award them to users</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('badges')}
          className={`px-4 py-2 rounded-lg font-mario border-3 transition-all ${
            activeTab === 'badges'
              ? 'bg-mario-red-500 text-white border-mario-red-600'
              : 'bg-pipe-100 text-pipe-700 border-pipe-300'
          }`}
        >
          🏆 All Badges
        </button>
        <button
          onClick={() => setActiveTab('award')}
          className={`px-4 py-2 rounded-lg font-mario border-3 transition-all ${
            activeTab === 'award'
              ? 'bg-mario-red-500 text-white border-mario-red-600'
              : 'bg-pipe-100 text-pipe-700 border-pipe-300'
          }`}
        >
          🎁 Award Badge
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 rounded-lg font-mario border-3 transition-all ${
            activeTab === 'stats'
              ? 'bg-mario-red-500 text-white border-mario-red-600'
              : 'bg-pipe-100 text-pipe-700 border-pipe-300'
          }`}
        >
          📊 Statistics
        </button>
      </div>

      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {badgesData?.badges?.map((badge: BadgeType) => (
              <div
                key={badge.id}
                className="bg-pipe-50 rounded-lg p-4 border-2 border-pipe-200 hover:border-pipe-300 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Badge badge={badge} size="lg" />
                  <div>
                    <div className="font-mario text-pipe-800">{badge.name}</div>
                    <div className="text-xs text-pipe-600 capitalize">
                      {badge.rarity.toLowerCase()} • {badge.category.toLowerCase()}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-pipe-700 mb-2">{badge.description}</div>
                <div className="text-xs text-pipe-500">
                  {badge.isVisible ? '✅ Visible' : '❌ Hidden'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Award Tab */}
      {activeTab === 'award' && (
        <div className="space-y-4">
          <div className="bg-pipe-50 rounded-lg p-4 border-2 border-pipe-200">
            <h3 className="font-mario text-lg text-pipe-800 mb-4">🎁 Award Badge to User</h3>
            
            <div className="space-y-4">
              {/* Badge Selection */}
              <div>
                <label className="block font-mario text-pipe-700 mb-2">Select Badge</label>
                <select
                  value={selectedBadge}
                  onChange={(e) => setSelectedBadge(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-pipe-300 rounded-lg font-mario
                           focus:border-mario-red-500 focus:outline-none"
                >
                  <option value="">Choose a badge...</option>
                  {badgesData?.badges?.map((badge: BadgeType) => (
                    <option key={badge.id} value={badge.id}>
                      {badge.icon} {badge.name} ({badge.rarity})
                    </option>
                  ))}
                </select>
              </div>

              {/* User Input */}
              <div>
                <label className="block font-mario text-pipe-700 mb-2">User ID or Handle</label>
                <input
                  type="text"
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  placeholder="Enter user ID or handle..."
                  className="w-full px-4 py-2 border-2 border-pipe-300 rounded-lg font-mario
                           focus:border-mario-red-500 focus:outline-none"
                />
              </div>

              {/* Selected Badge Preview */}
              {selectedBadge && (
                <div className="bg-[var(--card)] rounded-lg p-4 border-2 border-pipe-300">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const badge = badgesData?.badges?.find((b: BadgeType) => b.id === selectedBadge);
                      return badge ? (
                        <>
                          <Badge badge={badge} size="lg" />
                          <div>
                            <div className="font-mario text-pipe-800">{badge.name}</div>
                            <div className="text-sm text-pipe-600">{badge.description}</div>
                          </div>
                        </>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}

              {/* Award Button */}
              <button
                onClick={handleAwardBadge}
                disabled={!selectedBadge || !targetUser || awardBadge.isPending}
                className={`w-full px-6 py-3 rounded-lg font-mario text-white border-3 ${
                  !selectedBadge || !targetUser || awardBadge.isPending
                    ? 'bg-pipe-400 cursor-not-allowed'
                    : 'bg-mario-red-500 hover:bg-mario-red-600'
                } border-mario-red-600 shadow-mario transition-all duration-200`}
              >
                {awardBadge.isPending ? '⏳ Awarding...' : '🎁 Award Badge'}
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && statsData?.stats && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-luigi-green-50 rounded-lg p-4 border-2 border-luigi-green-300">
              <div className="font-mario text-2xl text-luigi-green-800">{statsData.stats.totalBadges}</div>
              <div className="text-sm text-luigi-green-600">Total Badges</div>
            </div>
            <div className="bg-star-yellow-50 rounded-lg p-4 border-2 border-star-yellow-300">
              <div className="font-mario text-2xl text-star-yellow-800">{statsData.stats.activeBadges}</div>
              <div className="text-sm text-star-yellow-600">Active Badges</div>
            </div>
            <div className="bg-mario-red-50 rounded-lg p-4 border-2 border-mario-red-300">
              <div className="font-mario text-2xl text-mario-red-800">{Object.keys(statsData.stats.badgesByRarity).length}</div>
              <div className="text-sm text-mario-red-600">Rarity Types</div>
            </div>
            <div className="bg-sky-blue-50 rounded-lg p-4 border-2 border-sky-blue-300">
              <div className="font-mario text-2xl text-sky-blue-800">{Object.keys(statsData.stats.badgesByCategory).length}</div>
              <div className="text-sm text-sky-blue-600">Categories</div>
            </div>
          </div>

          {/* Badges by Rarity */}
          <div className="bg-pipe-50 rounded-lg p-4 border-2 border-pipe-200">
            <h3 className="font-mario text-lg text-pipe-800 mb-4">📊 Badges by Rarity</h3>
            <div className="space-y-2">
              {Object.entries(statsData.stats.badgesByRarity).map(([rarity, count]) => (
                <div key={rarity} className="flex items-center justify-between">
                  <span className="font-mario text-pipe-700 capitalize">{rarity.toLowerCase()}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-pipe-200 rounded-full h-2">
                      <div 
                        className="bg-mario-red-500 h-2 rounded-full" 
                        style={{ width: `${(count as number / Math.max(...(Object.values(statsData.stats.badgesByRarity) as number[]))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-pipe-600">{count as number} badges</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Badges by Category */}
          <div className="bg-pipe-50 rounded-lg p-4 border-2 border-pipe-200">
            <h3 className="font-mario text-lg text-pipe-800 mb-4">📊 Badges by Category</h3>
            <div className="space-y-2">
              {Object.entries(statsData.stats.badgesByCategory).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="font-mario text-pipe-700 capitalize">{category.toLowerCase()}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-pipe-200 rounded-full h-2">
                      <div 
                        className="bg-star-yellow-500 h-2 rounded-full" 
                        style={{ width: `${(count as number / Math.max(...(Object.values(statsData.stats.badgesByCategory) as number[]))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-pipe-600">{count as number} badges</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Badges */}
          <div className="bg-pipe-50 rounded-lg p-4 border-2 border-pipe-200">
            <h3 className="font-mario text-lg text-pipe-800 mb-4">🆕 Recent Badges</h3>
            <div className="space-y-2">
              {statsData.stats.recentBadges.map((userBadge: UserBadge) => (
                <div key={userBadge.id} className="flex items-center gap-3">
                  <Badge badge={userBadge.badge} size="sm" />
                  <div className="flex-1">
                    <div className="font-mario text-pipe-800">{userBadge.badge.name}</div>
                    <div className="text-xs text-pipe-600">
                      Earned {new Date(userBadge.earnedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`mt-4 p-4 rounded-lg border-3 font-mario ${
          message.startsWith('✅') 
            ? 'bg-luigi-green-100 border-luigi-green-500 text-luigi-green-800' 
            : 'bg-mario-red-100 border-mario-red-500 text-mario-red-800'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}
