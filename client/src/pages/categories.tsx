import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, AlertCircle, Heart, Edit, Lock } from 'lucide-react';
import { Category } from '@/types';
import AddCategoryModal from '@/components/modals/add-category-modal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageContainer } from '@/components/ui/page-container';

interface CategoriesProps {
  workspaceId: number | undefined;
}

const categoryTypeConfig = {
  income: {
    title: 'Income',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  needs: {
    title: 'Needs',
    icon: AlertCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  wants: {
    title: 'Wants',
    icon: Heart,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
};

const iconMap: Record<string, string> = {
  'briefcase': '💼',
  'shopping-cart': '🛒',
  'bolt': '⚡',
  'bus': '🚌',
  'tv': '📺',
  'home': '🏠',
  'car': '🚗',
  'heart': '❤️',
};

export default function Categories({ workspaceId }: CategoriesProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: [`/api/workspaces/${workspaceId}/categories`],
    enabled: !!workspaceId,
  });

  // Check category limits
  const { data: categoryLimits } = useQuery<{ canCreate: boolean; limit: number | null; current: number }>({
    queryKey: [`/api/workspaces/${workspaceId}/category-limits`],
    enabled: !!workspaceId,
  });

  const groupedCategories = categories?.reduce((acc, category) => {
    if (!acc[category.type]) {
      acc[category.type] = [];
    }
    acc[category.type].push(category);
    return acc;
  }, {} as Record<string, Category[]>) || {};

  const isLimitReached = categoryLimits ? !categoryLimits.canCreate : false;
  const limitText = categoryLimits ? `${categoryLimits.current}/${categoryLimits.limit ?? '∞'}` : '';
  const packageType = categoryLimits?.limit === 3 ? 'Basic' : categoryLimits?.limit === null ? 'Premium' : 'Standard';

  if (!workspaceId) {
    return (
      <PageContainer>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Please select a workspace to view categories</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6 mb-6">
        {/* Mobile Header */}
        <div className="block sm:hidden">
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Categories
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm text-center mb-4">
            Organize your transactions by category
          </p>
          {categoryLimits && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
              {limitText} categories used • {packageType} Package
            </p>
          )}
          <div className="flex justify-center">
            <Button 
              onClick={() => setShowAddModal(true)} 
              disabled={isLimitReached}
              size="lg"
              className="w-full max-w-xs"
            >
              {isLimitReached ? (
                <>
                  <Lock className="mr-2" size={16} />
                  Limit Reached
                </>
              ) : (
                <>
                  <Plus className="mr-2" size={16} />
                  Add Category
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            {categoryLimits && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {limitText} categories used • {packageType} Package
              </p>
            )}
          </div>
          <Button 
            onClick={() => setShowAddModal(true)} 
            className="mt-4 sm:mt-0"
            disabled={isLimitReached}
            size="lg"
          >
            {isLimitReached ? (
              <>
                <Lock className="mr-2" size={16} />
                Limit Reached
              </>
            ) : (
              <>
                <Plus className="mr-2" size={16} />
                Add Category
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Limit Warning */}
      {isLimitReached && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Anda telah mencapai batas maksimal kategori untuk paket {packageType} ({categoryLimits!.current}/{categoryLimits!.limit}). 
            Upgrade ke paket Premium untuk kategori unlimited.
          </AlertDescription>
        </Alert>
      )}

      {/* Category Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(categoryTypeConfig).map(([type, config]) => {
          const Icon = config.icon;
          const typeCategories = groupedCategories[type] || [];

          return (
            <Card key={type}>
              <CardHeader>
                <CardTitle className={`flex items-center ${config.color}`}>
                  <Icon className="mr-2" size={20} />
                  {config.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isLoading ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-12 bg-gray-200 rounded-lg"></div>
                      </div>
                    ))
                  ) : typeCategories.length > 0 ? (
                    typeCategories.map((category) => (
                      <div
                        key={category.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${config.bgColor}`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">
                            {iconMap[category.icon] || '📂'}
                          </span>
                          <div>
                            <span className="font-medium text-gray-900">{category.name}</span>
                            {category.description && (
                              <p className="text-xs text-gray-600 mt-1">{category.description}</p>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Edit size={14} />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No {config.title.toLowerCase()} categories yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setShowAddModal(true)}
                      >
                        <Plus size={14} className="mr-1" />
                        Add {config.title}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AddCategoryModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        workspaceId={workspaceId!}
      />
    </PageContainer>
  );
}
