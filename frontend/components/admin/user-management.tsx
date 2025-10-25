/**
 * User Management Panel
 * 
 * Comprehensive user management interface for admins
 */

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useUsers, useUserDetails, useUpdateUserTier, useUpdateUserBalance, UserSearchResult } from '@/hooks/use-admin-api';
import { 
  AdminCard, 
  AdminButton, 
  AdminInput, 
  AdminSelect, 
  AdminModal, 
  AdminTable, 
  AdminTableRow, 
  AdminTableCell,
  AdminStatusBadge,
  AdminSearchInput,
  AdminPagination,
  AdminLoadingSkeleton,
  AdminEmptyState
} from './admin-ui';
import { cn, marioStyles } from '@/lib/utils';

export function UserManagement() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    tier: '',
    minBalance: '',
    maxBalance: '',
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Check if user is admin
  const isAdmin = user?.userTier === 'ADMINISTRATOR';

  // API hooks - only fetch when user is admin
  const { data: usersData, isLoading: usersLoading, error: usersError } = useUsers(
    searchQuery,
    {
      tier: filters.tier || undefined,
      minBalance: filters.minBalance ? Number(filters.minBalance) : undefined,
      maxBalance: filters.maxBalance ? Number(filters.maxBalance) : undefined,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    },
    currentPage,
    20,
    { enabled: isAdmin } // Only fetch when admin
  );

  const { data: userDetails, isLoading: userDetailsLoading } = useUserDetails(selectedUser || '');
  const updateUserTier = useUpdateUserTier();
  const updateUserBalance = useUpdateUserBalance();

  const handleUserClick = (userId: string) => {
    setSelectedUser(userId);
    setShowUserModal(true);
  };

  const handleTierUpdate = async (userId: string, newTier: string) => {
    try {
      await updateUserTier.mutateAsync({ userId, newTier });
      setShowUserModal(false);
    } catch (error) {
      console.error('Failed to update user tier:', error);
    }
  };

  const handleBalanceUpdate = async (userId: string, newBalance: number) => {
    try {
      await updateUserBalance.mutateAsync({ userId, newBalance });
      setShowUserModal(false);
    } catch (error) {
      console.error('Failed to update user balance:', error);
    }
  };

  const getUserTierBadge = (tier: string) => {
    const tierMap = {
      'EMAIL_USER': { status: 'inactive' as const, label: 'Email User' },
      'WALLET_USER': { status: 'active' as const, label: 'Wallet User' },
      'VSOL_HOLDER': { status: 'success' as const, label: 'VSOL Holder' },
      'MODERATOR': { status: 'warning' as const, label: 'Moderator' },
      'ADMINISTRATOR': { status: 'error' as const, label: 'Administrator' }
    };
    
    const tierInfo = tierMap[tier as keyof typeof tierMap] || { status: 'inactive' as const, label: tier };
    return <AdminStatusBadge status={tierInfo.status}>{tierInfo.label}</AdminStatusBadge>;
  };

  const getModerationStatus = (user: any) => {
    if (user.moderationStatus?.isBanned) {
      return <AdminStatusBadge status="error">Banned</AdminStatusBadge>;
    }
    if (user.moderationStatus?.isMuted) {
      return <AdminStatusBadge status="warning">Muted</AdminStatusBadge>;
    }
    return <AdminStatusBadge status="success">Active</AdminStatusBadge>;
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-mario text-3xl text-[var(--outline-black)] mb-2">👥 User Management</h2>
        <div className="text-[var(--pipe-green)]">Search, filter, and manage platform users</div>
      </div>

      {/* Search and Filters */}
      <AdminCard>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AdminSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by handle or email..."
            />
            
            <AdminSelect
              label="User Tier"
              value={filters.tier}
              onChange={(e) => setFilters({ ...filters, tier: e.target.value })}
              options={[
                { value: '', label: 'All Tiers' },
                { value: 'EMAIL_USER', label: 'Email User' },
                { value: 'WALLET_USER', label: 'Wallet User' },
                { value: 'VSOL_HOLDER', label: 'VSOL Holder' },
                { value: 'MODERATOR', label: 'Moderator' },
                { value: 'ADMINISTRATOR', label: 'Administrator' }
              ]}
            />
            
            <AdminInput
              label="Min Balance"
              type="number"
              value={filters.minBalance}
              onChange={(e) => setFilters({ ...filters, minBalance: e.target.value })}
              placeholder="0"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminInput
              label="Max Balance"
              type="number"
              value={filters.maxBalance}
              onChange={(e) => setFilters({ ...filters, maxBalance: e.target.value })}
              placeholder="1000"
            />
            
            <AdminInput
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
        </div>
      </AdminCard>

      {/* Users Table */}
      <AdminCard size="lg">
        {usersLoading ? (
          <AdminLoadingSkeleton lines={5} />
        ) : usersError ? (
          <div className="text-center py-8">
            <div className="text-[var(--mario-red)] font-mario text-lg mb-2">❌ Error</div>
            <div className="text-[var(--pipe-green)]">Failed to load users</div>
          </div>
        ) : !usersData?.users?.length ? (
          <AdminEmptyState
            icon="👥"
            title="No Users Found"
            description="No users match your current search criteria. Try adjusting your filters."
          />
        ) : (
          <>
            <AdminTable headers={['User', 'Tier', 'Balance', 'Badges', 'Status', 'Actions']}>
              {usersData.users.map((user: UserSearchResult) => (
                <AdminTableRow
                  key={user.id}
                  onClick={() => handleUserClick(user.id)}
                >
                  <AdminTableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--sky-blue)] flex items-center justify-center font-mario font-bold text-[var(--outline-black)]">
                        {user.handle.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-mario font-bold text-[var(--outline-black)]">
                          {user.handle}
                        </div>
                        <div className="text-xs text-[var(--pipe-green)]">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </AdminTableCell>
                  
                  <AdminTableCell>
                    {getUserTierBadge(user.userTier)}
                  </AdminTableCell>
                  
                  <AdminTableCell>
                    <div className="font-mono font-bold text-[var(--outline-black)]">
                      {user.virtualSolBalance.toFixed(2)} SOL
                    </div>
                  </AdminTableCell>
                  
                  <AdminTableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-lg">🏆</span>
                      <span className="font-mario font-bold text-[var(--outline-black)]">
                        {user.badgeCount}
                      </span>
                    </div>
                  </AdminTableCell>
                  
                  <AdminTableCell>
                    {getModerationStatus(user)}
                  </AdminTableCell>
                  
                  <AdminTableCell>
                    <AdminButton
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserClick(user.id);
                      }}
                    >
                      View Details
                    </AdminButton>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTable>

            {/* Pagination */}
            {usersData.totalPages > 1 && (
              <div className="mt-6">
                <AdminPagination
                  currentPage={currentPage}
                  totalPages={usersData.totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </AdminCard>

      {/* User Details Modal */}
      <AdminModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="User Details"
        size="xl"
      >
        {userDetailsLoading ? (
          <AdminLoadingSkeleton lines={8} />
        ) : userDetails?.user ? (
          <UserDetailsForm
            user={userDetails.user}
            onTierUpdate={handleTierUpdate}
            onBalanceUpdate={handleBalanceUpdate}
            onClose={() => setShowUserModal(false)}
          />
        ) : (
          <div className="text-center py-8">
            <div className="text-[var(--mario-red)] font-mario text-lg mb-2">❌ Error</div>
            <div className="text-[var(--pipe-green)]">Failed to load user details</div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}

// User Details Form Component
interface UserDetailsFormProps {
  user: any;
  onTierUpdate: (userId: string, newTier: string) => void;
  onBalanceUpdate: (userId: string, newBalance: number) => void;
  onClose: () => void;
}

function UserDetailsForm({ user, onTierUpdate, onBalanceUpdate, onClose }: UserDetailsFormProps) {
  const [newTier, setNewTier] = useState(user.userTier);
  const [newBalance, setNewBalance] = useState(user.virtualSolBalance.toString());
  const [isUpdating, setIsUpdating] = useState(false);

  const handleTierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTier === user.userTier) return;
    
    setIsUpdating(true);
    try {
      await onTierUpdate(user.id, newTier);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const balance = Number(newBalance);
    if (balance === user.virtualSolBalance) return;
    
    setIsUpdating(true);
    try {
      await onBalanceUpdate(user.id, balance);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* User Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block font-mario text-[var(--outline-black)] font-bold text-sm mb-2">
              Handle
            </label>
            <div className="p-3 bg-[var(--sky-blue)]/20 rounded-lg border-2 border-[var(--outline-black)] font-mario font-bold">
              {user.handle}
            </div>
          </div>
          
          <div>
            <label className="block font-mario text-[var(--outline-black)] font-bold text-sm mb-2">
              Email
            </label>
            <div className="p-3 bg-[var(--sky-blue)]/20 rounded-lg border-2 border-[var(--outline-black)]">
              {user.email}
            </div>
          </div>
          
          <div>
            <label className="block font-mario text-[var(--outline-black)] font-bold text-sm mb-2">
              Current Balance
            </label>
            <div className="p-3 bg-[var(--sky-blue)]/20 rounded-lg border-2 border-[var(--outline-black)] font-mono font-bold">
              {user.virtualSolBalance.toFixed(2)} SOL
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block font-mario text-[var(--outline-black)] font-bold text-sm mb-2">
              Registration Date
            </label>
            <div className="p-3 bg-[var(--sky-blue)]/20 rounded-lg border-2 border-[var(--outline-black)]">
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
          
          <div>
            <label className="block font-mario text-[var(--outline-black)] font-bold text-sm mb-2">
              Trust Score
            </label>
            <div className="p-3 bg-[var(--sky-blue)]/20 rounded-lg border-2 border-[var(--outline-black)] font-mario font-bold">
              {user.moderationStatus?.trustScore || 100}
            </div>
          </div>
          
          <div>
            <label className="block font-mario text-[var(--outline-black)] font-bold text-sm mb-2">
              Total Trades
            </label>
            <div className="p-3 bg-[var(--sky-blue)]/20 rounded-lg border-2 border-[var(--outline-black)] font-mario font-bold">
              {user.stats?.totalTrades || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Badges */}
      {user.badges?.length > 0 && (
        <div>
          <label className="block font-mario text-[var(--outline-black)] font-bold text-sm mb-2">
            Badges ({user.badges.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {user.badges.map((badge: any) => (
              <div
                key={badge.id}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--star-yellow)] rounded-lg border-2 border-[var(--outline-black)]"
              >
                <span className="text-lg">{badge.icon}</span>
                <span className="font-mario font-bold text-[var(--outline-black)] text-sm">
                  {badge.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Actions */}
      <div className="space-y-4">
        <h3 className="font-mario text-lg text-[var(--outline-black)]">Admin Actions</h3>
        
        {/* Update Tier */}
        <form onSubmit={handleTierSubmit} className="flex items-end gap-4">
          <div className="flex-1">
            <AdminSelect
              label="Update User Tier"
              value={newTier}
              onChange={(e) => setNewTier(e.target.value)}
              options={[
                { value: 'EMAIL_USER', label: 'Email User' },
                { value: 'WALLET_USER', label: 'Wallet User' },
                { value: 'VSOL_HOLDER', label: 'VSOL Holder' },
                { value: 'MODERATOR', label: 'Moderator' },
                { value: 'ADMINISTRATOR', label: 'Administrator' }
              ]}
            />
          </div>
          <AdminButton
            type="submit"
            variant="primary"
            loading={isUpdating}
            disabled={newTier === user.userTier}
          >
            Update Tier
          </AdminButton>
        </form>
        
        {/* Update Balance */}
        <form onSubmit={handleBalanceSubmit} className="flex items-end gap-4">
          <div className="flex-1">
            <AdminInput
              label="Update Balance (SOL)"
              type="number"
              step="0.01"
              min="0"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
            />
          </div>
          <AdminButton
            type="submit"
            variant="success"
            loading={isUpdating}
            disabled={Number(newBalance) === user.virtualSolBalance}
          >
            Update Balance
          </AdminButton>
        </form>
      </div>

      {/* Close Button */}
      <div className="flex justify-end">
        <AdminButton variant="outline" onClick={onClose}>
          Close
        </AdminButton>
      </div>
    </div>
  );
}
