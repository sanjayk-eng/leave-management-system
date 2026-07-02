import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Lock,
  Mail,
  Loader2,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import GoogleIcon from "./GoogleIcon";

const LoginForm = () => {
  const { login, isLoggingIn, googleLogin, isGoogleLoggingIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isAnyLoading = isLoggingIn || isGoogleLoggingIn;

  const handleLocalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login({ provider: "local", email, password });
  };

  const handleGoogleLogin = useGoogleLogin({
    flow: "implicit",
    onSuccess: (tokenResponse) => {
      googleLogin(tokenResponse.access_token);
    },
    onError: () => {
      toast.error("Google sign-in failed. Please try again.");
    },
  });

  return (
    <div className="flex flex-1 items-center justify-center p-6 bg-background overflow-hidden">

      {/* stagger wrapper — each direct child gets a delay via nth-child */}
      <div className="w-full max-w-md flex flex-col gap-5">

        {/* ── Logo and Title — delay 0ms ──────────────────────────────── */}
        <div
          className="text-center space-y-1 animate-in fade-in-0 slide-in-from-top-4 duration-700"
          style={{ animationDelay: "0ms", animationFillMode: "both" }}
        >
          <div className="flex justify-center mb-3">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center
                            transition-transform duration-300 hover:scale-110 hover:rotate-3">
              <Shield className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            HR Management
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Smart HR Management System
          </p>
          <p className="text-muted-foreground text-xs">
            Welcome back! Please sign in to continue
          </p>
        </div>

        {/* ── Login Card — delay 150ms ────────────────────────────────── */}
        <Card
          className="border-2 shadow-2xl animate-in fade-in-0 slide-in-from-bottom-6 duration-700"
          style={{ animationDelay: "150ms", animationFillMode: "both" }}
        >
          <CardHeader className="space-y-0.5 pb-4 pt-5">
            <CardTitle className="text-xl font-bold">Sign In</CardTitle>
            <CardDescription className="text-sm">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pb-5">

            {/* Google Sign-In */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-sm font-semibold border-2 gap-3
                         hover:bg-muted/50 hover:scale-[1.02] hover:shadow-md
                         active:scale-[0.98] transition-all duration-200"
              onClick={() => handleGoogleLogin()}
              disabled={isAnyLoading}
            >
              {isGoogleLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in with Google...
                </>
              ) : (
                <>
                  <GoogleIcon />
                  Continue with Google
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Local Login Form */}
            <form onSubmit={handleLocalLogin} className="space-y-3">

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold">
                  Email Address
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground
                                   transition-colors duration-200 group-focus-within:text-primary" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 border-2 focus:border-primary transition-all duration-200
                               focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-semibold">
                  Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground
                                   transition-colors duration-200 group-focus-within:text-primary" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-10 border-2 focus:border-primary transition-all duration-200
                               focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground
                               hover:text-foreground transition-all duration-200 hover:scale-110"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4" />
                      : <Eye className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold shadow-lg mt-1
                           hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                           transition-all duration-200"
                disabled={isAnyLoading}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Footer — delay 300ms ────────────────────────────────────── */}
        <div
          className="space-y-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
          style={{ animationDelay: "300ms", animationFillMode: "both" }}
        >
          <p className="text-center text-xs text-muted-foreground">
            Secure access to HR Management System
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-lg border">
            <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Protected: Only SUPERADMIN can manage SUPERADMIN accounts</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginForm;
