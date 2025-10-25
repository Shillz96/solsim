/**
 * Analytics Admin Panel
 * 
 * Platform analytics and metrics dashboard for admins
 */

'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useAnalytics, useAdminStats } from '@/hooks/use-admin-api';
import { 
  AdminCard, 
  AdminButton,
  AdminLoadingSkeleton,
  AdminEmptyState
} from './admin-ui';
import { cn, marioStyles } from '@/lib/utils';

export function AnalyticsAdmin() {
  const { user } = useAuth();
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useAnalytics();
  const { data: statsData, isLoading: statsLoading, error: statsError } = useAdminStats();

  // Check if user is admin
  const isAdmin = user?.userTier === 'ADMINISTRATOR';

  if (!isAdmin) {
    return (
      <AdminCard>
        <div className="text-center">
          <div className="font-mario text-xl text-[var(--outline-black)] mb-2">👑</div>
          <div className="font-mario text-lg text-[var(--pipe-green)]">Admin Access Required</div>
          <div className="text-sm text-[var(--pipe-green)]">You need administrator privileges to access this panel</div>
        </div>
      </AdminCard>
    );
  }

  if (analyticsLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="font-mario text-3xl text-[var(--outline-black)] mb-2">📊 Analytics Dashboard</h2>
          <div className="text-[var(--pipe-green)]">Loading platform analytics...</div>
        </div>
        <AdminLoadingSkeleton lines={8} />
      </div>
    );
  }

  if (analyticsError || statsError) {
    return (
      <AdminCard>
        <div className="text-center py-8">
          <div className="text-[var(--mario-red)] font-mario text-lg mb-2">❌ Error</div>
          <div className="text-[var(--pipe-green)]">Failed to load analytics data</div>
        </div>
      </AdminCard>
    );
  }

  const analytics = analyticsData?.analytics;
  const stats = statsData?.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-mario text-3xl text-[var(--outline-black)] mb-2">📊 Analytics Dashboard</h2>
        <div className="text-[var(--pipe-green)]">Platform metrics, user growth, and engagement analytics</div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminCard>
          <div className="text-center">
            <div className="text-4xl mb-2">👥</div>
            <div className="font-mario text-2xl text-[var(--outline-black)] mb-1">
              {stats?.totalUsers || 0}
            </div>
            <div className="text-sm text-[var(--pipe-green)]">Total Users</div>
            <div className="text-xs text-[var(--star-yellow)] mt-1">
              +{stats?.userGrowth24h || 0} in 24h
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-center">
            <div className="text-4xl mb-2">🏆</div>
            <div className="font-mario text-2xl text-[var(--outline-black)] mb-1">
              {stats?.badgesAwarded || 0}
            </div>
            <div className="text-sm text-[var(--pipe-green)]">Badges Awarded</div>
            <div className="text-xs text-[var(--star-yellow)] mt-1">
              +{stats?.badgeGrowth24h || 0} in 24h
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-center">
            <div className="text-4xl mb-2">🛡️</div>
            <div className="font-mario text-2xl text-[var(--outline-black)] mb-1">
              {stats?.moderationActions || 0}
            </div>
            <div className="text-sm text-[var(--pipe-green)]">Moderation Actions</div>
            <div className="text-xs text-[var(--star-yellow)] mt-1">
              Platform Health
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-center">
            <div className="text-4xl mb-2">⭐</div>
            <div className="font-mario text-2xl text-[var(--outline-black)] mb-1">
              {stats?.averageTrustScore || 100}
            </div>
            <div className="text-sm text-[var(--pipe-green)]">Avg Trust Score</div>
            <div className="text-xs text-[var(--star-yellow)] mt-1">
              Community Health
            </div>
          </div>
        </AdminCard>
      </div>

      {/* User Growth Chart */}
      {analytics?.userGrowth && analytics.userGrowth.length > 0 && (
        <AdminCard size="lg">
          <div className="mb-4">
            <h3 className="font-mario text-xl text-[var(--outline-black)] mb-2">📈 User Growth (30 Days)</h3>
            <div className="text-sm text-[var(--pipe-green)]">New user registrations over time</div>
          </div>
          
          <div className="space-y-2">
            {analytics.userGrowth.slice(-7).map((item, index) => (
              <div key={item.date} className="flex items-center gap-4">
                <div className="w-20 text-sm text-[var(--outline-black)] font-mono">
                  {new Date(item.date).toLocaleDateString()}
                </div>
                <div className="flex-1 bg-[var(--sky-blue)]/20 rounded-lg h-6 relative">
                  <div 
                    className="bg-[var(--luigi-green)] h-full rounded-lg transition-all duration-500"
                    style={{ 
                      width: `${Math.min((item.count / Math.max(...analytics.userGrowth.map(d => d.count))) * 100, 100)}%` 
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-mario font-bold text-[var(--outline-black)]">
                    {item.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      )}

      {/* Badge Distribution */}
      {analytics?.badgeDistribution && analytics.badgeDistribution.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminCard>
            <div className="mb-4">
              <h3 className="font-mario text-lg text-[var(--outline-black)] mb-2">🏆 Badge Distribution</h3>
              <div className="text-sm text-[var(--pipe-green)]">Badges by rarity</div>
            </div>
            
            <div className="space-y-3">
              {analytics.badgeDistribution.map((item) => (
                <div key={item.rarity} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {item.rarity === 'COMMON' && '🥉'}
                      {item.rarity === 'UNCOMMON' && '🥈'}
                      {item.rarity === 'RARE' && '🥇'}
                      {item.rarity === 'EPIC' && '💎'}
                      {item.rarity === 'LEGENDARY' && '👑'}
                      {item.rarity === 'MYTHIC' && '🌟'}
                    </span>
                    <span className="font-mario font-bold text-[var(--outline-black)] capitalize">
                      {item.rarity.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-[var(--sky-blue)]/20 rounded-full h-2">
                      <div 
                        className="bg-[var(--star-yellow)] h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(item.count / Math.max(...analytics.badgeDistribution.map(d => d.count))) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-mario font-bold text-[var(--outline-black)] w-8 text-right">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>

          {/* User Tier Distribution */}
          {analytics?.userTierDistribution && analytics.userTierDistribution.length > 0 && (
            <AdminCard>
              <div className="mb-4">
                <h3 className="font-mario text-lg text-[var(--outline-black)] mb-2">👥 User Tiers</h3>
                <div className="text-sm text-[var(--pipe-green)]">User distribution by tier</div>
              </div>
              
              <div className="space-y-3">
                {analytics.userTierDistribution.map((item) => (
                  <div key={item.tier} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {item.tier === 'EMAIL_USER' && '📧'}
                        {item.tier === 'WALLET_USER' && '👛'}
                        {item.tier === 'VSOL_HOLDER' && '🪙'}
                        {item.tier === 'MODERATOR' && '🛡️'}
                        {item.tier === 'ADMINISTRATOR' && '👑'}
                      </span>
                      <span className="font-mario font-bold text-[var(--outline-black)]">
                        {item.tier.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-[var(--sky-blue)]/20 rounded-full h-2">
                        <div 
                          className="bg-[var(--mario-red)] h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${(item.count / Math.max(...analytics.userTierDistribution.map(d => d.count))) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-mario font-bold text-[var(--outline-black)] w-8 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {/* Moderation Trends */}
      {analytics?.moderationTrends && analytics.moderationTrends.length > 0 && (
        <AdminCard size="lg">
          <div className="mb-4">
            <h3 className="font-mario text-xl text-[var(--outline-black)] mb-2">🛡️ Moderation Trends</h3>
            <div className="text-sm text-[var(--pipe-green)]">Moderation actions over time</div>
          </div>
          
          <div className="space-y-2">
            {analytics.moderationTrends.slice(-7).map((item, index) => (
              <div key={item.date} className="flex items-center gap-4">
                <div className="w-20 text-sm text-[var(--outline-black)] font-mono">
                  {new Date(item.date).toLocaleDateString()}
                </div>
                <div className="flex-1 bg-[var(--sky-blue)]/20 rounded-lg h-6 relative">
                  <div 
                    className="bg-[var(--mario-red)] h-full rounded-lg transition-all duration-500"
                    style={{ 
                      width: `${Math.min((item.actions / Math.max(...analytics.moderationTrends.map(d => d.actions))) * 100, 100)}%` 
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-mario font-bold text-white">
                    {item.actions}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      )}

      {/* Platform Health Summary */}
      <AdminCard size="lg">
        <div className="mb-4">
          <h3 className="font-mario text-xl text-[var(--outline-black)] mb-2">🏥 Platform Health</h3>
          <div className="text-sm text-[var(--pipe-green)]">Overall platform metrics and health indicators</div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="font-mario text-lg text-[var(--outline-black)] mb-1">
              {stats?.activeUsers || 0}
            </div>
            <div className="text-sm text-[var(--pipe-green)]">Active Users</div>
            <div className="text-xs text-[var(--star-yellow)] mt-1">
              {stats?.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% of total
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl mb-2">🎯</div>
            <div className="font-mario text-lg text-[var(--outline-black)] mb-1">
              {stats?.totalBadges || 0}
            </div>
            <div className="text-sm text-[var(--pipe-green)]">Available Badges</div>
            <div className="text-xs text-[var(--star-yellow)] mt-1">
              {stats?.badgesAwarded ? Math.round((stats.badgesAwarded / stats.totalBadges) * 100) : 0}% awarded
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl mb-2">⚡</div>
            <div className="font-mario text-lg text-[var(--outline-black)] mb-1">
              {stats?.averageTrustScore || 100}
            </div>
            <div className="text-sm text-[var(--pipe-green)]">Trust Score</div>
            <div className="text-xs text-[var(--star-yellow)] mt-1">
              {stats?.averageTrustScore && stats.averageTrustScore >= 80 ? 'Excellent' : 
               stats?.averageTrustScore && stats.averageTrustScore >= 60 ? 'Good' : 'Needs Attention'}
            </div>
          </div>
        </div>
      </AdminCard>

      {/* Export Actions */}
      <div className="flex justify-center gap-4">
        <AdminButton variant="primary">
          📊 Export Analytics
        </AdminButton>
        <AdminButton variant="secondary">
          📧 Generate Report
        </AdminButton>
        <AdminButton variant="outline">
          🔄 Refresh Data
        </AdminButton>
      </div>
    </div>
  );
}
