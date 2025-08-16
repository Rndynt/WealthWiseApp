import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useEnhancedPermissions } from '@/lib/enhanced-permissions';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Globe, 
  Shield, 
  Bell, 
  Eye,
  Save,
  Upload,
  Download,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';

interface AppSettings {
  id: number;
  appName: string;
  appDescription: string;
  appLogo: string;
  defaultTheme: 'light' | 'dark' | 'system';
  defaultCurrency: string;
  defaultLanguage: string;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  enableNotifications: boolean;
  sessionTimeout: number;
  maxWorkspaces: number;
  maintenanceMode: boolean;
  customCss: string;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { hasPermission, isRoot, isAdmin } = useEnhancedPermissions();
  const [formData, setFormData] = useState<Partial<AppSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Check permissions - only root and admin can access settings
  const canViewSettings = isRoot || isAdmin;
  const canUpdateSettings = isRoot || isAdmin;

  // Fetch current settings
  const { data: settings, isLoading, error } = useQuery<AppSettings>({
    queryKey: ['/api/settings'],
    enabled: canViewSettings,
    retry: false,
  });

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Track changes
  useEffect(() => {
    if (settings) {
      const changed = Object.keys(formData).some(key => 
        formData[key as keyof AppSettings] !== settings[key as keyof AppSettings]
      );
      setHasChanges(changed);
    }
  }, [formData, settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: Partial<AppSettings>) =>
      apiRequest('PUT', '/api/settings', updatedSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      setHasChanges(false);
      toast({
        title: "Settings Updated",
        description: "Application settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof AppSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  const handleReset = () => {
    if (settings) {
      setFormData(settings);
      setHasChanges(false);
    }
  };

  // Apply theme changes immediately
  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    handleInputChange('defaultTheme', theme);
    
    // Apply theme immediately to the document
    const root = window.document.documentElement;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
    
    // Store in localStorage
    localStorage.setItem('theme', theme);
  };

  if (!canViewSettings) {
    return (
      <div className="text-center py-8">
        <Shield size={48} className="mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">You don't have permission to access settings</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Failed to load settings. Please try again.</p>
        <Button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/settings'] })}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage application settings and configuration</p>
        </div>
        
        {hasChanges && canUpdateSettings && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending}
              data-testid="button-save-settings"
            >
              <Save size={16} className="mr-2" />
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon size={16} />
            General
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette size={16} />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield size={16} />
            Security
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Globe size={16} />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="appName">Application Name</Label>
                <Input
                  id="appName"
                  value={formData.appName || ''}
                  onChange={(e) => handleInputChange('appName', e.target.value)}
                  placeholder="FinanceFlow"
                  data-testid="input-app-name"
                />
              </div>
              
              <div>
                <Label htmlFor="appDescription">Description</Label>
                <Textarea
                  id="appDescription"
                  value={formData.appDescription || ''}
                  onChange={(e) => handleInputChange('appDescription', e.target.value)}
                  placeholder="Personal finance management application"
                  data-testid="input-app-description"
                />
              </div>
              
              <div>
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <Select 
                  value={formData.defaultCurrency || 'USD'} 
                  onValueChange={(value) => handleInputChange('defaultCurrency', value)}
                >
                  <SelectTrigger data-testid="select-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                    <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                    <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="defaultLanguage">Default Language</Label>
                <Select 
                  value={formData.defaultLanguage || 'en'} 
                  onValueChange={(value) => handleInputChange('defaultLanguage', value)}
                >
                  <SelectTrigger data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="id">Bahasa Indonesia</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Default Theme</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <Button
                    variant={formData.defaultTheme === 'light' ? 'default' : 'outline'}
                    onClick={() => handleThemeChange('light')}
                    className="flex items-center gap-2"
                    data-testid="button-theme-light"
                  >
                    <Sun size={16} />
                    Light
                  </Button>
                  <Button
                    variant={formData.defaultTheme === 'dark' ? 'default' : 'outline'}
                    onClick={() => handleThemeChange('dark')}
                    className="flex items-center gap-2"
                    data-testid="button-theme-dark"
                  >
                    <Moon size={16} />
                    Dark
                  </Button>
                  <Button
                    variant={formData.defaultTheme === 'system' ? 'default' : 'outline'}
                    onClick={() => handleThemeChange('system')}
                    className="flex items-center gap-2"
                    data-testid="button-theme-system"
                  >
                    <Monitor size={16} />
                    System
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="customCss">Custom CSS</Label>
                <Textarea
                  id="customCss"
                  value={formData.customCss || ''}
                  onChange={(e) => handleInputChange('customCss', e.target.value)}
                  placeholder="/* Custom CSS rules */"
                  className="font-mono text-sm"
                  rows={8}
                  data-testid="input-custom-css"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Add custom CSS to customize the application appearance
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication & Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow New Registrations</Label>
                  <p className="text-sm text-gray-500">Allow new users to create accounts</p>
                </div>
                <Switch
                  checked={formData.allowRegistration || false}
                  onCheckedChange={(checked) => handleInputChange('allowRegistration', checked)}
                  data-testid="switch-allow-registration"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Email Verification</Label>
                  <p className="text-sm text-gray-500">Users must verify their email before accessing the app</p>
                </div>
                <Switch
                  checked={formData.requireEmailVerification || false}
                  onCheckedChange={(checked) => handleInputChange('requireEmailVerification', checked)}
                  data-testid="switch-email-verification"
                />
              </div>
              
              <div>
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={formData.sessionTimeout || 60}
                  onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                  min="15"
                  max="1440"
                  data-testid="input-session-timeout"
                />
                <p className="text-sm text-gray-500 mt-1">
                  How long users stay logged in without activity
                </p>
              </div>
              
              <div>
                <Label htmlFor="maxWorkspaces">Max Workspaces per User</Label>
                <Input
                  id="maxWorkspaces"
                  type="number"
                  value={formData.maxWorkspaces || 5}
                  onChange={(e) => handleInputChange('maxWorkspaces', parseInt(e.target.value))}
                  min="1"
                  max="50"
                  data-testid="input-max-workspaces"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-gray-500">Allow push notifications for important updates</p>
                </div>
                <Switch
                  checked={formData.enableNotifications || false}
                  onCheckedChange={(checked) => handleInputChange('enableNotifications', checked)}
                  data-testid="switch-notifications"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-gray-500">Temporarily disable access for maintenance</p>
                </div>
                <Switch
                  checked={formData.maintenanceMode || false}
                  onCheckedChange={(checked) => handleInputChange('maintenanceMode', checked)}
                  data-testid="switch-maintenance-mode"
                />
              </div>
              
              {formData.maintenanceMode && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    ⚠️ Maintenance mode is enabled. Only administrators can access the application.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" className="flex items-center gap-2">
                  <Download size={16} />
                  Export Settings
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Upload size={16} />
                  Import Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}