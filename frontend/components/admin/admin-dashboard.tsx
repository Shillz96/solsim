/**
 * Admin Dashboard
 * 
 * Comprehensive admin interface combining badge and moderation management
 */

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { BadgeAdmin } from './badge-admin';
import { ModerationAdmin } from './moderation-admin';
import { DebugAdmin } from './debug-admin';
import { UserManagement } from './user-management';
import { AnalyticsAdmin } from './analytics-admin';
import { useAdminStats, useRecentActivity } from '@/hooks/use-admin-api';

export function AdminDashboard() {
  const { user } = useAuth();
  const [activePanel, setActivePanel] = useState<'overview' | 'users' | 'badges' | 'moderation' | 'analytics' | 'debug'>('overview');

  // Check if user is admin
  const isAdmin = user?.userTier === 'ADMINISTRATOR';

  // Fetch real-time data for overview
  const { data: statsData, isLoading: statsLoading } = useAdminStats();
  const { data: activityData, isLoading: activityLoading } = useRecentActivity(10);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-luigi-green-50 p-4">
        <div className="w-3/4 mx-auto">
          <div className="bg-[var(--card)] rounded-lg border-4 border-pipe-300 p-8 text-center mb-6 shadow-mario">
            <div className="font-mario text-4xl text-pipe-800 mb-4">👑</div>
            <div className="font-mario text-2xl text-pipe-600 mb-2">Admin Access Required</div>
            <div className="text-pipe-500">You need administrator privileges to access this dashboard</div>
          </div>
          
          {/* Show debug info even when not admin */}
          <DebugAdmin />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-luigi-green-50 p-4">
      <div className="w-3/4 mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-mario text-4xl text-pipe-800 mb-2">🛡️ Admin Dashboard</h1>
          <div className="text-pipe-600">Manage badges, moderation, and community settings</div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <button
            onClick={() => setActivePanel('overview')}
            className={`px-6 py-3 rounded-lg font-mario border-3 transition-all ${
              activePanel === 'overview'
                ? 'bg-mario-red-500 text-white border-mario-red-600 shadow-mario'
                : 'bg-pipe-100 text-pipe-700 border-pipe-300 hover:bg-pipe-200'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActivePanel('users')}
            className={`px-6 py-3 rounded-lg font-mario border-3 transition-all ${
              activePanel === 'users'
                ? 'bg-mario-red-500 text-white border-mario-red-600 shadow-mario'
                : 'bg-pipe-100 text-pipe-700 border-pipe-300 hover:bg-pipe-200'
            }`}
          >
            👥 User Management
          </button>
          <button
            onClick={() => setActivePanel('badges')}
            className={`px-6 py-3 rounded-lg font-mario border-3 transition-all ${
              activePanel === 'badges'
                ? 'bg-mario-red-500 text-white border-mario-red-600 shadow-mario'
                : 'bg-pipe-100 text-pipe-700 border-pipe-300 hover:bg-pipe-200'
            }`}
          >
            🏆 Badge Management
          </button>
          <button
            onClick={() => setActivePanel('moderation')}
            className={`px-6 py-3 rounded-lg font-mario border-3 transition-all ${
              activePanel === 'moderation'
                ? 'bg-mario-red-500 text-white border-mario-red-600 shadow-mario'
                : 'bg-pipe-100 text-pipe-700 border-pipe-300 hover:bg-pipe-200'
            }`}
          >
            🛡️ Moderation Control
          </button>
          <button
            onClick={() => setActivePanel('analytics')}
            className={`px-6 py-3 rounded-lg font-mario border-3 transition-all ${
              activePanel === 'analytics'
                ? 'bg-mario-red-500 text-white border-mario-red-600 shadow-mario'
                : 'bg-pipe-100 text-pipe-700 border-pipe-300 hover:bg-pipe-200'
            }`}
          >
            📈 Analytics
          </button>
          <button
            onClick={() => setActivePanel('debug')}
            className={`px-6 py-3 rounded-lg font-mario border-3 transition-all ${
              activePanel === 'debug'
                ? 'bg-mario-red-500 text-white border-mario-red-600 shadow-mario'
                : 'bg-pipe-100 text-pipe-700 border-pipe-300 hover:bg-pipe-200'
            }`}
          >
            🔍 Debug
          </button>
        </div>

        {/* Overview Panel */}
        {activePanel === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[var(--card)] rounded-lg border-4 border-luigi-green-300 p-6">
                <div className="font-mario text-3xl text-luigi-green-800 mb-2">👥</div>
                <div className="font-mario text-2xl text-luigi-green-800">
                  {statsLoading ? '...' : statsData?.stats?.totalUsers || 0}
                </div>
                <div className="text-sm text-luigi-green-600">Total Users</div>
                <div className="text-xs text-star-yellow-600 mt-1">
                  +{statsData?.stats?.userGrowth24h || 0} in 24h
                </div>
              </div>
              <div className="bg-[var(--card)] rounded-lg border-4 border-star-yellow-300 p-6">
                <div className="font-mario text-3xl text-star-yellow-800 mb-2">🏆</div>
                <div className="font-mario text-2xl text-star-yellow-800">
                  {statsLoading ? '...' : statsData?.stats?.badgesAwarded || 0}
                </div>
                <div className="text-sm text-star-yellow-600">Badges Awarded</div>
                <div className="text-xs text-star-yellow-600 mt-1">
                  +{statsData?.stats?.badgeGrowth24h || 0} in 24h
                </div>
              </div>
              <div className="bg-[var(--card)] rounded-lg border-4 border-mario-red-300 p-6">
                <div className="font-mario text-3xl text-mario-red-800 mb-2">🛡️</div>
                <div className="font-mario text-2xl text-mario-red-800">
                  {statsLoading ? '...' : statsData?.stats?.moderationActions || 0}
                </div>
                <div className="text-sm text-mario-red-600">Moderation Actions</div>
                <div className="text-xs text-star-yellow-600 mt-1">
                  Platform Health
                </div>
              </div>
              <div className="bg-[var(--card)] rounded-lg border-4 border-sky-blue-300 p-6">
                <div className="font-mario text-3xl text-sky-blue-800 mb-2">⭐</div>
                <div className="font-mario text-2xl text-sky-blue-800">
                  {statsLoading ? '...' : statsData?.stats?.averageTrustScore || 100}
                </div>
                <div className="text-sm text-sky-blue-600">Avg Trust Score</div>
                <div className="text-xs text-star-yellow-600 mt-1">
                  Community Health
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[var(--card)] rounded-lg border-4 border-pipe-300 p-6">
              <h2 className="font-mario text-2xl text-pipe-800 mb-4">🚀 Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => setActivePanel('badges')}
                  className="p-4 bg-luigi-green-50 rounded-lg border-2 border-luigi-green-300 
                           hover:bg-luigi-green-100 transition-colors text-left"
                >
                  <div className="font-mario text-lg text-luigi-green-800 mb-1">🏆 Award Badge</div>
                  <div className="text-sm text-luigi-green-600">Give badges to deserving users</div>
                </button>
                <button
                  onClick={() => setActivePanel('moderation')}
                  className="p-4 bg-mario-red-50 rounded-lg border-2 border-mario-red-300 
                           hover:bg-mario-red-100 transition-colors text-left"
                >
                  <div className="font-mario text-lg text-mario-red-800 mb-1">🛡️ Moderation</div>
                  <div className="text-sm text-mario-red-600">Manage community moderation</div>
                </button>
                <button
                  className="p-4 bg-star-yellow-50 rounded-lg border-2 border-star-yellow-300 
                           hover:bg-star-yellow-100 transition-colors text-left"
                >
                  <div className="font-mario text-lg text-star-yellow-800 mb-1">📊 Analytics</div>
                  <div className="text-sm text-star-yellow-600">View community analytics</div>
                </button>
                <button
                  className="p-4 bg-sky-blue-50 rounded-lg border-2 border-sky-blue-300 
                           hover:bg-sky-blue-100 transition-colors text-left"
                >
                  <div className="font-mario text-lg text-sky-blue-800 mb-1">⚙️ Settings</div>
                  <div className="text-sm text-sky-blue-600">Configure system settings</div>
                </button>
                <button
                  className="p-4 bg-coin-yellow-50 rounded-lg border-2 border-coin-yellow-300 
                           hover:bg-coin-yellow-100 transition-colors text-left"
                >
                  <div className="font-mario text-lg text-coin-yellow-800 mb-1">🎮 Events</div>
                  <div className="text-sm text-coin-yellow-600">Manage community events</div>
                </button>
                <button
                  className="p-4 bg-pipe-50 rounded-lg border-2 border-pipe-300 
                           hover:bg-pipe-100 transition-colors text-left"
                >
                  <div className="font-mario text-lg text-pipe-800 mb-1">📝 Reports</div>
                  <div className="text-sm text-pipe-600">Generate community reports</div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[var(--card)] rounded-lg border-4 border-pipe-300 p-6">
              <h2 className="font-mario text-2xl text-pipe-800 mb-4">📈 Recent Activity</h2>
              <div className="space-y-3">
                {activityLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-pipe-300 border-t-pipe-600 rounded-full mx-auto"></div>
                    <div className="text-sm text-pipe-600 mt-2">Loading activity...</div>
                  </div>
                ) : activityData?.activity?.length ? (
                  activityData.activity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 bg-pipe-50 rounded-lg border-2 border-pipe-200">
                      <div className="text-2xl">
                        {activity.type === 'USER_REGISTERED' && '👤'}
                        {activity.type === 'BADGE_AWARDED' && '🏆'}
                        {activity.type === 'MODERATION_ACTION' && '🛡️'}
                        {activity.type === 'TRADE_EXECUTED' && '💰'}
                      </div>
                      <div>
                        <div className="font-mario text-pipe-800">{activity.description}</div>
                        <div className="text-sm text-pipe-600">
                          {new Date(activity.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-pipe-600">
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
