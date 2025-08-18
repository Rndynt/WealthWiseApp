import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ArrowUpDown, Filter, Search, ArrowRight, Edit, Trash2, X, Calendar, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Transaction, Account, Category } from '@/types';
import AddTransactionModal from '@/components/modals/add-transaction-modal';
import { format } from 'date-fns';
import { PageContainer, TableContainer } from '@/components/ui/page-container';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const isMobile = useIsMobile();

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
    
    // Filter by date range with proper timezone handling
    if (dateRange && dateRange.from && dateRange.to) {
      const transactionDate = new Date(transaction.date);
      const fromDate = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
      const toDate = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate(), 23, 59, 59, 999);
      const matchesDate = transactionDate >= fromDate && transactionDate <= toDate;
      return matchesSearch && matchesType && matchesDate;
    }
    
    // Apply date filter if dateRange is provided
    if (dateRange && dateRange.from && dateRange.to) {
      const transactionDate = new Date(transaction.date);
      const fromDate = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
      const toDate = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate(), 23, 59, 59);
      const matchesDate = transactionDate >= fromDate && transactionDate <= toDate;
      return matchesSearch && matchesType && matchesDate;
    }
    
    return matchesSearch && matchesType;
  })?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];

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

      <div className="grid gap-3">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => {
            const amount = getAmountDisplay(transaction);
            return (
              <Card key={transaction.id} className="hover:shadow-sm transition-all duration-200 group border-l-4 border-l-blue-500 cursor-pointer">
                <CardContent 
                  className="p-4"
                  onClick={() => setSelectedTransaction(transaction)}
                >
                  <div className="flex items-start gap-3">
                    {/* Category Icon */}
                    <div className="flex-shrink-0 mt-1">
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

                    {/* Transaction Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title and Amount */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate flex-1">
                          {transaction.description}
                        </h3>
                        <p className={`font-semibold text-sm ${amount.color} flex-shrink-0`}>
                          {amount.text}
                        </p>
                      </div>
                      
                      {/* Meta info and Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-xs text-gray-500 flex-1 min-w-0">
                          <span className="truncate">{getAccountName(transaction.accountId)}</span>
                          <span>•</span>
                          <span className="flex-shrink-0">{format(new Date(transaction.date), 'dd MMM')}</span>
                          <span>•</span>
                          <Badge className={`${getTransactionTypeColor(transaction.type)} text-[10px] px-1.5 py-0.5 h-5 ml-1`}>
                            {transaction.type}
                          </Badge>
                        </div>
                        
                        {/* Action Buttons - Always visible on mobile, hover on desktop */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTransaction(transaction);
                            }}
                            className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <Edit className="h-3.5 w-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingTransaction(transaction);
                            }}
                            className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
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

      {/* Transaction Detail Modal */}
      <TransactionDetailModal 
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        accounts={accounts || []}
        categories={categories || []}
        onEdit={(transaction) => {
          setSelectedTransaction(null);
          setEditingTransaction(transaction);
        }}
        onDelete={(transaction) => {
          setSelectedTransaction(null);
          setDeletingTransaction(transaction);
        }}
      />

      {/* Edit Transaction Modal */}
      <EditTransactionModal 
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        workspaceId={workspaceId}
        accounts={accounts || []}
        categories={categories || []}
      />

      {/* Delete Confirmation Modal */}
      <DeleteTransactionModal 
        transaction={deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        workspaceId={workspaceId}
      />
    </PageContainer>
  );
}

