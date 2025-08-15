import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, ArrowUpDown, Filter, Search, ArrowRight, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Transaction, Account, Category } from '@/types';
import AddTransactionModal from '@/components/modals/add-transaction-modal';
import { format } from 'date-fns';
import { PageContainer, TableContainer } from '@/components/ui/page-container';

interface TransactionsProps {
  workspaceId: number | undefined;
  dateRange?: { from: Date; to: Date } | null;
}

const iconMap: Record<string, string> = {
  'briefcase': '💼',
  'shopping-cart': '🛒',
  'bolt': '⚡',
  'bus': '🚌',
  'tv': '📺',
  'home': '🏠',
  'car': '🚗',
  'heart': '❤️',
  'gamepad': '🎮',
  'coffee': '☕',
  'utensils': '🍽️',
  'shirt': '👕',
  'plane': '✈️',
  'graduation-cap': '🎓',
  'stethoscope': '🩺',
  'gift': '🎁',
  'phone': '📱',
  'wifi': '📶',
  'credit-card': '💳',
  'banknote': '💸',
  'piggy-bank': '🐷',
};

export default function Transactions({ workspaceId, dateRange }: TransactionsProps) {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  if (!workspaceId) {
    return (
      <PageContainer>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Please select a workspace to view transactions</p>
        </div>
      </PageContainer>
    );
  }

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: [`/api/workspaces/${workspaceId}/transactions`, dateRange],
    enabled: !!workspaceId,
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: [`/api/workspaces/${workspaceId}/accounts`],
    enabled: !!workspaceId,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: [`/api/workspaces/${workspaceId}/categories`],
    enabled: !!workspaceId,
  });

  const getAccountName = (accountId: number) => {
    return accounts?.find(acc => acc.id === accountId)?.name || 'Unknown Account';
  };
  const getCategoryName = (categoryId: number) => {
    const category = categories?.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getCategoryIcon = (categoryId: number) => {
    const category = categories?.find(cat => cat.id === categoryId);
    if (!category) return '📄';
    return iconMap[category.icon] || category.icon;
  };

  const getTransactionTypeColor = (type: string) => {
    const colors = {
      'income': 'bg-green-100 text-green-800',
      'expense': 'bg-red-100 text-red-800',
      'transfer': 'bg-blue-100 text-blue-800',
      'saving': 'bg-purple-100 text-purple-800',
      'debt': 'bg-orange-100 text-orange-800',
      'repayment': 'bg-cyan-100 text-cyan-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getAmountDisplay = (transaction: Transaction) => {
    const amount = parseFloat(transaction.amount);
    const formatted = `Rp ${amount.toLocaleString('id-ID')}`;

    if (transaction.type === 'income') {
      return { text: `+${formatted}`, color: 'text-green-600' };
    } else if (transaction.type === 'expense') {
      return { text: `-${formatted}`, color: 'text-red-600' };
    } else {
      return { text: formatted, color: 'text-blue-600' };
    }
  };

  const filteredTransactions = transactions?.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || transaction.type === filterType;
    
    // Apply date filter if dateRange is provided
    if (dateRange && dateRange.from && dateRange.to) {
      const transactionDate = new Date(transaction.date);
      const fromDate = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
      const toDate = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate(), 23, 59, 59);
      const matchesDate = transactionDate >= fromDate && transactionDate <= toDate;
      return matchesSearch && matchesType && matchesDate;
    }
    
    return matchesSearch && matchesType;
  }) || [];

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center sm:justify-end mb-6">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-full sm:w-48 animate-pulse"></div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Add Transaction button - centered on mobile, right-aligned on desktop */}
      <div className="flex justify-center sm:justify-end mb-6">
        <Button 
          onClick={() => setShowTransactionModal(true)}
          size="lg"
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search transactions..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="saving">Saving</SelectItem>
            <SelectItem value="debt">Debt</SelectItem>
            <SelectItem value="repayment">Repayment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => {
            const amount = getAmountDisplay(transaction);
            return (
              <Card key={transaction.id} className="hover:shadow-sm transition-all duration-200 group">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Category Icon - Smaller */}
                    <div className="flex-shrink-0">
                      {transaction.categoryId ? (
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm">
                          {(() => {
                            const category = categories?.find(cat => cat.id === transaction.categoryId);
                            return category ? (iconMap[category.icon] || category.icon) : '📝';
                          })()}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <ArrowUpDown className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* Transaction Details - Compact */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                              {transaction.description}
                            </h3>
                            <Badge className={`${getTransactionTypeColor(transaction.type)} text-[10px] px-1.5 py-0.5`}>
                              {transaction.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {getAccountName(transaction.accountId)}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(transaction.date), 'dd MMM yyyy')}
                            </span>
                          </div>
                        </div>
                        
                        {/* Amount - Compact */}
                        <div className="text-right">
                          <p className={`font-semibold text-sm ${amount.color}`}>
                            {amount.text}
                          </p>
                        </div>
                      </div>
                    
                    {/* Action Buttons - Compact */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowUpDown className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm || filterType !== 'all' ? 'No matching transactions' : 'No transactions yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto text-sm sm:text-base">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filter criteria to find the transactions you\'re looking for.'
                  : 'Start tracking your financial activity by adding your first transaction. It only takes a few seconds!'
                }
              </p>
              <Button onClick={() => setShowTransactionModal(true)} size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-5 w-5" />
                Add Your First Transaction
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AddTransactionModal 
        open={showTransactionModal} 
        onOpenChange={setShowTransactionModal}
        workspaceId={workspaceId}
      />
    </PageContainer>
  );
}