import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

interface BudgetProps {
  workspaceId: number | undefined;
}

export default function Budget({ workspaceId }: BudgetProps) {
  if (!workspaceId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please select a workspace to view budget</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Budget Planning</h3>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-16">
            <Calculator size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Budget planning interface will be implemented here</p>
            <p className="text-sm text-gray-500 mt-2">
              This will include monthly/yearly budget setting, tracking, and progress monitoring
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
