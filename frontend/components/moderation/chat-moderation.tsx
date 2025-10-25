/**
 * Chat Moderation Component
 * 
 * Real-time chat moderation with Mario theme integration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
  user: {
    handle: string;
    avatarUrl?: string;
  };
  moderationStatus?: {
    isMuted: boolean;
    isBanned: boolean;
    trustScore: number;
    strikes: number;
  };
}

interface ChatModerationProps {
  roomId: string;
  className?: string;
}

export function ChatModeration({ roomId, className = '' }: ChatModerationProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [showModerationPanel, setShowModerationPanel] = useState(false);

  // Check if user is moderator/admin
  const isModerator = user?.userTier === 'ADMINISTRATOR' || user?.userTier === 'MODERATOR';

  useEffect(() => {
    if (!isModerator) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/chat/messages/${roomId}?limit=50`);
        const data = await response.json();
        
        if (data.success) {
          setMessages(data.messages);
        }
      } catch (error) {
        console.error('Failed to fetch chat messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    
    // Set up real-time updates (WebSocket or polling)
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [roomId, isModerator]);

  if (!isModerator) {
    return null;
  }

  if (loading) {
    return (
      <div className={`bg-[var(--card)] rounded-lg border-4 border-pipe-300 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-pipe-200 rounded mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
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
        <h2 className="font-mario text-2xl text-pipe-800 mb-2">🛡️ Chat Moderation</h2>
        <div className="text-sm text-pipe-600">Room: {roomId}</div>
      </div>

      {/* Messages List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`
              p-3 rounded-lg border-2 transition-all duration-200
              ${message.moderationStatus?.isMuted ? 'border-mario-red-300 bg-mario-red-50' : ''}
              ${message.moderationStatus?.isBanned ? 'border-mario-red-500 bg-mario-red-100' : ''}
              ${(message.moderationStatus?.trustScore ?? 100) < 50 ? 'border-star-yellow-300 bg-star-yellow-50' : ''}
              ${selectedMessage?.id === message.id ? 'border-mario-red-500 bg-mario-red-50' : 'border-pipe-200'}
              hover:border-pipe-300 cursor-pointer
            `}
            onClick={() => setSelectedMessage(message)}
          >
            <div className="flex items-center gap-3">
              {/* User Avatar */}
              {message.user.avatarUrl ? (
                <img
                  src={message.user.avatarUrl}
                  alt={message.user.handle}
                  className="w-8 h-8 rounded-full border-2 border-pipe-300"
                />
              ) : (
                <div className="w-8 h-8 bg-pipe-200 rounded-full border-2 border-pipe-300 flex items-center justify-center">
                  <span className="font-mario text-pipe-600 text-sm">
                    {message.user.handle.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Message Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mario text-pipe-800">{message.user.handle}</span>
                  
                  {/* Moderation Status Indicators */}
                  {message.moderationStatus?.isMuted && (
                    <span className="text-xs bg-mario-red-500 text-white px-2 py-1 rounded-full">MUTED</span>
                  )}
                  {message.moderationStatus?.isBanned && (
                    <span className="text-xs bg-mario-red-600 text-white px-2 py-1 rounded-full">BANNED</span>
                  )}
                  {(message.moderationStatus?.trustScore ?? 100) < 50 && (
                    <span className="text-xs bg-star-yellow-500 text-white px-2 py-1 rounded-full">LOW TRUST</span>
                  )}
                  
                  <span className="text-xs text-pipe-500">
                    Trust: {message.moderationStatus?.trustScore ?? 100}
                  </span>
                </div>
                
                <div className="text-pipe-700">{message.content}</div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMessage(message);
                    setShowModerationPanel(true);
                  }}
                  className="px-3 py-1 bg-mario-red-500 text-white text-xs rounded-lg font-mario
                           hover:bg-mario-red-600 transition-colors"
                >
                  🛡️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Moderation Panel */}
      {showModerationPanel && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--card)] rounded-lg border-4 border-pipe-300 p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <h3 className="font-mario text-xl text-pipe-800">Moderate User</h3>
              <div className="text-sm text-pipe-600">
                {selectedMessage.user.handle} • Trust: {selectedMessage.moderationStatus?.trustScore || 100}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  // Mute user
                  setShowModerationPanel(false);
                }}
                className="w-full px-4 py-2 bg-mario-red-500 text-white rounded-lg font-mario
                         hover:bg-mario-red-600 transition-colors"
              >
                🔇 Mute User
              </button>
              
              <button
                onClick={() => {
                  // Ban user
                  setShowModerationPanel(false);
                }}
                className="w-full px-4 py-2 bg-mario-red-600 text-white rounded-lg font-mario
                         hover:bg-mario-red-700 transition-colors"
              >
                🚫 Ban User
              </button>
              
              <button
                onClick={() => {
                  // Kick user
                  setShowModerationPanel(false);
                }}
                className="w-full px-4 py-2 bg-star-yellow-500 text-white rounded-lg font-mario
                         hover:bg-star-yellow-600 transition-colors"
              >
                👢 Kick User
              </button>
              
              <button
                onClick={() => {
                  // View user profile
                  setShowModerationPanel(false);
                }}
                className="w-full px-4 py-2 bg-sky-blue-500 text-white rounded-lg font-mario
                         hover:bg-sky-blue-600 transition-colors"
              >
                👤 View Profile
              </button>
            </div>

            <button
              onClick={() => setShowModerationPanel(false)}
              className="w-full mt-4 px-4 py-2 bg-pipe-300 text-pipe-700 rounded-lg font-mario
                       hover:bg-pipe-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


