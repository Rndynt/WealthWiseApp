import { toast } from '@/hooks/use-toast';

export type NotificationLevel = 'info' | 'warning' | 'error' | 'success';
export type NotificationType = 
  | 'debt-due-reminder'
  | 'budget-overspend'
  | 'financial-health'
  | 'unusual-transaction'
  | 'transaction-added'
  | 'budget-created'
  | 'debt-created'
  | 'payment-reminder'
  | 'goal-achieved';

export interface Notification {
  id: string;
  type: NotificationType;
  level: NotificationLevel;
  title: string;
  description: string;
  actionUrl?: string;
  actionLabel?: string;
  data?: any;
  createdAt: Date;
  read: boolean;
}

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];

  // Core notification methods
  private addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      read: false,
    };

    this.notifications.unshift(newNotification);
    this.notifyListeners();

    // Show toast notification
    this.showToast(newNotification);

    return newNotification;
  }

  private showToast(notification: Notification) {
    const config: any = {
      title: notification.title,
      description: notification.description,
    };

    // Set variant based on level
    if (notification.level === 'error') {
      config.variant = 'destructive';
    }

    toast(config);
  }

  // Public API methods
  info(title: string, description: string, type: NotificationType = 'transaction-added', options?: Partial<Notification>) {
    return this.addNotification({
      type,
      level: 'info',
      title,
      description,
      ...options,
    });
  }

  success(title: string, description: string, type: NotificationType = 'goal-achieved', options?: Partial<Notification>) {
    return this.addNotification({
      type,
      level: 'success',
      title,
      description,
      ...options,
    });
  }

  warning(title: string, description: string, type: NotificationType = 'budget-overspend', options?: Partial<Notification>) {
    return this.addNotification({
      type,
      level: 'warning',
      title,
      description,
      ...options,
    });
  }

  error(title: string, description: string, type: NotificationType = 'unusual-transaction', options?: Partial<Notification>) {
    return this.addNotification({
      type,
      level: 'error',
      title,
      description,
      ...options,
    });
  }

  // Specific notification methods
  debtDueReminder(debtName: string, daysLeft: number, amount: number) {
    const urgencyLevel: NotificationLevel = daysLeft <= 1 ? 'error' : daysLeft <= 3 ? 'warning' : 'info';
    
    return this.addNotification({
      type: 'debt-due-reminder',
      level: urgencyLevel,
      title: '💳 Debt Payment Reminder',
      description: `${debtName} payment of Rp ${amount.toLocaleString('id-ID')} is due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
      actionUrl: '/debts',
      actionLabel: 'View Debts',
      data: { debtName, daysLeft, amount },
    });
  }

  budgetOverspendAlert(categoryName: string, percentage: number, budgetAmount: number, spentAmount: number) {
    const level: NotificationLevel = percentage >= 100 ? 'error' : percentage >= 90 ? 'warning' : 'info';
    
    return this.addNotification({
      type: 'budget-overspend',
      level,
      title: `📊 Budget Alert - ${categoryName}`,
      description: `You've spent ${percentage.toFixed(0)}% of your budget (Rp ${spentAmount.toLocaleString('id-ID')} of Rp ${budgetAmount.toLocaleString('id-ID')})`,
      actionUrl: '/budget',
      actionLabel: 'View Budget',
      data: { categoryName, percentage, budgetAmount, spentAmount },
    });
  }

  financialHealthReport(score: number, insights: string[]) {
    const level: NotificationLevel = score >= 80 ? 'success' : score >= 60 ? 'info' : 'warning';
    
    return this.addNotification({
      type: 'financial-health',
      level,
      title: `📈 Monthly Financial Health Report`,
      description: `Your financial health score is ${score}/100. ${insights[0] || 'Keep up the good work!'}`,
      actionUrl: '/reports',
      actionLabel: 'View Report',
      data: { score, insights },
    });
  }

  unusualTransactionAlert(amount: number, category: string, reason: string) {
    return this.addNotification({
      type: 'unusual-transaction',
      level: 'warning',
      title: '🚨 Unusual Transaction Detected',
      description: `Large ${category} expense of Rp ${amount.toLocaleString('id-ID')} detected. ${reason}`,
      actionUrl: '/transactions',
      actionLabel: 'Review Transactions',
      data: { amount, category, reason },
    });
  }

  // Notification management
  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
  }

  removeNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.notifyListeners();
  }

  clearAll() {
    this.notifications = [];
    this.notifyListeners();
  }

  // Subscription management
  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  // Getters
  getAll(): Notification[] {
    return [...this.notifications];
  }

  getUnread(): Notification[] {
    return this.notifications.filter(n => !n.read);
  }

  getByType(type: NotificationType): Notification[] {
    return this.notifications.filter(n => n.type === type);
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;