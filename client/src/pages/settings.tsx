import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Settings as SettingsIcon, Palette, Database, Shield, Save } from 'lucide-react';

interface AppSettings {
  id: number;
  appName: string;
  appDescription: string;
  primaryColor: string;
  theme: 'light' | 'dark' | 'system';
  maintenanceMode: boolean;
  allowRegistration: boolean;
  defaultCurrency: string;
  timeZone: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<AppSettings>({
    queryKey: ['/api/admin/settings'],
  });

  const [formData, setFormData] = useState<Partial<AppSettings>>({
    appName: settings?.appName || 'FinanceFlow',
    appDescription: settings?.appDescription || 'Personal Finance Management Application',
    primaryColor: settings?.primaryColor || '#3b82f6',
    theme: settings?.theme || 'light',
    maintenanceMode: settings?.maintenanceMode || false,
    allowRegistration: settings?.allowRegistration || true,
    defaultCurrency: settings?.defaultCurrency || 'IDR',
    timeZone: settings?.timeZone || 'Asia/Jakarta',
    logoUrl: settings?.logoUrl || '',
  });

  // Update form data when settings load
  React.useEffect(() => {
    if (settings) {
      setFormData({
        appName: settings.appName,
        appDescription: settings.appDescription,
        primaryColor: settings.primaryColor,
        theme: settings.theme,
        maintenanceMode: settings.maintenanceMode,
        allowRegistration: settings.allowRegistration,
        defaultCurrency: settings.defaultCurrency,
        timeZone: settings.timeZone,
        logoUrl: settings.logoUrl,
      });
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<AppSettings>) => {
      return apiRequest('PUT', '/api/admin/settings', data);
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Application settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update settings.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Application Settings</h1>
        <p className="text-gray-600">Configure application-wide settings and preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon size={20} />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="appName">Application Name</Label>
                <Input
                  id="appName"
                  value={formData.appName}
                  onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                  placeholder="Enter application name"
                  data-testid="input-app-name"
                />
              </div>
              <div>
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <Select 
                  value={formData.defaultCurrency} 
                  onValueChange={(value) => setFormData({ ...formData, defaultCurrency: value })}
                >
                  <SelectTrigger data-testid="select-currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDR">IDR (Indonesian Rupiah)</SelectItem>
                    <SelectItem value="USD">USD (US Dollar)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="appDescription">Application Description</Label>
              <Textarea
                id="appDescription"
                value={formData.appDescription}
                onChange={(e) => setFormData({ ...formData, appDescription: e.target.value })}
                placeholder="Enter application description"
                rows={3}
                data-testid="textarea-app-description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timeZone">Default Time Zone</Label>
                <Select 
                  value={formData.timeZone} 
                  onValueChange={(value) => setFormData({ ...formData, timeZone: value })}
                >
                  <SelectTrigger data-testid="select-timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                    <SelectItem value="Asia/Makassar">Asia/Makassar (WITA)</SelectItem>
                    <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="logoUrl">Logo URL (Optional)</Label>
                <Input
                  id="logoUrl"
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  data-testid="input-logo-url"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette size={20} />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="theme">Theme</Label>
                <Select 
                  value={formData.theme} 
                  onValueChange={(value: 'light' | 'dark' | 'system') => setFormData({ ...formData, theme: value })}
                >
                  <SelectTrigger data-testid="select-theme">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-16 h-10 p-1"
                    data-testid="input-primary-color"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield size={20} />
              Security & Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Allow New Registrations</Label>
                <p className="text-sm text-gray-600">
                  Allow new users to register for accounts
                </p>
              </div>
              <Switch
                checked={formData.allowRegistration}
                onCheckedChange={(checked) => setFormData({ ...formData, allowRegistration: checked })}
                data-testid="switch-allow-registration"
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-gray-600">
                  Enable maintenance mode to restrict access
                </p>
              </div>
              <Switch
                checked={formData.maintenanceMode}
                onCheckedChange={(checked) => setFormData({ ...formData, maintenanceMode: checked })}
                data-testid="switch-maintenance-mode"
              />
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database size={20} />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Last Updated:</span>
              <span>{settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Never'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Version:</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Environment:</span>
              <span className="capitalize">Development</span>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={updateSettingsMutation.isPending}
            className="min-w-32"
            data-testid="button-save-settings"
          >
            <Save size={16} className="mr-2" />
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}