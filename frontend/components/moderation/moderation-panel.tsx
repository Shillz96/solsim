/**
 * Moderation Panel Component
 * 
 * Mario-themed moderation interface for admins and moderators
 */

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface ModerationAction {
  type: 'MUTE' | 'BAN' | 'KICK' | 'CLEAR' | 'ANNOUNCE';
  username: string;
  duration?: number;
  reason: string;
  roomId?: string;
}

interface ModerationPanelProps {
  className?: string;
}

export function ModerationPanel({ className = '' }: ModerationPanelProps) {
  const { user } = useAuth();
  const [action, setAction] = useState<ModerationAction>({
    type: 'MUTE',
    username: '',
    duration: 5,
    reason: '',
    roomId: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  // Check if user is moderator/admin
  const isModerator = user?.userTier === 'ADMINISTRATOR' || user?.userTier === 'MODERATOR';

  if (!isModerator) {
    return (
      <div className={`bg-white rounded-lg border-4 border-pipe-300 p-6 ${className}`}>
        <div className="text-center">
          <div className="font-mario text-xl text-pipe-800 mb-2">🛡️</div>
          <div className="font-mario text-lg text-pipe-600">Moderator Access Required</div>
          <div className="text-sm text-pipe-500">You need moderator privileges to access this panel</div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult('');

    try {
      const endpoint = `/api/moderation/${action.type.toLowerCase()}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          username: action.username,
          duration: action.duration,
          reason: action.reason,
          roomId: action.roomId,
          count: action.type === 'CLEAR' ? action.duration : undefined
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(`✅ ${data.message}`);
        setAction({
          type: 'MUTE',
          username: '',
          duration: 5,
          reason: '',
          roomId: ''
        });
      } else {
        setResult(`❌ ${data.error}`);
      }
    } catch (error) {
      setResult(`❌ Failed to execute moderation action`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg border-4 border-pipe-300 p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="font-mario text-2xl text-pipe-800 mb-2">🛡️ Moderation Panel</h2>
        <div className="text-sm text-pipe-600">Mario-themed moderation tools for community management</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Action Type */}
        <div>
          <label className="block font-mario text-pipe-800 mb-2">Action Type</label>
          <select
            value={action.type}
            onChange={(e) => setAction({ ...action, type: e.target.value as any })}
            className="w-full px-4 py-2 border-2 border-pipe-300 rounded-lg font-mario
                     focus:border-mario-red-500 focus:outline-none"
          >
            <option value="MUTE">🔇 Mute User</option>
            <option value="BAN">🚫 Ban User</option>
            <option value="KICK">👢 Kick User</option>
            <option value="CLEAR">🧹 Clear Messages</option>
            <option value="ANNOUNCE">📢 Send Announcement</option>
          </select>
        </div>

        {/* Username */}
        {action.type !== 'ANNOUNCE' && (
          <div>
            <label className="block font-mario text-pipe-800 mb-2">Username</label>
            <input
              type="text"
              value={action.username}
              onChange={(e) => setAction({ ...action, username: e.target.value })}
              placeholder="Enter username..."
              className="w-full px-4 py-2 border-2 border-pipe-300 rounded-lg font-mario
                       focus:border-mario-red-500 focus:outline-none"
              required
            />
          </div>
        )}

        {/* Duration */}
        {(action.type === 'MUTE' || action.type === 'BAN') && (
          <div>
            <label className="block font-mario text-pipe-800 mb-2">
              Duration {action.type === 'BAN' ? '(minutes, leave empty for permanent)' : '(minutes)'}
            </label>
            <input
              type="number"
              value={action.duration || ''}
              onChange={(e) => setAction({ ...action, duration: parseInt(e.target.value) || undefined })}
              placeholder="5"
              min="1"
              max="10080"
              className="w-full px-4 py-2 border-2 border-pipe-300 rounded-lg font-mario
                       focus:border-mario-red-500 focus:outline-none"
            />
          </div>
        )}

        {/* Count for Clear Messages */}
        {action.type === 'CLEAR' && (
          <div>
            <label className="block font-mario text-pipe-800 mb-2">Message Count</label>
            <input
              type="number"
              value={action.duration || ''}
              onChange={(e) => setAction({ ...action, duration: parseInt(e.target.value) || undefined })}
              placeholder="10"
              min="1"
              max="100"
              className="w-full px-4 py-2 border-2 border-pipe-300 rounded-lg font-mario
                       focus:border-mario-red-500 focus:outline-none"
              required
            />
          </div>
        )}

        {/* Room ID */}
        <div>
          <label className="block font-mario text-pipe-800 mb-2">Room ID (optional)</label>
          <input
            type="text"
            value={action.roomId}
            onChange={(e) => setAction({ ...action, roomId: e.target.value })}
            placeholder="lobby, token-mint, etc."
            className="w-full px-4 py-2 border-2 border-pipe-300 rounded-lg font-mario
                     focus:border-mario-red-500 focus:outline-none"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block font-mario text-pipe-800 mb-2">Reason</label>
          <textarea
            value={action.reason}
            onChange={(e) => setAction({ ...action, reason: e.target.value })}
            placeholder="Enter moderation reason..."
            rows={3}
            className="w-full px-4 py-2 border-2 border-pipe-300 rounded-lg font-mario
                     focus:border-mario-red-500 focus:outline-none"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`
            w-full px-6 py-3 rounded-lg font-mario text-white border-3
            ${loading ? 'bg-pipe-400 cursor-not-allowed' : 'bg-mario-red-500 hover:bg-mario-red-600'}
            border-mario-red-600 shadow-mario transition-all duration-200
            hover:scale-105 disabled:hover:scale-100
          `}
        >
          {loading ? '⏳ Processing...' : `🚀 Execute ${action.type}`}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className={`
          mt-4 p-4 rounded-lg border-3 font-mario
          ${result.startsWith('✅') ? 'bg-luigi-green-100 border-luigi-green-500 text-luigi-green-800' : 
            'bg-mario-red-100 border-mario-red-500 text-mario-red-800'}
        `}>
          {result}
        </div>
      )}
    </div>
  );
}
