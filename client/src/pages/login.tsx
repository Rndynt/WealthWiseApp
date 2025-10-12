import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { ChartLine, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: 'demo@financeflow.com', password: 'demo123' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', passwordConfirm: '', name: '' });
  const [passwordError, setPasswordError] = useState('');
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      setLocation('/dashboard');
    } catch (error) {
      // Error handled in auth context
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    // Validate password confirmation
    if (registerForm.password !== registerForm.passwordConfirm) {
      setPasswordError('Password tidak cocok');
      return;
    }

    // Validate password length
    if (registerForm.password.length < 6) {
      setPasswordError('Password minimal 6 karakter');
      return;
    }

    setIsLoading(true);
    try {
      await register(registerForm.email, registerForm.password, registerForm.name);
      setLocation('/dashboard');
    } catch (error) {
      // Error handled in auth context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <ChartLine className="text-white text-2xl" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">FinanceFlow</h1>
            <p className="text-gray-600">Financial Management</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="form-field">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">Demo Credentials:</p>
                <p className="text-xs text-blue-600">Email: demo@financeflow.com</p>
                <p className="text-xs text-blue-600">Password: demo123</p>
              </div>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="form-field">
                  <Label htmlFor="register-name">Full Name</Label>
                  <Input
                    id="register-name"
                    type="text"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    placeholder="Enter your full name"
                    required
                    data-testid="input-register-name"
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    placeholder="Enter your email"
                    required
                    data-testid="input-register-email"
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    placeholder="Create a password (min. 6 characters)"
                    required
                    data-testid="input-register-password"
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="register-password-confirm">Confirm Password</Label>
                  <Input
                    id="register-password-confirm"
                    type="password"
                    value={registerForm.passwordConfirm}
                    onChange={(e) => setRegisterForm({ ...registerForm, passwordConfirm: e.target.value })}
                    placeholder="Re-enter your password"
                    required
                    data-testid="input-register-password-confirm"
                  />
                </div>
                {passwordError && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded" data-testid="error-password">
                    {passwordError}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-register">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