// Transaction Detail Modal Component
function TransactionDetailModal({ 
  transaction, 
  onClose, 
  accounts, 
  categories, 
  onEdit, 
  onDelete 
}: {
  transaction: Transaction | null;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  if (!transaction) return null;

  const account = accounts.find(a => a.id === transaction.accountId);
  const toAccount = transaction.toAccountId ? accounts.find(a => a.id === transaction.toAccountId) : null;
  const category = transaction.categoryId ? categories.find(c => c.id === transaction.categoryId) : null;

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income': return '💰';
      case 'expense': return '💸';
      case 'transfer': return '🔄';
      case 'debt': return '🏦';
      case 'repayment': return '✅';
      case 'saving': return '🐷';
      default: return '📝';
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'income': return 'Pemasukan';
      case 'expense': return 'Pengeluaran';
      case 'transfer': return 'Transfer';
      case 'debt': return 'Utang';
      case 'repayment': return 'Pembayaran Utang';
      case 'saving': return 'Tabungan';
      default: return type;
    }
  };

  return (
    <Dialog open={!!transaction} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{getTransactionIcon(transaction.type)}</span>
            Detail Transaksi
          </DialogTitle>
          <DialogDescription>
            Informasi lengkap tentang transaksi ini
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Main Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-1">{transaction.description}</h3>
            <p className={`text-2xl font-bold ${
              transaction.type === 'income' || transaction.type === 'debt' 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {(transaction.type === 'income' || transaction.type === 'debt') ? '+' : '-'}Rp {parseFloat(transaction.amount).toLocaleString('id-ID')}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">
                {getTransactionTypeLabel(transaction.type)}
              </Badge>
              <span className="text-sm text-gray-500">
                {format(new Date(transaction.date), 'dd MMMM yyyy, HH:mm')}
              </span>
            </div>
          </div>

          {/* Account Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Akun</Label>
              <div className="flex items-center gap-2 mt-1">
                <CreditCard className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{account?.name || 'Unknown'}</span>
              </div>
            </div>
            
            {toAccount && (
              <div>
                <Label className="text-sm font-medium text-gray-500">Transfer ke</Label>
                <div className="flex items-center gap-2 mt-1">
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{toAccount.name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Category */}
          {category && (
            <div>
              <Label className="text-sm font-medium text-gray-500">Kategori</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg">{iconMap[category.icon] || category.icon}</span>
                <span className="font-medium">{category.name}</span>
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>ID Transaksi</span>
              <span className="font-mono">#{transaction.id}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500 mt-1">
              <span>Dibuat</span>
              <span>{format(new Date(transaction.createdAt), 'dd MMM yyyy, HH:mm')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onEdit(transaction)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={() => onDelete(transaction)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Edit Transaction Modal Component
function EditTransactionModal({ 
  transaction, 
  onClose, 
  workspaceId, 
  accounts, 
  categories 
}: {
  transaction: Transaction | null;
  onClose: () => void;
  workspaceId: number;
  accounts: Account[];
  categories: Category[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    type: '',
    amount: '',
    description: '',
    date: new Date(),
    accountId: '',
    categoryId: '',
    toAccountId: '',
    debtId: ''
  });

  // Update form when transaction changes
  useEffect(() => {
    if (transaction) {
      setForm({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        date: new Date(transaction.date),
        accountId: transaction.accountId.toString(),
        categoryId: transaction.categoryId?.toString() || '',
        toAccountId: transaction.toAccountId?.toString() || '',
        debtId: transaction.debtId?.toString() || ''
      });
    }
  }, [transaction]);

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/transactions/${transaction!.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update transaction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/transactions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/accounts`] });
      toast({
        title: "Transaksi berhasil diupdate",
        description: "Perubahan telah disimpan",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Gagal mengupdate transaksi",
        description: error.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateMutation.mutate({
      type: form.type,
      amount: parseFloat(form.amount),
      description: form.description,
      date: form.date,
      accountId: parseInt(form.accountId),
      categoryId: form.categoryId ? parseInt(form.categoryId) : null,
      toAccountId: form.toAccountId ? parseInt(form.toAccountId) : null,
      debtId: form.debtId ? parseInt(form.debtId) : null,
    });
  };

  if (!transaction) return null;

  return (
    <Dialog open={!!transaction} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Transaksi</DialogTitle>
          <DialogDescription>
            Ubah detail transaksi
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Jenis Transaksi</Label>
            <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Pemasukan</SelectItem>
                <SelectItem value="expense">Pengeluaran</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="saving">Tabungan</SelectItem>
                <SelectItem value="debt">Utang</SelectItem>
                <SelectItem value="repayment">Pembayaran Utang</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Jumlah</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <Label>Deskripsi</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Deskripsi transaksi"
              required
            />
          </div>

          <div>
            <Label>Akun</Label>
            <Select value={form.accountId} onValueChange={(value) => setForm({ ...form, accountId: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.type !== 'transfer' && (
            <div>
              <Label>Kategori</Label>
              <Select value={form.categoryId} onValueChange={(value) => setForm({ ...form, categoryId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {iconMap[category.icon] || category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.type === 'transfer' && (
            <div>
              <Label>Transfer ke Akun</Label>
              <Select value={form.toAccountId} onValueChange={(value) => setForm({ ...form, toAccountId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(acc => acc.id.toString() !== form.accountId).map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Batal
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Delete Transaction Modal Component
function DeleteTransactionModal({ 
  transaction, 
  onClose, 
  workspaceId 
}: {
  transaction: Transaction | null;
  onClose: () => void;
  workspaceId: number;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`/api/transactions/${transaction!.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Delete error response:', errorData);
        throw new Error(`Failed to delete transaction: ${response.status} ${response.statusText}`);
      }
      
      // Check if response has content before parsing JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/transactions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/accounts`] });
      toast({
        title: "Transaksi berhasil dihapus",
        description: "Transaksi telah dihapus dari sistem",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Gagal menghapus transaksi",
        description: error.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  });

  if (!transaction) return null;

  return (
    <Dialog open={!!transaction} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Hapus Transaksi
          </DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium">{transaction.description}</h4>
          <p className="text-lg font-semibold text-red-600">
            Rp {parseFloat(transaction.amount).toLocaleString('id-ID')}
          </p>
          <p className="text-sm text-gray-500">
            {format(new Date(transaction.date), 'dd MMMM yyyy')}
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Menghapus transaksi akan mempengaruhi saldo akun dan laporan keuangan Anda.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex-1"
          >
            {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}