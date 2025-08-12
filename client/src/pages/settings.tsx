import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Globe, 
  Shield, 
  Bell, 
  Eye,
  Save,
  Upload,
  Download
} from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';

interface AppSettings {
  id: number;
  appName: string;
  appDescription: string;
  appLogo: string;
  defaultTheme: string;
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
  const [activeTab, setActiveTab] = useState('general');

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<AppSettings>({
    queryKey: ['/api/settings'],
    retry: false,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: Partial<AppSettings>) =>
      apiRequest('/api/settings', 'PUT', updatedSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Updated",
        description: "Application settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const [formData, setFormData] = useState<Partial<AppSettings>>({
    appName: 'FinanceFlow',
    appDescription: 'Personal Finance Management Application',
    defaultTheme: 'light',
    defaultCurrency: 'USD',
    defaultLanguage: 'en',
    allowRegistration: true,
    requireEmailVerification: false,
    enableNotifications: true,
    sessionTimeout: 24,
    maxWorkspaces: 10,
    maintenanceMode: false,
    customCss: '',
  });

  // Update form data when settings are loaded
  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof AppSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'localization', label: 'Localization', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'advanced', label: 'Advanced', icon: Eye },
  ];

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="spinner mb-4" />
            <p>Loading settings...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Settings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="appName">Application Name</Label>
                    <Input
                      id="appName"
                      value={formData.appName || ''}
                      onChange={(e) => handleInputChange('appName', e.target.value)}
                      placeholder="FinanceFlow"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxWorkspaces">Max Workspaces (Default)</Label>
                    <Input
                      id="maxWorkspaces"
                      type="number"
                      value={formData.maxWorkspaces || ''}
                      onChange={(e) => handleInputChange('maxWorkspaces', parseInt(e.target.value))}
                      placeholder="10"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="appDescription">Application Description</Label>
                  <Textarea
                    id="appDescription"
                    value={formData.appDescription || ''}
                    onChange={(e) => handleInputChange('appDescription', e.target.value)}
                    placeholder="Personal Finance Management Application"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Application Logo</Label>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      {formData.appLogo ? (
                        <img src={formData.appLogo} alt="Logo" className="w-12 h-12 object-contain" />
                      ) : (
                        <SettingsIcon size={24} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button variant="outline" size="sm">
                        <Upload size={16} className="mr-2" />
                        Upload Logo
                      </Button>
                      <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="defaultTheme">Default Theme</Label>
                    <Select
                      value={formData.defaultTheme || 'light'}
                      onValueChange={(value) => handleInputChange('defaultTheme', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="customCss">Custom CSS</Label>
                  <Textarea
                    id="customCss"
                    value={formData.customCss || ''}
                    onChange={(e) => handleInputChange('customCss', e.target.value)}
                    placeholder="/* Add your custom CSS here */"
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Add custom CSS to override default styles. Use with caution.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'localization' && (
            <Card>
              <CardHeader>
                <CardTitle>Localization Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="defaultLanguage">Default Language</Label>
                    <Select
                      value={formData.defaultLanguage || 'en'}
                      onValueChange={(value) => handleInputChange('defaultLanguage', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="id">Indonesian</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="defaultCurrency">Default Currency</Label>
                    <Select
                      value={formData.defaultCurrency || 'USD'}
                      onValueChange={(value) => handleInputChange('defaultCurrency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Allow User Registration</Label>
                    <p className="text-sm text-gray-500">Allow new users to create accounts</p>
                  </div>
                  <Switch
                    checked={formData.allowRegistration || false}
                    onCheckedChange={(checked) => handleInputChange('allowRegistration', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Require Email Verification</Label>
                    <p className="text-sm text-gray-500">Users must verify their email before accessing the app</p>
                  </div>
                  <Switch
                    checked={formData.requireEmailVerification || false}
                    onCheckedChange={(checked) => handleInputChange('requireEmailVerification', checked)}
                  />
                </div>

                <div>
                  <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={formData.sessionTimeout || 24}
                    onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                    min="1"
                    max="168"
                  />
                  <p className="text-xs text-gray-500 mt-1">Users will be logged out after this period of inactivity</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Notifications</Label>
                    <p className="text-sm text-gray-500">Allow the system to send notifications</p>
                  </div>
                  <Switch
                    checked={formData.enableNotifications || false}
                    onCheckedChange={(checked) => handleInputChange('enableNotifications', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'advanced' && (
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-gray-500">Enable maintenance mode to restrict access</p>
                  </div>
                  <Switch
                    checked={formData.maintenanceMode || false}
                    onCheckedChange={(checked) => handleInputChange('maintenanceMode', checked)}
                  />
                </div>

                {formData.maintenanceMode && (
                  <Badge variant="destructive" className="w-fit">
                    <Bell size={12} className="mr-1" />
                    Maintenance Mode is Active
                  </Badge>
                )}

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-4">Data Management</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" size="sm">
                      <Download size={16} className="mr-2" />
                      Export Settings
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload size={16} className="mr-2" />
                      Import Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <Card className="mt-6">
            <CardContent className="flex justify-end space-x-4 pt-6">
              <Button variant="outline" onClick={() => setFormData(settings || {})}>
                Reset
              </Button>
              <Button 
                onClick={handleSave}
                disabled={updateSettingsMutation.isPending}
              >
                <Save size={16} className="mr-2" />
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}