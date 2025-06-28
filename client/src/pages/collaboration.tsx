import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface CollaborationProps {
  workspaceId: number | undefined;
}

export default function Collaboration({ workspaceId }: CollaborationProps) {
  if (!workspaceId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please select a workspace to view collaboration</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Workspace Collaboration</h3>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-16">
            <Users size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Collaboration management interface will be implemented here</p>
            <p className="text-sm text-gray-500 mt-2">
              This will include member management, role assignments, and permission controls
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
