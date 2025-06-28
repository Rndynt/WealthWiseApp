import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftRight } from 'lucide-react';

interface TransactionsProps {
  workspaceId: number | undefined;
}

export default function Transactions({ workspaceId }: TransactionsProps) {
  if (!workspaceId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please select a workspace to view transactions</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-16">
            <ArrowLeftRight size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Transaction management interface will be implemented here</p>
            <p className="text-sm text-gray-500 mt-2">
              This will include transaction recording, editing, filtering, and categorization
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
