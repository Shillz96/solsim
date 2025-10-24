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

export function AdminDashboard() {
  const { user } = useAuth();
  const [activePanel, setActivePanel] = useState<'overview' | 'badges' | 'moderation' | 'debug'>('debug');

  // Check if user is admin
  const isAdmin = user?.userTier === 'ADMINISTRATOR';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-luigi-green-50 p-4">
        <div className="w-3/4 mx-auto">
          <div className="bg-white rounded-lg border-4 border-pipe-300 p-8 text-center mb-6 shadow-mario">
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
              <div className="bg-white rounded-lg border-4 border-luigi-green-300 p-6">
                <div className="font-mario text-3xl text-luigi-green-800 mb-2">👥</div>
                <div className="font-mario text-2xl text-luigi-green-800">Users</div>
                <div className="text-sm text-luigi-green-600">Total community members</div>
              </div>
              <div className="bg-white rounded-lg border-4 border-star-yellow-300 p-6">
                <div className="font-mario text-3xl text-star-yellow-800 mb-2">🏆</div>
                <div className="font-mario text-2xl text-star-yellow-800">Badges</div>
                <div className="text-sm text-star-yellow-600">Available achievements</div>
              </div>
              <div className="bg-white rounded-lg border-4 border-mario-red-300 p-6">
                <div className="font-mario text-3xl text-mario-red-800 mb-2">🛡️</div>
                <div className="font-mario text-2xl text-mario-red-800">Moderation</div>
                <div className="text-sm text-mario-red-600">Active moderation actions</div>
              </div>
              <div className="bg-white rounded-lg border-4 border-sky-blue-300 p-6">
                <div className="font-mario text-3xl text-sky-blue-800 mb-2">⭐</div>
                <div className="font-mario text-2xl text-sky-blue-800">Trust</div>
                <div className="text-sm text-sky-blue-600">Community trust scores</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border-4 border-pipe-300 p-6">
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
            <div className="bg-white rounded-lg border-4 border-pipe-300 p-6">
              <h2 className="font-mario text-2xl text-pipe-800 mb-4">📈 Recent Activity</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-luigi-green-50 rounded-lg border-2 border-luigi-green-200">
                  <div className="text-2xl">🏆</div>
                  <div>
                    <div className="font-mario text-luigi-green-800">New badge earned!</div>
                    <div className="text-sm text-luigi-green-600">User "MarioTrader" earned the "Founder" badge</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-mario-red-50 rounded-lg border-2 border-mario-red-200">
                  <div className="text-2xl">🛡️</div>
                  <div>
                    <div className="font-mario text-mario-red-800">Moderation action taken</div>
                    <div className="text-sm text-mario-red-600">User "SpamBot" was muted for 30 minutes</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-star-yellow-50 rounded-lg border-2 border-star-yellow-200">
                  <div className="text-2xl">⭐</div>
                  <div>
                    <div className="font-mario text-star-yellow-800">Trust score updated</div>
                    <div className="text-sm text-star-yellow-600">User "HelpfulUser" gained 5 trust points</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Badge Management Panel */}
        {activePanel === 'badges' && <BadgeAdmin />}

        {/* Moderation Panel */}
        {activePanel === 'moderation' && <ModerationAdmin />}

        {/* Debug Panel */}
        {activePanel === 'debug' && <DebugAdmin />}
      </div>
    </div>
  );
}
