import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Lock, Mail, Loader2, ArrowRight, Shield, Users, Calendar, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const { login, isLoggingIn, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Login Form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
          {/* Logo and Title */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              HR Management
            </h1>
            <p className="text-muted-foreground text-lg font-medium">
              Smart HR Management System
            </p>
            <p className="text-muted-foreground text-sm">
              Welcome back! Please sign in to continue
            </p>
          </div>

          {/* Login Card */}
          <Card className="border-2 shadow-2xl">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
              <CardDescription className="text-base">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 border-2 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 border-2 focus:border-primary transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" 
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Secure access to HR Management System
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border">
              <Shield className="h-4 w-4 text-primary" />
              <span>Protected: Only SUPERADMIN can manage SUPERADMIN accounts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Feature Showcase */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-lg space-y-8 text-white">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold leading-tight">
              Elevate Your HR Operations
            </h2>
            <p className="text-xl text-white/90">
              Comprehensive cloud-based HR management platform for employee tracking, leave management, payroll processing, and automated approval workflows.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6 pt-8">
            <div className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 animate-in slide-in-from-right-4" style={{ animationDelay: '200ms' }}>
              <div className="p-3 bg-white/20 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Employee Management</h3>
                <p className="text-white/80 text-sm">
                  Comprehensive employee records and management tools
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 animate-in slide-in-from-right-4" style={{ animationDelay: '400ms' }}>
              <div className="p-3 bg-white/20 rounded-lg">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Leave Management</h3>
                <p className="text-white/80 text-sm">
                  Track and approve leave requests with ease
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 animate-in slide-in-from-right-4" style={{ animationDelay: '600ms' }}>
              <div className="p-3 bg-white/20 rounded-lg">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Secure & Reliable</h3>
                <p className="text-white/80 text-sm">
                  Enterprise-grade security for your sensitive data
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
