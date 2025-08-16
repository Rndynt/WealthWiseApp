import { useState } from 'react';
import { Bell, Check, X, Filter, Search, Archive, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useNotifications } from '@/hooks/use-notifications';
import { format, isToday, isYesterday, subDays } from 'date-fns';
import { Link } from 'wouter';
import { PageContainer } from '@/components/ui/page-container';

const levelColors = {
  info: 'bg-blue-100 border-blue-300 text-blue-800',
  success: 'bg-green-100 border-green-300 text-green-800',
  warning: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  error: 'bg-red-100 border-red-300 text-red-800',
};

const levelIcons = {
  info: '💡',
  success: '✅',
  warning: '⚠️',
  error: '🚨',
};

const typeLabels = {
  'debt-due-reminder': 'Debt Reminder',
  'budget-overspend': 'Budget Alert',
  'financial-health': 'Health Report',
  'unusual-transaction': 'Transaction Alert',
  'transaction-added': 'Transaction',
  'budget-created': 'Budget',
  'debt-created': 'Debt',
  'payment-reminder': 'Payment',
  'goal-achieved': 'Achievement',
};

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === 'all' || notification.level === levelFilter;
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    
    return matchesSearch && matchesLevel && matchesType;
  });

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    let dateKey;
    const notificationDate = new Date(notification.createdAt);
    
    if (isToday(notificationDate)) {
      dateKey = 'Today';
    } else if (isYesterday(notificationDate)) {
      dateKey = 'Yesterday';
    } else if (notificationDate > subDays(new Date(), 7)) {
      dateKey = 'This Week';
    } else {
      dateKey = 'Older';
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(notification);
    return groups;
  }, {} as Record<string, typeof notifications>);

  const handleSelectNotification = (notificationId: string) => {
    const newSelected = new Set(selectedNotifications);
    if (selectedNotifications.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleBulkAction = (action: 'read' | 'delete') => {
    selectedNotifications.forEach(id => {
      if (action === 'read') {
        markAsRead(id);
      } else {
        removeNotification(id);
      }
    });
    setSelectedNotifications(new Set());
  };

  const formatDate = (date: Date) => {
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Notifications
            </h1>
            <p className="text-gray-600 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <Check className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={clearAll}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="debt-due-reminder">Debt Reminders</SelectItem>
                  <SelectItem value="budget-overspend">Budget Alerts</SelectItem>
                  <SelectItem value="financial-health">Health Reports</SelectItem>
                  <SelectItem value="unusual-transaction">Transaction Alerts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedNotifications.size > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">
                  {selectedNotifications.size} notification{selectedNotifications.size > 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('read')}>
                    <Check className="h-4 w-4 mr-1" />
                    Mark as read
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('delete')}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {notifications.length === 0 ? 'No notifications' : 'No matching notifications'}
              </h3>
              <p className="text-gray-600">
                {notifications.length === 0 
                  ? 'You\'ll see notifications about debts, budgets, and financial insights here.'
                  : 'Try adjusting your filters to see more notifications.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Select All Checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedNotifications.size === filteredNotifications.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-gray-600">Select all</span>
            </div>

            {/* Grouped Notifications */}
            {Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => (
              <div key={dateGroup}>
                <h3 className="text-sm font-medium text-gray-500 mb-3">{dateGroup}</h3>
                <div className="space-y-2">
                  {groupNotifications.map((notification) => (
                    <Card 
                      key={notification.id}
                      className={`transition-colors hover:bg-gray-50 ${
                        !notification.read ? 'bg-blue-50/30 border-blue-200' : ''
                      } ${selectedNotifications.has(notification.id) ? 'ring-2 ring-blue-500' : ''}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedNotifications.has(notification.id)}
                            onCheckedChange={() => handleSelectNotification(notification.id)}
                          />

                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border-2 flex-shrink-0 ${levelColors[notification.level]}`}>
                            {levelIcons[notification.level]}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-gray-900">
                                    {notification.title}
                                  </h4>
                                  {!notification.read && (
                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs mb-2">
                                  {typeLabels[notification.type] || notification.type}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-xs text-gray-500">
                                  {formatDate(notification.createdAt)}
                                </span>
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => markAsRead(notification.id)}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                                  onClick={() => removeNotification(notification.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              {notification.description}
                            </p>
                            
                            {notification.actionUrl && (
                              <Link href={notification.actionUrl}>
                                <Button
                                  variant="ghost" 
                                  size="sm"
                                  className="h-7 px-3 text-blue-600"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  {notification.actionLabel || 'View'}
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}