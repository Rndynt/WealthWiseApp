import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
interface Category {
  id: number;
  name: string;
  color?: string;
  icon?: string;
  workspaceId: number;
}
import { notificationService } from '@/lib/notification-service';

const editCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  color: z.string().optional(),
  icon: z.string().optional(),
});

type EditCategoryFormData = z.infer<typeof editCategorySchema>;

interface EditCategoryModalProps {
  category: Category | null;
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number;
}

export default function EditCategoryModal({ category, isOpen, onClose, workspaceId }: EditCategoryModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<EditCategoryFormData>({
    resolver: zodResolver(editCategorySchema),
    defaultValues: {
      name: category?.name || '',
      color: category?.color || '#3B82F6',
      icon: category?.icon || '💰',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: EditCategoryFormData) =>
      apiRequest('PATCH', `/api/workspaces/${workspaceId}/categories/${category?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/categories`] });
      notificationService.success('Category Updated', 'Category updated successfully!');
      onClose();
    },
    onError: () => {
      notificationService.error('Update Failed', 'Failed to update category. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest('DELETE', `/api/workspaces/${workspaceId}/categories/${category?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/categories`] });
      notificationService.success('Category Deleted', 'Category removed successfully!');
      onClose();
    },
    onError: () => {
      notificationService.error('Delete Failed', 'Failed to delete category. May have associated transactions.');
    },
  });

  const handleSubmit = (data: EditCategoryFormData) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  if (!category) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="e.g., Food & Dining"
            />
          </div>

          <div>
            <Label htmlFor="icon">Icon</Label>
            <Input
              id="icon"
              {...form.register('icon')}
              placeholder="e.g., 🍕"
            />
          </div>

          <div>
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              type="color"
              {...form.register('color')}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Category'}
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}