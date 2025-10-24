import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface CollaborationInviteFormProps {
  workspaceId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type InviteRole = 'editor' | 'viewer';

interface InviteFormState {
  email: string;
  role: InviteRole;
}

export function CollaborationInviteForm({ workspaceId, onSuccess, onCancel }: CollaborationInviteFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<InviteFormState>({ email: '', role: 'viewer' });
  const [apiError, setApiError] = useState<string | null>(null);

  const inviteMemberMutation = useMutation({
    mutationFn: async (data: InviteFormState) => {
      return apiRequest('POST', `/api/workspaces/${workspaceId}/invite`, data);
    },
    onMutate: () => {
      setApiError(null);
    },
    onSuccess: async () => {
      toast({
        title: 'Invitation Sent',
        description: 'The invitation has been sent successfully.',
      });
      await queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/members`] });
      setFormState({ email: '', role: 'viewer' });
      setApiError(null);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to send invitation.';
      setApiError(message);
      toast({
        variant: 'destructive',
        title: 'Invitation Failed',
        description: message,
      });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    inviteMemberMutation.mutate(formState);
  };

  const handleCancel = () => {
    setApiError(null);
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {apiError && (
        <Alert variant="destructive" data-testid="invite-error-alert">
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Email Address</label>
        <Input
          type="email"
          value={formState.email}
          onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
          placeholder="Enter member's email"
          required
          data-testid="input-invite-email"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Role</label>
        <Select
          value={formState.role}
          onValueChange={(value: InviteRole) => setFormState((prev) => ({ ...prev, role: value }))}
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
          onClick={handleCancel}
          disabled={inviteMemberMutation.isPending}
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
  );
}
