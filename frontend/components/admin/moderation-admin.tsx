/**
 * Moderation Admin Panel
 * 
 * Comprehensive admin interface for managing moderation settings and statistics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useModerationConfig, useUpdateModerationConfig, useModerationStats, useTestModerationBot } from '@/hooks/use-admin-api';
import { AdminCard, AdminButton, AdminInput, AdminSelect, AdminLoadingSkeleton } from './admin-ui';

interface ModerationConfig {
  rateLimit: {
    messagesPerWindow: number;
    windowSeconds: number;
    burstLimit: number;
  };
  spam: {
    repeatedCharThreshold: number;
    duplicateMessageWindow: number;
    duplicateMessageThreshold: number;
  };
  toxicity: {
    enabled: boolean;
    confidenceThreshold: number;
    severityThreshold: string;
  };
  pumpDump: {
    enabled: boolean;
    confidenceThreshold: number;
    severityThreshold: string;
  };
  capsSpam: {
    enabled: boolean;
    capsRatioThreshold: number;
    minMessageLength: number;
  };
  actions: {
    warningThreshold: number;
    strikeThreshold: number;
    muteThreshold: number;
    banThreshold: number;
  };
  trustScore: {
    initialScore: number;
    warningPenalty: number;
    strikePenalty: number;
    mutePenalty: number;
    banPenalty: number;
    minScore: number;
    maxScore: number;
  };
  durations: {
    warning: number;
    strike: number;
    mute: number;
    ban: number;
  };
}

interface ModerationStats {
  totalUsers: number;
  mutedUsers: number;
  bannedUsers: number;
  totalActions: number;
  recentActions: number;
  trustScoreDistribution: Array<{
    trustScore: number;
    userCount: number;
  }>;
}

export function ModerationAdmin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'config' | 'stats' | 'test'>('config');
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [config, setConfig] = useState<ModerationConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>('');

  // API hooks
  const { data: configData, isLoading: configLoading, error: configError } = useModerationConfig();
  const { data: statsData, isLoading: statsLoading, error: statsError } = useModerationStats();
  const updateConfig = useUpdateModerationConfig();
  const testBot = useTestModerationBot();

  // Check if user is admin
  const isAdmin = user?.userTier === 'ADMINISTRATOR';

  // Initialize local config state from API data
  useEffect(() => {
    if (configData?.config && !config) {
      setConfig(configData.config);
    }
  }, [configData?.config, config]);

  const handleSaveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      await updateConfig.mutateAsync(config);
      setMessage('✅ Configuration saved successfully!');
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setMessage('❌ Failed to save configuration. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestBot = async () => {
    if (!testMessage.trim()) return;

    try {
      const result = await testBot.mutateAsync(testMessage);
      setTestResult(result);
      setMessage('✅ Moderation test completed!');
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Failed to test bot:', error);
      setMessage('❌ Failed to test moderation bot. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    }
  };


  if (!isAdmin) {
    return (
      <div className="bg-card rounded-lg border-4 border-pipe-300 p-6 shadow-mario">
        <div className="text-center">
          <div className="font-mario text-xl text-pipe-800 mb-2">👑</div>
          <div className="font-mario text-lg text-pipe-600">Admin Access Required</div>
          <div className="text-sm text-pipe-500">You need administrator privileges to access this panel</div>
        </div>
      </div>
    );
  }

  if (configLoading || statsLoading) {
    return (
      <AdminCard>
        <AdminLoadingSkeleton lines={8} />
      </AdminCard>
    );
  }

  return (
    <div className="bg-card rounded-lg border-4 border-pipe-300 p-6 shadow-mario">
      <div className="mb-6">
        <h2 className="font-mario text-3xl text-pipe-800 mb-2">🛡️ Moderation Admin Panel</h2>
        <div className="text-pipe-600">Manage moderation settings and view statistics</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-lg font-mario border-3 transition-all ${
            activeTab === 'config'
              ? 'bg-mario-red-500 text-white border-mario-red-600'
              : 'bg-pipe-100 text-pipe-700 border-pipe-300'
          }`}
        >
          ⚙️ Configuration
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
        <button
          onClick={() => setActiveTab('test')}
          className={`px-4 py-2 rounded-lg font-mario border-3 transition-all ${
            activeTab === 'test'
              ? 'bg-mario-red-500 text-white border-mario-red-600'
              : 'bg-pipe-100 text-pipe-700 border-pipe-300'
          }`}
        >
          🧪 Test Bot
        </button>
      </div>

        {/* Configuration Tab */}
        {activeTab === 'config' && config && (
        <div className="space-y-6">
          {/* Rate Limiting */}
          <div className="bg-pipe-50 rounded-lg p-4 border-2 border-pipe-200">
            <h3 className="font-mario text-lg text-pipe-800 mb-4">🚦 Rate Limiting</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-mario text-pipe-700 mb-2">Messages per Window</label>
                <input
                  type="number"
                  value={configData.config.rateLimit.messagesPerWindow}
                  onChange={(e) => {
                    const newConfig = {
                      ...configData.config,
                      rateLimit: { 
                        ...configData.config.rateLimit, 
                        messagesPerWindow: parseInt(e.target.value) 
                      }
                    };
                    handleSaveConfig();
                  }}
                  className="w-full px-3 py-2 border-2 border-pipe-300 rounded-lg font-mario"
                />
              </div>
              <div>
                <label className="block font-mario text-pipe-700 mb-2">Window (seconds)</label>
                <input
                  type="number"
                  value={config.rateLimit.windowSeconds}
                  onChange={(e) => setConfig({
                    ...config,
                    rateLimit: { ...config.rateLimit, windowSeconds: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border-2 border-pipe-300 rounded-lg font-mario"
                />
              </div>
              <div>
                <label className="block font-mario text-pipe-700 mb-2">Burst Limit</label>
                <input
                  type="number"
                  value={config.rateLimit.burstLimit}
                  onChange={(e) => setConfig({
                    ...config,
                    rateLimit: { ...config.rateLimit, burstLimit: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border-2 border-pipe-300 rounded-lg font-mario"
                />
              </div>
            </div>
          </div>

          {/* Spam Detection */}
          <div className="bg-pipe-50 rounded-lg p-4 border-2 border-pipe-200">
            <h3 className="font-mario text-lg text-pipe-800 mb-4">🛡️ Spam Detection</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-mario text-pipe-700 mb-2">Repeated Char Threshold</label>
                <input
                  type="number"
                  value={config.spam.repeatedCharThreshold}
                  onChange={(e) => setConfig({
                    ...config,
                    spam: { ...config.spam, repeatedCharThreshold: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border-2 border-pipe-300 rounded-lg font-mario"
                />
              </div>
              <div>
                <label className="block font-mario text-pipe-700 mb-2">Duplicate Window (seconds)</label>
                <input
                  type="number"
                  value={config.spam.duplicateMessageWindow}
                  onChange={(e) => setConfig({
                    ...config,
                    spam: { ...config.spam, duplicateMessageWindow: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border-2 border-pipe-300 rounded-lg font-mario"
                />
              </div>
              <div>
                <label className="block font-mario text-pipe-700 mb-2">Duplicate Threshold</label>
                <input
                  type="number"
                  value={config.spam.duplicateMessageThreshold}
                  onChange={(e) => setConfig({
                    ...config,
                    spam: { ...config.spam, duplicateMessageThreshold: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border-2 border-pipe-300 rounded-lg font-mario"
                />
              </div>
            </div>
          </div>

          {/* Trust Score System */}
          <div className="bg-pipe-50 rounded-lg p-4 border-2 border-pipe-200">
            <h3 className="font-mario text-lg text-pipe-800 mb-4">⭐ Trust Score System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-mario text-pipe-700 mb-2">Initial Score</label>
                <input
                  type="number"
                  value={config.trustScore.initialScore}
                  onChange={(e) => setConfig({
                    ...config,
                    trustScore: { ...config.trustScore, initialScore: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border-2 border-pipe-300 rounded-lg font-mario"
                />
              </div>
              <div>
                <label className="block font-mario text-pipe-700 mb-2">Warning Penalty</label>
                <input
                  type="number"
                  value={config.trustScore.warningPenalty}
                  onChange={(e) => setConfig({
                    ...config,
                    trustScore: { ...config.trustScore, warningPenalty: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border-2 border-pipe-300 rounded-lg font-mario"
                />
              </div>
              <div>
                <label className="block font-mario text-pipe-700 mb-2">Strike Penalty</label>
                <input
                  type="number"
                  value={config.trustScore.strikePenalty}
                  onChange={(e) => setConfig({
                    ...config,
                    trustScore: { ...config.trustScore, strikePenalty: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border-2 border-pipe-300 rounded-lg font-mario"
                />
              </div>
              <div>
                <label className="block font-mario text-pipe-700 mb-2">Mute Penalty</label>
                <input
                  type="number"
                  value={config.trustScore.mutePenalty}
                  onChange={(e) => setConfig({
                    ...config,
                    trustScore: { ...config.trustScore, mutePenalty: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border-2 border-pipe-300 rounded-lg font-mario"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className={`w-full px-6 py-3 rounded-lg font-mario text-white border-3 ${
              saving ? 'bg-pipe-400 cursor-not-allowed' : 'bg-mario-red-500 hover:bg-mario-red-600'
            } border-mario-red-600 shadow-mario transition-all duration-200`}
          >
            {saving ? '⏳ Saving...' : '💾 Save Configuration'}
          </button>
        </div>
      )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && statsData?.stats && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-luigi-green-50 rounded-lg p-4 border-2 border-luigi-green-300">
              <div className="font-mario text-2xl text-luigi-green-800">{statsData.stats.totalUsers}</div>
              <div className="text-sm text-luigi-green-600">Total Users</div>
            </div>
            <div className="bg-mario-red-50 rounded-lg p-4 border-2 border-mario-red-300">
              <div className="font-mario text-2xl text-mario-red-800">{statsData.stats.mutedUsers}</div>
              <div className="text-sm text-mario-red-600">Muted Users</div>
            </div>
            <div className="bg-mario-red-50 rounded-lg p-4 border-2 border-mario-red-300">
              <div className="font-mario text-2xl text-mario-red-800">{statsData.stats.bannedUsers}</div>
              <div className="text-sm text-mario-red-600">Banned Users</div>
            </div>
            <div className="bg-star-yellow-50 rounded-lg p-4 border-2 border-star-yellow-300">
              <div className="font-mario text-2xl text-star-yellow-800">{statsData.stats.totalActions}</div>
              <div className="text-sm text-star-yellow-600">Total Actions</div>
            </div>
          </div>

          {/* Trust Score Distribution */}
          <div className="bg-pipe-50 rounded-lg p-4 border-2 border-pipe-200">
            <h3 className="font-mario text-lg text-pipe-800 mb-4">📊 Trust Score Distribution</h3>
            <div className="space-y-2">
              {statsData.stats.trustScoreDistribution.map((item: { trustScore: number; userCount: number }, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-mario text-pipe-700">Score {item.trustScore}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-pipe-200 rounded-full h-2">
                      <div 
                        className="bg-mario-red-500 h-2 rounded-full" 
                        style={{ width: `${(item.userCount / Math.max(...statsData.stats.trustScoreDistribution.map((d: { trustScore: number; userCount: number }) => d.userCount))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-pipe-600">{item.userCount} users</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Test Tab */}
      {activeTab === 'test' && (
        <div className="space-y-4">
          <div>
            <label className="block font-mario text-pipe-800 mb-2">Test Message</label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Enter a message to test moderation bot..."
              className="w-full px-4 py-2 border-2 border-pipe-300 rounded-lg font-mario
                       focus:border-mario-red-500 focus:outline-none"
              rows={4}
            />
          </div>
          <button
            onClick={handleTestBot}
            disabled={testBot.isPending}
            className="w-full px-6 py-3 rounded-lg font-mario text-white border-3
                     bg-mario-red-500 hover:bg-mario-red-600 border-mario-red-600 shadow-mario
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testBot.isPending ? '⏳ Testing...' : '🧪 Test Moderation Bot'}
          </button>
          
          {testResult && (
            <div className="mt-4 p-4 bg-card rounded-lg border-2 border-pipe-300">
              <h4 className="font-mario text-lg text-pipe-800 mb-2">Analysis Result</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Spam:</span>
                  <span className={testResult.analysis.isSpam ? 'text-mario-red-600' : 'text-luigi-green-600'}>
                    {testResult.analysis.isSpam ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Toxic:</span>
                  <span className={testResult.analysis.isToxic ? 'text-mario-red-600' : 'text-luigi-green-600'}>
                    {testResult.analysis.isToxic ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Pump & Dump:</span>
                  <span className={testResult.analysis.isPumpDump ? 'text-mario-red-600' : 'text-luigi-green-600'}>
                    {testResult.analysis.isPumpDump ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Caps Spam:</span>
                  <span className={testResult.analysis.isCapsSpam ? 'text-mario-red-600' : 'text-luigi-green-600'}>
                    {testResult.analysis.isCapsSpam ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="mt-3 p-3 bg-pipe-100 rounded-lg">
                  <div className="font-medium text-pipe-800">Recommendation:</div>
                  <div className="text-sm text-pipe-600">
                    {testResult.recommendations.action === 'none' ? '✅ Message appears clean' : 
                     testResult.recommendations.action === 'warning' ? '⚠️ Warning recommended' :
                     testResult.recommendations.action === 'strike' ? '⚡ Strike recommended' :
                     testResult.recommendations.action === 'mute' ? '🔇 Mute recommended' : 'Message appears clean'}
                  </div>
                  <div className="text-xs text-pipe-500 mt-1">
                    Reason: {testResult.recommendations.reason}
                  </div>
                </div>
              </div>
            </div>
          )}
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
