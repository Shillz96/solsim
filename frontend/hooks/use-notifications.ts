import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './use-auth';

export interface Notification {
  id: string;
  type: 'trade' | 'portfolio' | 'price' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  userId?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

// Mock notification data for demo - this would come from your backend
const generateMockNotifications = (userId?: string): Notification[] => [
  {
    id: '1',
    type: 'trade',
    title: 'Trade Executed',
    message: 'Successfully bought 100 SOL/USDC',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    read: false,
    userId,
  },
  {
    id: '2',
    type: 'portfolio',
    title: 'Portfolio Update',
    message: 'Your portfolio value increased by 2.5%',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    read: false,
    userId,
  },
  {
    id: '3',
    type: 'price',
    title: 'Price Alert',
    message: 'SOL price reached your target of $150',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: true,
    userId,
  },
];

export function useNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
  });

  useEffect(() => {
    // In a real app, you'd fetch from your backend API
    // For now, using mock data
    if (user?.id) {
      const mockNotifications = generateMockNotifications(user.id);
      setState({
        notifications: mockNotifications,
        unreadCount: mockNotifications.filter(n => !n.read).length,
      });
    }
  }, [user?.id]);

  const markAsRead = useCallback((notificationId: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
  }, []);

  const markAllAsRead = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    setState(prev => ({
      notifications: [newNotification, ...prev.notifications.slice(0, 49)], // Keep max 50
      unreadCount: prev.unreadCount + (newNotification.read ? 0 : 1),
    }));
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setState(prev => {
      const notification = prev.notifications.find(n => n.id === notificationId);
      return {
        notifications: prev.notifications.filter(n => n.id !== notificationId),
        unreadCount: notification && !notification.read 
          ? Math.max(0, prev.unreadCount - 1) 
          : prev.unreadCount,
      };
    });
  }, []);

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
  };
}