import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { User, Lock, Mail, Save, Crown, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Dynamic Subscription Badge Component
function DynamicSubscriptionBadge() {
  const { data: userSubscription } = useQuery<{ subscription: any; package: { name: string } } | null>({
    queryKey: ['/api/user/subscription'],
  });

  const packageName = userSubscription?.package?.name || 'basic';
  
  const getBadgeVariant = (pkg: string) => {
    switch(pkg.toLowerCase()) {
      case 'business': return 'destructive';
      case 'professional': return 'default';
      case 'premium': return 'default';
      case 'basic': return 'secondary';
      default: return 'secondary';
    }
  };

  const capitalizedName = packageName.charAt(0).toUpperCase() + packageName.slice(1);

  return (
    <Badge variant={getBadgeVariant(packageName)} className="text-[10px] px-2 py-0.5">
      {capitalizedName}
    </Badge>
  );
}

// Dynamic Role Badge Component (only for management users)
function DynamicRoleBadge({ user }: { user: any }) {
  // Hide role for enduser roles (user_basic=3, user_premium=4)
  const isEndUser = user?.roleId === 3 || user?.roleId === 4;
  
  if (isEndUser) {
    return null; // Don't show role for endusers
  }

  const getRoleInfo = (roleId: number) => {
    switch(roleId) {
      case 1: return { name: 'Root', variant: 'destructive', icon: Crown };
      case 2: return { name: 'Admin', variant: 'default', icon: Shield };
      default: return { name: 'User', variant: 'secondary', icon: User };
    }
  };

  const roleInfo = getRoleInfo(user?.roleId || 0);
  const Icon = roleInfo.icon;

  return (
    <Badge variant={roleInfo.variant as any} className="text-[10px] px-2 py-0.5 flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {roleInfo.name}
    </Badge>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      return apiRequest('PUT', '/api/user/profile', data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update profile.",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest('PUT', '/api/user/password', data);
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Password Change Failed",
        description: error.message || "Failed to change password.",
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password Mismatch",
        description: "New password and confirmation password do not match.",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Invalid Password",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview - Compact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User size={16} />
              Profile Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-16 h-16 mb-3">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-base">{user?.name}</h3>
              <p className="text-gray-600 text-sm">{user?.email}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Member Since:</span>
                <span>January 2024</span>
              </div>
              {/* Role only shown for management users */}
              <DynamicRoleBadge user={user} />
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Subscription:</span>
                <DynamicSubscriptionBadge />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail size={20} />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="Enter your full name"
                    required
                    data-testid="input-profile-name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    placeholder="Enter your email"
                    required
                    data-testid="input-profile-email"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending}
                className="w-full md:w-auto"
                data-testid="button-save-profile"
              >
                <Save size={16} className="mr-2" />
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Change Password */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock size={20} />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  required
                  data-testid="input-current-password"
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  required
                  data-testid="input-new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  required
                  data-testid="input-confirm-password"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={changePasswordMutation.isPending}
              variant="outline"
              data-testid="button-change-password"
            >
              <Lock size={16} className="mr-2" />
              {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="mt-6 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <h4 className="font-medium text-red-800">Sign Out</h4>
              <p className="text-sm text-red-600">Sign out from your account on this device</p>
            </div>
            <Button 
              variant="destructive" 
              onClick={logout}
              data-testid="button-logout"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}