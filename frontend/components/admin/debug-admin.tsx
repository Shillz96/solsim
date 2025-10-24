/**
 * Debug Admin Component
 * 
 * Debug component to help troubleshoot admin access issues
 */

'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';

export function DebugAdmin() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="bg-white rounded-lg border-4 border-pipe-300 p-6">
      <h2 className="font-mario text-2xl text-pipe-800 mb-4">🔍 Admin Debug Info</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-mario text-lg text-pipe-700 mb-2">Authentication Status</h3>
          <div className="bg-pipe-50 p-3 rounded border-2 border-pipe-200">
            <div><strong>Is Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}</div>
            <div><strong>User ID:</strong> {user?.id || 'Not available'}</div>
            <div><strong>Email:</strong> {user?.email || 'Not available'}</div>
            <div><strong>Handle:</strong> {user?.handle || 'Not available'}</div>
          </div>
        </div>

        <div>
          <h3 className="font-mario text-lg text-pipe-700 mb-2">User Tier Information</h3>
          <div className="bg-pipe-50 p-3 rounded border-2 border-pipe-200">
            <div><strong>User Tier:</strong> {user?.userTier || 'Not available'}</div>
            <div><strong>Is Admin Check:</strong> {user?.userTier === 'ADMINISTRATOR' ? '✅ Yes' : '❌ No'}</div>
            <div><strong>Raw User Object:</strong></div>
            <pre className="text-xs bg-pipe-100 p-2 rounded mt-2 overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        </div>

        <div>
          <h3 className="font-mario text-lg text-pipe-700 mb-2">Local Storage Data</h3>
          <div className="bg-pipe-50 p-3 rounded border-2 border-pipe-200">
            <div><strong>User Data in localStorage:</strong></div>
            <pre className="text-xs bg-pipe-100 p-2 rounded mt-2 overflow-auto">
              {localStorage.getItem('user') || 'No user data found'}
            </pre>
            <div className="mt-2"><strong>User ID in localStorage:</strong></div>
            <div className="text-xs bg-pipe-100 p-2 rounded mt-1">
              {localStorage.getItem('userId') || 'No user ID found'}
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-mario text-lg text-pipe-700 mb-2">Troubleshooting Steps</h3>
          <div className="bg-luigi-green-50 p-3 rounded border-2 border-luigi-green-200">
            <ol className="text-sm space-y-1">
              <li>1. <strong>Refresh the page</strong> to reload user data</li>
              <li>2. <strong>Log out and log back in</strong> to get fresh user data</li>
              <li>3. <strong>Clear localStorage</strong> and log in again</li>
              <li>4. <strong>Check the database</strong> to confirm userTier is 'ADMINISTRATOR'</li>
            </ol>
          </div>
        </div>

        <div>
          <button
            onClick={() => {
              // Clear localStorage and reload
              localStorage.clear();
              window.location.reload();
            }}
            className="px-4 py-2 bg-mario-red-500 text-white rounded-lg font-mario border-2 border-mario-red-600 hover:bg-mario-red-600 transition-colors"
          >
            🔄 Clear Cache & Reload
          </button>
        </div>
      </div>
    </div>
  );
}
