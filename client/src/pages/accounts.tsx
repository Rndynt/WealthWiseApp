import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { University, Plus, MoreVertical, Edit, Trash2, CreditCard } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Account, Transaction } from '@/types';
import AddAccountModal from '@/components/modals/add-account-modal';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';


interface AccountsProps {
  workspaceId: number | undefined;
}

export default function Accounts({ workspaceId }: AccountsProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showModal, setShowModal] = useState(false); // Assuming showModal is for the Dialog

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: [`/api/workspaces/${workspaceId}/accounts`],
    enabled: !!workspaceId,
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: [`/api/workspaces/${workspaceId}/transactions`],
    enabled: !!workspaceId,
  });

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  if (!workspaceId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please select a workspace to view accounts</p>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
      <div className="mb-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                Accounts
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                Kelola akun dan rekening keuangan Anda
              </p>
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto">
              <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
                <Plus className="mr-2" size={16} />
                Add Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          accounts?.map((account) => (
            <Card key={account.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <University className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{account.name}</h4>
                      <p className="text-sm text-gray-600 capitalize">{account.type} Account</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Edit size={16} className="mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 size={16} className="mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Balance</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(account.balance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Currency</span>
                    <span className="text-sm text-gray-900">{account.currency}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Type</span>
                    <span className="text-sm text-gray-900 capitalize">{account.type}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Add Account Card */}
        <Card
          className="border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer transition-colors"
          onClick={() => setShowAddModal(true)}
        >
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-gray-500 py-8">
              <Plus size={32} className="mb-3" />
              <p className="font-medium">Add New Account</p>
              <p className="text-sm">Start tracking a new account</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Account Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions?.slice(0, 10).map((transaction) => {
                  const account = accounts?.find(a => a.id === transaction.accountId);
                  return (
                    <tr key={transaction.id}>
                      <td>{new Date(transaction.date).toLocaleDateString()}</td>
                      <td>{account?.name || 'Unknown'}</td>
                      <td>{transaction.description}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          transaction.type === 'income'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className={`text-right font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {(!transactions || transactions.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <p>No transactions yet</p>
                <p className="text-sm">Transactions will appear here once you start adding them</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddAccountModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        workspaceId={workspaceId!}
      />
      </div>
    </PageContainer>
  );
}