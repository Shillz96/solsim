/**
 * Admin Dashboard
 * 
 * Comprehensive admin interface combining badge and moderation management
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { BadgeAdmin } from './badge-admin';
import { ModerationAdmin } from './moderation-admin';
import { DebugAdmin } from './debug-admin';
import { UserManagement } from './user-management';
import { AnalyticsAdmin } from './analytics-admin';
import { useAdminStats, useRecentActivity } from '@/hooks/use-admin-api';
import { cn, marioStyles } from '@/lib/utils';

export function AdminDashboard() {
  const { user } = useAuth();
  const [activePanel, setActivePanel] = useState<'overview' | 'users' | 'badges' | 'moderation' | 'analytics' | 'debug'>('overview');
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if user is admin
  const isAdmin = user?.userTier === 'ADMINISTRATOR';

  // Fetch real-time data for overview - ONLY if user is admin and component is mounted
  const { data: statsData, isLoading: statsLoading } = useAdminStats({ enabled: isAdmin && isMounted });
  const { data: activityData, isLoading: activityLoading } = useRecentActivity(10, { enabled: isAdmin && isMounted });

  // Return loading state during SSR/hydration
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-luigi-green-50 p-4">
        <div className="w-3/4 mx-auto">
          <div className="bg-[var(--card)] rounded-lg border-4 border-pipe-300 p-8 text-center">
            <div className="font-mario text-2xl text-pipe-600">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className={cn(
            marioStyles.cardLg(false),
            'text-center bg-[var(--card)] mb-6'
          )}>
            <div className="text-6xl mb-4">👑</div>
            <h2 className={cn(marioStyles.heading(2), 'mb-2')}>Admin Access Required</h2>
            <p className={marioStyles.bodyText('normal')}>You need administrator privileges to access this dashboard</p>
          </div>
          
          {/* Show debug info even when not admin */}
          <DebugAdmin />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={cn(marioStyles.heading(1), 'mb-2')}>🛡️ Admin Dashboard</h1>
          <p className={marioStyles.bodyText('medium')}>Manage badges, moderation, and community settings</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <button
            onClick={() => setActivePanel('overview')}
            className={cn(
              marioStyles.button('primary', 'md'),
              activePanel === 'overview'
                ? 'bg-[var(--mario-red)] text-white'
                : 'bg-white text-[var(--outline-black)]'
            )}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActivePanel('users')}
            className={cn(
              marioStyles.button('primary', 'md'),
              activePanel === 'users'
                ? 'bg-[var(--mario-red)] text-white'
                : 'bg-white text-[var(--outline-black)]'
            )}
          >
            👥 User Management
          </button>
          <button
            onClick={() => setActivePanel('badges')}
            className={cn(
              marioStyles.button('primary', 'md'),
              activePanel === 'badges'
                ? 'bg-[var(--mario-red)] text-white'
                : 'bg-white text-[var(--outline-black)]'
            )}
          >
            🏆 Badge Management
          </button>
          <button
            onClick={() => setActivePanel('moderation')}
            className={cn(
              marioStyles.button('primary', 'md'),
              activePanel === 'moderation'
                ? 'bg-[var(--mario-red)] text-white'
                : 'bg-white text-[var(--outline-black)]'
            )}
          >
            🛡️ Moderation Control
          </button>
          <button
            onClick={() => setActivePanel('analytics')}
            className={cn(
              marioStyles.button('primary', 'md'),
              activePanel === 'analytics'
                ? 'bg-[var(--mario-red)] text-white'
                : 'bg-white text-[var(--outline-black)]'
            )}
          >
            📈 Analytics
          </button>
          <button
            onClick={() => setActivePanel('debug')}
            className={cn(
              marioStyles.button('primary', 'md'),
              activePanel === 'debug'
                ? 'bg-[var(--mario-red)] text-white'
                : 'bg-white text-[var(--outline-black)]'
            )}
          >
            🔍 Debug
          </button>
        </div>

        {/* Overview Panel */}
        {activePanel === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className={cn(
                marioStyles.cardGradient('from-[var(--luigi-green)]/20 to-[var(--card)]', true),
                'bg-gradient-to-br'
              )}>
                <div className="text-4xl mb-2">👥</div>
                <div className={cn(marioStyles.heading(3))}>
                  {statsLoading ? '...' : statsData?.stats?.totalUsers || 0}
                </div>
                <div className={marioStyles.bodyText('semibold')}>Total Users</div>
                <div className="text-xs text-[var(--luigi-green)] font-bold mt-1">
                  +{statsData?.stats?.userGrowth24h || 0} in 24h
                </div>
              </div>
              <div className={cn(
                marioStyles.cardGradient('from-[var(--star-yellow)]/20 to-[var(--card)]', true),
                'bg-gradient-to-br'
              )}>
                <div className="text-4xl mb-2">🏆</div>
                <div className={cn(marioStyles.heading(3))}>
                  {statsLoading ? '...' : statsData?.stats?.badgesAwarded || 0}
                </div>
                <div className={marioStyles.bodyText('semibold')}>Badges Awarded</div>
                <div className="text-xs text-[var(--coin-gold)] font-bold mt-1">
                  +{statsData?.stats?.badgeGrowth24h || 0} in 24h
                </div>
              </div>
              <div className={cn(
                marioStyles.cardGradient('from-[var(--mario-red)]/20 to-[var(--card)]', true),
                'bg-gradient-to-br'
              )}>
                <div className="text-4xl mb-2">🛡️</div>
                <div className={cn(marioStyles.heading(3))}>
                  {statsLoading ? '...' : statsData?.stats?.moderationActions || 0}
                </div>
                <div className={marioStyles.bodyText('semibold')}>Moderation Actions</div>
                <div className="text-xs text-[var(--mario-red)] font-bold mt-1">
                  Platform Health
                </div>
              </div>
              <div className={cn(
                marioStyles.cardGradient('from-[var(--sky-blue)]/20 to-[var(--card)]', true),
                'bg-gradient-to-br'
              )}>
                <div className="text-4xl mb-2">⭐</div>
                <div className={cn(marioStyles.heading(3))}>
                  {statsLoading ? '...' : statsData?.stats?.averageTrustScore || 100}
                </div>
                <div className={marioStyles.bodyText('semibold')}>Avg Trust Score</div>
                <div className="text-xs text-[var(--super-blue)] font-bold mt-1">
                  Community Health
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={marioStyles.cardLg(false)}>
              <h2 className={cn(marioStyles.heading(3), 'mb-4')}>🚀 Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => setActivePanel('badges')}
                  className={cn(
                    marioStyles.interactiveCard('md'),
                    'bg-gradient-to-br from-[var(--luigi-green)]/10 to-white text-left'
                  )}
                >
                  <div className={cn(marioStyles.heading(4), 'text-[var(--luigi-green)] mb-1')}>🏆 Award Badge</div>
                  <div className={marioStyles.bodyText('normal')}>Give badges to deserving users</div>
                </button>
                <button
                  onClick={() => setActivePanel('moderation')}
                  className={cn(
                    marioStyles.interactiveCard('md'),
                    'bg-gradient-to-br from-[var(--mario-red)]/10 to-white text-left'
                  )}
                >
                  <div className={cn(marioStyles.heading(4), 'text-[var(--mario-red)] mb-1')}>🛡️ Moderation</div>
                  <div className={marioStyles.bodyText('normal')}>Manage community moderation</div>
                </button>
                <button
                  onClick={() => setActivePanel('analytics')}
                  className={cn(
                    marioStyles.interactiveCard('md'),
                    'bg-gradient-to-br from-[var(--star-yellow)]/10 to-white text-left'
                  )}
                >
                  <div className={cn(marioStyles.heading(4), 'text-[var(--coin-gold)] mb-1')}>📊 Analytics</div>
                  <div className={marioStyles.bodyText('normal')}>View community analytics</div>
                </button>
                <button
                  className={cn(
                    marioStyles.interactiveCard('md'),
                    'bg-gradient-to-br from-[var(--sky-blue)]/10 to-white text-left'
                  )}
                >
                  <div className={cn(marioStyles.heading(4), 'text-[var(--super-blue)] mb-1')}>⚙️ Settings</div>
                  <div className={marioStyles.bodyText('normal')}>Configure system settings</div>
                </button>
                <button
                  className={cn(
                    marioStyles.interactiveCard('md'),
                    'bg-gradient-to-br from-[var(--coin-gold)]/10 to-white text-left'
                  )}
                >
                  <div className={cn(marioStyles.heading(4), 'text-[var(--brick-brown)] mb-1')}>🎮 Events</div>
                  <div className={marioStyles.bodyText('normal')}>Manage community events</div>
                </button>
                <button
                  className={cn(
                    marioStyles.interactiveCard('md'),
                    'bg-gradient-to-br from-[var(--pipe-green)]/10 to-white text-left'
                  )}
                >
                  <div className={cn(marioStyles.heading(4), 'text-[var(--pipe-green)] mb-1')}>📝 Reports</div>
                  <div className={marioStyles.bodyText('normal')}>Generate community reports</div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className={marioStyles.cardLg(false)}>
              <h2 className={cn(marioStyles.heading(3), 'mb-4')}>📈 Recent Activity</h2>
              <div className="space-y-3">
                {activityLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin w-8 h-8 border-4 border-[var(--outline-black)] border-t-[var(--star-yellow)] rounded-full mx-auto"></div>
                    <div className={cn(marioStyles.bodyText('normal'), 'mt-2')}>Loading activity...</div>
                  </div>
                ) : activityData?.activity?.length ? (
                  activityData.activity.map((activity) => (
                    <div key={activity.id} className={cn(
                      marioStyles.cardSm(true),
                      'flex items-center gap-3'
                    )}>
                      <div className="text-2xl">
                        {activity.type === 'USER_REGISTERED' && '👤'}
                        {activity.type === 'BADGE_AWARDED' && '🏆'}
                        {activity.type === 'MODERATION_ACTION' && '🛡️'}
                        {activity.type === 'TRADE_EXECUTED' && '💰'}
                      </div>
                      <div className="flex-1">
                        <div className={marioStyles.bodyText('semibold')}>{activity.description}</div>
                        <div className={cn(marioStyles.bodyText('normal'), 'text-xs opacity-70')}>
                          {new Date(activity.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={cn('text-center py-4', marioStyles.bodyText('normal'))}>
                    No recent activity to display
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User Management Panel */}
        {activePanel === 'users' && <UserManagement />}

        {/* Badge Management Panel */}
        {activePanel === 'badges' && <BadgeAdmin />}

        {/* Moderation Panel */}
        {activePanel === 'moderation' && <ModerationAdmin />}

        {/* Analytics Panel */}
        {activePanel === 'analytics' && <AnalyticsAdmin />}

        {/* Debug Panel */}
        {activePanel === 'debug' && <DebugAdmin />}
      </div>
    </div>
  );
}
