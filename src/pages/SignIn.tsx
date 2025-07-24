import { useState } from "react";
import { useAuth } from "@/components/auth";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from '@/utils/logger';

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in, redirect to home
  if (user) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signIn({ email, password });
      navigate("/");
    } catch (error) {
      logger.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Logo Section */}
        <div className="text-center">
          <img 
            src="https://i.imgur.com/HDICIxv.png" 
            alt="SalesSheet Logo" 
            className="w-[200px] h-[200px] mx-auto mb-4 object-contain -mt-[100px]"
          />
          <div className="relative -mt-[60px] z-50">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome Back
            </h1>
            <p className="text-muted-foreground">
              Sign in to access your account
            </p>
          </div>
        </div>
        
        {/* Sign In Form */}
        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="focus-visible:ring-brand-teal focus-visible:border-brand-teal"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="focus-visible:ring-brand-teal focus-visible:border-brand-teal"
                />
              </div>
              
              {/* Forgot Password Link */}
              <div className="text-right">
                <Link 
                  to="/auth/forgot-password" 
                  className="text-sm text-brand-teal hover:text-brand-teal-hover hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-brand-teal hover:bg-brand-teal-hover text-white mt-2"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground pt-2 border-t">
                Don't have an account?{" "}
                <Link 
                  to="/auth/register" 
                  className="text-brand-teal hover:text-brand-teal-hover font-medium hover:underline"
                >
                  Create one here
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
