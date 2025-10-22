'use client';

import React from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';

/**
 * Notification variant types for semantic styling
 */
type NotificationVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info';

/**
 * Interface for notification action buttons
 */
interface NotificationAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

/**
 * Props for all notification components
 */
interface NotificationProps {
  title: string;
  description?: string;
  variant?: NotificationVariant;
  actions?: NotificationAction[];
  icon?: React.ReactNode;
  onDismiss?: () => void;
  children?: React.ReactNode;
}

/**
 * Props specifically for toast notifications
 */
interface ToastNotificationProps extends NotificationProps {
  duration?: number;
}

/**
 * Map of variant to icon components
 */
const variantIcons = {
  success: <CheckCircle className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  destructive: <AlertCircle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
  default: <Info className="h-4 w-4" />,
};

/**
 * Map of variant to CSS classes
 */
const variantClasses = {
  success: 'border-green-600',
  warning: 'border-amber-600',
  destructive: '',  // Uses default destructive styling
  info: 'border-blue-600',
  default: '',      // Uses default styling
};

/**
 * Map of variant to icon CSS classes
 */
const variantIconClasses = {
  success: 'text-green-600',
  warning: 'text-amber-600',
  destructive: '',  // Uses default destructive styling
  info: 'text-blue-600',
  default: '',      // Uses default styling
};

/**
 * SystemAlert component for in-app notifications
 * 
 * Follows the UX pattern guidelines for in-app alerts:
 * - Place alerts close to relevant content
 * - Use appropriate variants for different alert types
 * - Include actions when relevant
 * - Keep messages clear and concise
 */
export function SystemAlert({
  title,
  description,
  variant = 'default',
  actions = [],
  icon,
  onDismiss,
  children
}: NotificationProps) {
  // Use the provided icon or default based on variant
  const alertIcon = icon || variantIcons[variant];
  
  // Combine variant-specific classes
  const alertClass = variant !== 'default' && variant !== 'destructive' ? variantClasses[variant] : '';
  const iconClass = variant !== 'default' && variant !== 'destructive' ? variantIconClasses[variant] : '';
  
  return (
    <Alert variant={variant === 'destructive' ? 'destructive' : 'default'} className={alertClass}>
      {alertIcon && (
        <span className={iconClass}>
          {alertIcon}
        </span>
      )}
      
      <div className="flex-1">
        {title && <AlertTitle>{title}</AlertTitle>}
        
        {description && (
          <AlertDescription>
            {description}
          </AlertDescription>
        )}
        
        {children}
        
        {actions.length > 0 && (
          <div className="flex gap-2 mt-2">
            {actions.map((action, index) => (
              action.href ? (
                <Button 
                  key={index} 
                  variant="outline" 
                  size="sm" 
                  asChild
                >
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              ) : (
                <Button 
                  key={index} 
                  variant="outline" 
                  size="sm" 
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              )
            ))}
          </div>
        )}
      </div>
      
      {onDismiss && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-1 top-1 h-6 w-6" 
          onClick={onDismiss}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Alert>
  );
}

/**
 * Helper hooks for showing different types of toast notifications
 * 
 * These hooks follow the UX pattern guidelines for toast notifications:
 * - Keep messages brief and focused
 * - Use consistent variants for different message types
 * - Include actions when relevant
 * - Auto-dismiss non-critical toasts
 */
export function useSystemNotifications() {
  const { toast } = useToast();
  
  const showToast = ({
    title,
    description,
    variant = 'default',
    actions = [],
    duration = variant === 'destructive' ? 0 : 5000,
  }: ToastNotificationProps) => {
    return toast({
      title,
      description,
      variant: variant === 'destructive' ? 'destructive' : 'default',
      duration,
      action: actions.length > 0 ? (
        <div className="flex gap-2">
          {actions.map((action, index) => (
            action.href ? (
              <Button 
                key={index} 
                variant="outline" 
                size="sm" 
                asChild
              >
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button 
                key={index} 
                variant="outline" 
                size="sm" 
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            )
          ))}
        </div>
      ) : undefined,
    });
  };

  // Convenience methods for different notification types
  const success = (props: Omit<ToastNotificationProps, 'variant'>) => 
    showToast({ ...props, variant: 'success' });
    
  const error = (props: Omit<ToastNotificationProps, 'variant'>) => 
    showToast({ ...props, variant: 'destructive' });
    
  const warning = (props: Omit<ToastNotificationProps, 'variant'>) => 
    showToast({ ...props, variant: 'warning' });
    
  const info = (props: Omit<ToastNotificationProps, 'variant'>) => 
    showToast({ ...props, variant: 'info' });

  return {
    showToast,
    success,
    error,
    warning,
    info,
  };
}

// Export common alerts as pre-configured components
export function SuccessAlert(props: Omit<NotificationProps, 'variant'>) {
  return <SystemAlert {...props} variant="success" />;
}

export function ErrorAlert(props: Omit<NotificationProps, 'variant'>) {
  return <SystemAlert {...props} variant="destructive" />;
}

export function WarningAlert(props: Omit<NotificationProps, 'variant'>) {
  return <SystemAlert {...props} variant="warning" />;
}

export function InfoAlert(props: Omit<NotificationProps, 'variant'>) {
  return <SystemAlert {...props} variant="info" />;
}