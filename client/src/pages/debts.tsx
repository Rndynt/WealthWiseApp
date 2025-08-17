import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, CreditCard, AlertTriangle, CheckCircle, Clock, Edit, Trash2, Calendar, ChevronDown, ChevronUp, ArrowDownLeft } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Debt } from '@/types';
import AddDebtModal from '@/components/modals/add-debt-modal';
import { format } from 'date-fns';

interface DebtsProps {
  workspaceId: number | undefined;
}

export default function Debts({ workspaceId }: DebtsProps) {
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const toggleCard = (debtId: number) => {
    const newExpandedCards = new Set(expandedCards);
    if (expandedCards.has(debtId)) {
      newExpandedCards.delete(debtId);
    } else {
      newExpandedCards.add(debtId);
    }
    setExpandedCards(newExpandedCards);
  };

  // Query to get repayment transactions for expanded cards
  const { data: allRepayments } = useQuery<Record<number, any[]>>({
    queryKey: [`/api/debts/repayments`, Array.from(expandedCards)],
    queryFn: async () => {
      if (expandedCards.size === 0) return {};
      const token = localStorage.getItem('token');
      const repaymentPromises = Array.from(expandedCards).map(async (debtId) => {
        const response = await fetch(`/api/debts/${debtId}/repayments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          console.error(`Failed to fetch repayments for debt ${debtId}:`, response.status, response.statusText);
          return [debtId, []]; // Return empty array on error
        }
        const data = await response.json();
        return [debtId, data];
      });
      const results = await Promise.all(repaymentPromises);
      return Object.fromEntries(results);
    },
    enabled: expandedCards.size > 0,
  });

  if (!workspaceId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please select a workspace to view debts</p>
      </div>
    );
  }

  const { data: debts, isLoading } = useQuery<Debt[]>({
    queryKey: [`/api/workspaces/${workspaceId}/debts`],
    enabled: !!workspaceId,
  });

  const getStatusConfig = (status: string) => {
    const configs = {
      'active': { 
        color: 'text-blue-600', 
        bg: 'bg-blue-100', 
        icon: Clock,
        label: 'Active'
      },
      'paid': { 
        color: 'text-green-600', 
        bg: 'bg-green-100', 
        icon: CheckCircle,
        label: 'Paid'
      },
      'overdue': { 
        color: 'text-red-600', 
        bg: 'bg-red-100', 
        icon: AlertTriangle,
        label: 'Overdue'
      },
    };
    return configs[status as keyof typeof configs] || configs.active;
  };

  const getTypeDisplay = (type: string) => {
    return type === 'debt' 
      ? { label: 'Debt', color: 'text-red-600' }
      : { label: 'Credit', color: 'text-green-600' };
  };

  const calculateProgress = (debt: Debt) => {
    const total = parseFloat(debt.totalAmount);
    const remaining = parseFloat(debt.remainingAmount);
    const paid = total - remaining;
    return (paid / total) * 100;
  };

  const getTotalDebt = () => {
    if (!debts) return 0;
    return debts
      .filter(debt => debt.type === 'debt' && debt.status !== 'paid')
      .reduce((sum, debt) => sum + parseFloat(debt.remainingAmount), 0);
  };

  const getTotalCredit = () => {
    if (!debts) return 0;
    return debts
      .filter(debt => debt.type === 'credit' && debt.status !== 'paid')
      .reduce((sum, debt) => sum + parseFloat(debt.remainingAmount), 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Debt Management</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalDebt = getTotalDebt();
  const totalCredit = getTotalCredit();

  return (
    <div className="space-y-6">

      <div className="mb-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                Debt Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                Manage your debts and credits
              </p>
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto">
              <Button onClick={() => setShowDebtModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Debt Record
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/*}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Debt Management</h1>
        <Button onClick={() => setShowDebtModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Debt Record
        </Button>
      </div>
      */}

      {/* Summary Cards */}
      {debts && debts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                  <CreditCard className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Debt</p>
                  <p className="text-2xl font-bold text-red-600">
                    Rp {totalDebt.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Credit</p>
                  <p className="text-2xl font-bold text-green-600">
                    Rp {totalCredit.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Position</p>
                  <p className={`text-2xl font-bold ${totalCredit >= totalDebt ? 'text-green-600' : 'text-red-600'}`}>
                    Rp {Math.abs(totalCredit - totalDebt).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {debts && debts.length > 0 ? (
        <div className="grid gap-4">
          {debts.map((debt) => {
            const statusConfig = getStatusConfig(debt.status);
            const typeDisplay = getTypeDisplay(debt.type);
            const StatusIcon = statusConfig.icon;
            const progress = calculateProgress(debt);
            const remaining = parseFloat(debt.remainingAmount);
            const total = parseFloat(debt.totalAmount);
            const paid = total - remaining;

            const isExpanded = expandedCards.has(debt.id);
            const repayments = allRepayments?.[debt.id] || [];

            return (
              <Collapsible key={debt.id} open={isExpanded} onOpenChange={() => toggleCard(debt.id)}>
                <Card className="hover:shadow-md transition-shadow">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {debt.name}
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`${typeDisplay.color} bg-gray-100`}>
                              {typeDisplay.label}
                            </Badge>
                            <Badge className={`${statusConfig.bg} ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Amount</p>
                        <p className="font-semibold">Rp {total.toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Remaining</p>
                        <p className={`font-semibold ${typeDisplay.color}`}>
                          Rp {remaining.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    {debt.status !== 'paid' && (
                      <>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {progress.toFixed(1)}% {debt.type === 'debt' ? 'paid' : 'collected'}
                          </span>
                          <span className="text-green-600">
                            Rp {paid.toLocaleString('id-ID')} {debt.type === 'debt' ? 'paid' : 'collected'}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between items-center text-sm text-gray-600">
                      {debt.interestRate && (
                        <span>Interest: {debt.interestRate}%</span>
                      )}
                      {debt.dueDate && (
                        <span>Due: {format(new Date(debt.dueDate), 'dd MMM yyyy')}</span>
                      )}
                    </div>
                  </div>
                </CardContent>

                <CollapsibleContent>
                  <div className="border-t bg-gray-50 dark:bg-gray-800/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowDownLeft className="h-4 w-4 text-blue-600" />
                      <h4 className="font-medium text-gray-900 dark:text-white">Repayment History</h4>
                    </div>
                    {repayments.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {repayments.map((repayment: any) => (
                          <div key={repayment.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-700 rounded-lg border">
                            <div>
                              <p className="font-medium text-sm">{repayment.description}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{format(new Date(repayment.date), 'dd MMM yyyy')}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">-Rp {parseFloat(repayment.amount).toLocaleString('id-ID')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">No repayment history yet</p>
                        <p className="text-xs mt-1">Repayments will appear here when you make payments</p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No debts or credits</h3>
            <p className="text-gray-600 mb-4">
              Track your debts and credits to manage your financial obligations and receivables.
            </p>
            <Button onClick={() => setShowDebtModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Record
            </Button>
          </CardContent>
        </Card>
      )}

      <AddDebtModal 
        open={showDebtModal} 
        onOpenChange={setShowDebtModal}
        workspaceId={workspaceId}
      />
    </div>
  );
}
