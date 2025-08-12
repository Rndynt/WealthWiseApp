import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePermissions, PERMISSIONS } from '@/lib/permissions.tsx';
import { apiRequest } from '@/lib/queryClient';
import { Users, UserPlus, Mail, Shield, Trash2, Crown, Settings } from 'lucide-react';

interface WorkspaceMember {
  id: number;
  userId: number;
  workspaceId: number;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface InviteFormData {
  email: string;
  role: 'editor' | 'viewer';
}

interface CollaborationProps {
  workspaceId: number | undefined;
}

export default function CollaborationPage({ workspaceId }: CollaborationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormData>({
    email: '',
    role: 'viewer'
  });

  // Check if user has collaboration permissions
  const canManageCollaboration = hasPermission(PERMISSIONS.COLLABORATION_MANAGE);
  const canViewCollaboration = hasPermission(PERMISSIONS.COLLABORATION_VIEW);

  const { data: members, isLoading } = useQuery<WorkspaceMember[]>({
    queryKey: [`/api/workspaces/${workspaceId}/members`],
    enabled: !!workspaceId && canViewCollaboration,
  });

  const { data: userSubscription } = useQuery({
    queryKey: ['/api/user/subscription'],
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      return apiRequest('POST', `/api/workspaces/${workspaceId}/invite`, data);
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: "The invitation has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/members`] });
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'viewer' });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Invitation Failed",
        description: error.message || "Failed to send invitation.",
      });
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: number; role: string }) => {
      return apiRequest('PUT', `/api/workspaces/${workspaceId}/members/${memberId}`, { role });
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "Member role has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/members`] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update member role.",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return apiRequest('DELETE', `/api/workspaces/${workspaceId}/members/${memberId}`);
    },
    onSuccess: () => {
      toast({
        title: "Member Removed",
        description: "Member has been removed from the workspace.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/members`] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Removal Failed",
        description: error.message || "Failed to remove member.",
      });
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMemberMutation.mutate(inviteForm);
  };

  const handleRoleChange = (memberId: number, newRole: string) => {
    updateMemberRoleMutation.mutate({ memberId, role: newRole });
  };

  const handleRemoveMember = (memberId: number) => {
    if (confirm('Are you sure you want to remove this member from the workspace?')) {
      removeMemberMutation.mutate(memberId);
    }
  };

  // Check if workspace sharing is available for user's subscription
  const isBasicUser = userSubscription?.package?.name === 'basic';
  const canCreateSharedWorkspace = userSubscription?.package?.canCreateSharedWorkspace;

  if (!workspaceId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please select a workspace to manage collaboration</p>
      </div>
    );
  }

  if (!canViewCollaboration) {
    return (
      <div className="text-center py-8">
        <Shield size={48} className="mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">You don't have permission to view collaboration features</p>
      </div>
    );
  }

  if (isBasicUser && !canCreateSharedWorkspace) {
    return (
      <div className="text-center py-8 max-w-md mx-auto">
        <Users size={48} className="mx-auto mb-4 text-gray-400" />
        <h2 className="text-xl font-semibold mb-2">Collaboration Not Available</h2>
        <p className="text-gray-600 mb-4">
          Workspace collaboration is available for Premium users only. 
          Upgrade your subscription to invite team members and collaborate on your finances.
        </p>
        <Button className="mt-4">
          Upgrade to Premium
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Collaboration</h1>
          <p className="text-gray-600 mt-2">Manage workspace members and permissions</p>
        </div>
        
        {canManageCollaboration && (
          <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
            <DialogTrigger asChild>
              <Button data-testid="button-invite-member">
                <UserPlus size={16} className="mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <Input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="Enter member's email"
                    required
                    data-testid="input-invite-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <Select 
                    value={inviteForm.role} 
                    onValueChange={(value: 'editor' | 'viewer') => setInviteForm({ ...inviteForm, role: value })}
                  >
                    <SelectTrigger data-testid="select-invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer - Can view data only</SelectItem>
                      <SelectItem value="editor">Editor - Can view and edit data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowInviteModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={inviteMemberMutation.isPending}
                    data-testid="button-send-invite"
                  >
                    {inviteMemberMutation.isPending ? 'Sending...' : 'Send Invite'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            Workspace Members ({members?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members && members.length > 0 ? (
            <div className="space-y-4">
              {members.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`member-item-${member.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {member.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.user.name}</p>
                        {member.role === 'owner' && (
                          <Crown size={16} className="text-yellow-500" title="Owner" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Mail size={12} />
                        {member.user.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {member.role === 'owner' ? (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Owner
                      </Badge>
                    ) : canManageCollaboration ? (
                      <Select 
                        value={member.role} 
                        onValueChange={(role) => handleRoleChange(member.id, role)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={member.role === 'editor' ? 'default' : 'secondary'}>
                        {member.role}
                      </Badge>
                    )}
                    
                    {canManageCollaboration && member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-remove-member-${member.id}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users size={48} className="mx-auto mb-4 text-gray-400" />
              <p>No members yet</p>
              <p className="text-sm">Invite team members to start collaborating</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={20} />
            Permission Levels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={20} className="text-yellow-500" />
                <h4 className="font-semibold">Owner</h4>
              </div>
              <p className="text-sm text-gray-600">
                Full access to all workspace features, can manage members and delete workspace
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Settings size={20} className="text-blue-500" />
                <h4 className="font-semibold">Editor</h4>
              </div>
              <p className="text-sm text-gray-600">
                Can view and edit all financial data, create transactions, and manage budgets
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users size={20} className="text-gray-500" />
                <h4 className="font-semibold">Viewer</h4>
              </div>
              <p className="text-sm text-gray-600">
                Can only view financial data and reports, no editing permissions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}