/**
 * Admin UI Components
 * 
 * Reusable UI components for admin interface with Mario theme styling
 */

import React from 'react';
import { cn, marioStyles } from '@/lib/utils';

// Admin Card Component
interface AdminCardProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function AdminCard({ children, className, size = 'md', hover = true }: AdminCardProps) {
  const cardClass = size === 'lg' ? marioStyles.cardLg(hover) : 
                   size === 'sm' ? marioStyles.cardSm(hover) : 
                   marioStyles.card(hover);
  
  return (
    <div className={cn(cardClass, className)}>
      {children}
    </div>
  );
}

// Admin Button Component
interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'success' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function AdminButton({ 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  children, 
  className,
  disabled,
  ...props 
}: AdminButtonProps) {
  const buttonClass = marioStyles.button(variant, size);
  
  return (
    <button
      className={cn(buttonClass, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

// Admin Input Component
interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AdminInput({ label, error, size = 'md', className, ...props }: AdminInputProps) {
  const inputClass = marioStyles.input(size);
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block font-mario text-[var(--outline-black)] font-bold text-sm">
          {label}
        </label>
      )}
      <input
        className={cn(inputClass, error && 'border-[var(--mario-red)]', className)}
        {...props}
      />
      {error && (
        <p className="text-sm text-[var(--mario-red)] font-medium">{error}</p>
      )}
    </div>
  );
}

// Admin Select Component
interface AdminSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function AdminSelect({ 
  label, 
  error, 
  options, 
  placeholder, 
  className, 
  ...props 
}: AdminSelectProps) {
  const selectClass = marioStyles.select;
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block font-mario text-[var(--outline-black)] font-bold text-sm">
          {label}
        </label>
      )}
      <select
        className={cn(selectClass, error && 'border-[var(--mario-red)]', className)}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-[var(--mario-red)] font-medium">{error}</p>
      )}
    </div>
  );
}

// Admin Modal Component
interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AdminModal({ isOpen, onClose, title, children, size = 'md' }: AdminModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        'relative w-full bg-[var(--card)] rounded-2xl border-4 border-[var(--outline-black)]',
        'shadow-[6px_6px_0_var(--outline-black)]',
        sizeClasses[size]
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-3 border-[var(--outline-black)]">
          <h2 className="font-mario text-xl text-[var(--outline-black)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--sky-blue)]/20 rounded-lg transition-colors"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// Admin Table Component
interface AdminTableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export function AdminTable({ headers, children, className }: AdminTableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b-3 border-[var(--outline-black)]">
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-4 py-3 text-left font-mario text-sm text-[var(--outline-black)]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
}

// Admin Table Row Component
interface AdminTableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function AdminTableRow({ children, className, onClick }: AdminTableRowProps) {
  return (
    <tr 
      className={cn(
        'border-b border-[var(--color-border)] hover:bg-[var(--sky-blue)]/10 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

// Admin Table Cell Component
interface AdminTableCellProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminTableCell({ children, className }: AdminTableCellProps) {
  return (
    <td className={cn('px-4 py-3 text-sm', className)}>
      {children}
    </td>
  );
}

// Admin Status Badge Component
interface AdminStatusBadgeProps {
  status: 'active' | 'inactive' | 'muted' | 'banned' | 'warning' | 'success' | 'error';
  children: React.ReactNode;
}

export function AdminStatusBadge({ status, children }: AdminStatusBadgeProps) {
  const statusClasses = {
    active: 'bg-[var(--luigi-green)] text-white',
    inactive: 'bg-[var(--pipe-green)] text-white',
    muted: 'bg-[var(--star-yellow)] text-[var(--outline-black)]',
    banned: 'bg-[var(--mario-red)] text-white',
    warning: 'bg-[var(--star-yellow)] text-[var(--outline-black)]',
    success: 'bg-[var(--luigi-green)] text-white',
    error: 'bg-[var(--mario-red)] text-white'
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-1 rounded-lg text-xs font-mario font-bold',
      'border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)]',
      statusClasses[status]
    )}>
      {children}
    </span>
  );
}

// Admin Loading Skeleton Component
interface AdminLoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export function AdminLoadingSkeleton({ lines = 3, className }: AdminLoadingSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-[var(--sky-blue)]/20 rounded animate-pulse"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}

// Admin Empty State Component
interface AdminEmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function AdminEmptyState({ icon = '📭', title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="font-mario text-xl text-[var(--outline-black)] mb-2">
        {title}
      </h3>
      <p className="text-[var(--pipe-green)] mb-6 max-w-md mx-auto">
        {description}
      </p>
      {action && (
        <AdminButton onClick={action.onClick}>
          {action.label}
        </AdminButton>
      )}
    </div>
  );
}

// Admin Search Input Component
interface AdminSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function AdminSearchInput({ value, onChange, placeholder = 'Search...', className }: AdminSearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-10 pr-4 py-2 border-3 border-[var(--outline-black)] rounded-lg',
          'font-mario focus:border-[var(--luigi-green)] focus:outline-none',
          'shadow-[2px_2px_0_var(--outline-black)] transition-all'
        )}
      />
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--pipe-green)]">
        🔍
      </div>
    </div>
  );
}

// Admin Pagination Component
interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function AdminPagination({ currentPage, totalPages, onPageChange, className }: AdminPaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <AdminButton
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        ←
      </AdminButton>
      
      {pages.map((page) => (
        <AdminButton
          key={page}
          variant={page === currentPage ? 'primary' : 'outline'}
          size="sm"
          onClick={() => onPageChange(page)}
        >
          {page}
        </AdminButton>
      ))}
      
      <AdminButton
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        →
      </AdminButton>
    </div>
  );
}
