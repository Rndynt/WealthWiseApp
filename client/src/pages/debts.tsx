import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

interface DebtsProps {
  workspaceId: number | undefined;
}

export default function Debts({ workspaceId }: DebtsProps) {
  if (!workspaceId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please select a workspace to view debts</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Debt Management</h3>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-16">
            <CreditCard size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Debt tracking interface will be implemented here</p>
            <p className="text-sm text-gray-500 mt-2">
              This will include debt/credit tracking, payment schedules, and status management
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
