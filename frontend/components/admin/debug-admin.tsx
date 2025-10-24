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
    <div className="w-3/4 mx-auto">
      <div className="bg-white rounded-lg border-4 border-pipe-300 p-6 shadow-mario">
        <h2 className="font-mario text-3xl text-pipe-800 mb-6">🔍 Admin Debug Info</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-mario text-xl text-pipe-700 mb-3">Authentication Status</h3>
            <div className="bg-pipe-50 p-4 rounded-lg border-3 border-pipe-200">
              <div className="space-y-2 text-pipe-800">
                <div className="flex justify-between">
                  <strong>Is Authenticated:</strong> 
                  <span>{isAuthenticated ? '✅ Yes' : '❌ No'}</span>
                </div>
                <div className="flex justify-between">
                  <strong>User ID:</strong> 
                  <span className="font-mono text-sm">{user?.id || 'Not available'}</span>
                </div>
                <div className="flex justify-between">
                  <strong>Email:</strong> 
                  <span>{user?.email || 'Not available'}</span>
                </div>
                <div className="flex justify-between">
                  <strong>Handle:</strong> 
                  <span>{user?.handle || 'Not available'}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-mario text-xl text-pipe-700 mb-3">User Tier Information</h3>
            <div className="bg-luigi-green-50 p-4 rounded-lg border-3 border-luigi-green-200">
              <div className="space-y-2 text-pipe-800">
                <div className="flex justify-between">
                  <strong>User Tier:</strong> 
                  <span className="font-mario text-luigi-green-800">{user?.userTier || 'Not available'}</span>
                </div>
                <div className="flex justify-between">
                  <strong>Is Admin Check:</strong> 
                  <span>{user?.userTier === 'ADMINISTRATOR' ? '✅ Yes' : '❌ No'}</span>
                </div>
                <div className="mt-3">
                  <strong className="block mb-2">Raw User Object:</strong>
                  <pre className="text-xs bg-pipe-100 p-3 rounded-lg border-2 border-pipe-200 overflow-auto max-h-64 font-mono">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-mario text-xl text-pipe-700 mb-3">Local Storage Data</h3>
            <div className="bg-star-yellow-50 p-4 rounded-lg border-3 border-star-yellow-200">
              <div className="space-y-3">
                <div>
                  <strong className="block mb-2 text-pipe-800">User Data in localStorage:</strong>
                  <pre className="text-xs bg-pipe-100 p-3 rounded-lg border-2 border-pipe-200 overflow-auto max-h-32 font-mono">
                    {typeof window !== 'undefined' ? (localStorage.getItem('user') || 'No user data found') : 'Loading...'}
                  </pre>
                </div>
                <div>
                  <strong className="block mb-2 text-pipe-800">User ID in localStorage:</strong>
                  <div className="text-sm bg-pipe-100 p-3 rounded-lg border-2 border-pipe-200 font-mono">
                    {typeof window !== 'undefined' ? (localStorage.getItem('userId') || 'No user ID found') : 'Loading...'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-mario text-xl text-pipe-700 mb-3">Troubleshooting Steps</h3>
            <div className="bg-sky-blue-50 p-4 rounded-lg border-3 border-sky-blue-200">
              <ol className="space-y-2 text-pipe-800">
                <li className="flex items-start">
                  <span className="font-mario text-sky-blue-800 mr-2">1.</span>
                  <div>
                    <strong>Refresh the page</strong> to reload user data
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="font-mario text-sky-blue-800 mr-2">2.</span>
                  <div>
                    <strong>Log out and log back in</strong> to get fresh user data
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="font-mario text-sky-blue-800 mr-2">3.</span>
                  <div>
                    <strong>Clear localStorage</strong> and log in again
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="font-mario text-sky-blue-800 mr-2">4.</span>
                  <div>
                    <strong>Check the database</strong> to confirm userTier is 'ADMINISTRATOR'
                  </div>
                </li>
              </ol>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  // Clear localStorage and reload
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="px-6 py-3 bg-mario-red-500 text-white rounded-lg font-mario text-lg 
                       border-3 border-mario-red-600 hover:bg-mario-red-600 transition-all 
                       shadow-mario hover:shadow-mario-lg active:translate-y-1"
            >
              🔄 Clear Cache & Reload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
