import { useState, useEffect } from 'react';
import { notificationService, type Notification } from '@/lib/notification-service';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Initialize with current notifications
    setNotifications(notificationService.getAll());

    // Subscribe to changes
    const unsubscribe = notificationService.subscribe(setNotifications);

    return unsubscribe;
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead: (id: string) => notificationService.markAsRead(id),
    markAllAsRead: () => notificationService.markAllAsRead(),
    removeNotification: (id: string) => notificationService.removeNotification(id),
    clearAll: () => notificationService.clearAll(),
  };
}

// Hook for specific notification types
export function useNotificationsByType(type: string) {
  const { notifications } = useNotifications();
  return notifications.filter(n => n.type === type);
}