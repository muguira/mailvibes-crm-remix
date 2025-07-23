import { useState } from "react";
import { useAuth } from "@/components/auth";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { logger } from '@/utils/logger';

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in, redirect to home
  if (user) {
    return <Navigate to="/" />;
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      await signUp({ email, password });
      navigate("/");
    } catch (error) {
      logger.error("Sign up error:", error);
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
            className="w-[200px] h-[200px] mx-auto mb-4 object-contain -mt-[50px]"
          />
          <div className="relative -mt-[86px] z-50">
            <p className="text-muted-foreground mb-2">
              Create your account to get started
            </p>
            
            {/* Progress indicator */}
            <div className="flex justify-center mt-2 space-x-2">
              <div className="w-2 h-2 bg-brand-teal rounded-full"></div>
              <div className="w-2 h-2 bg-muted rounded-full"></div>
              <div className="w-2 h-2 bg-muted rounded-full"></div>
            </div>
            <Badge variant="secondary" className="mt-1 mb-2">
              Step 1 of 3: Create Account
            </Badge>
          </div>
        </div>
        
        {/* Sign Up Form */}
        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Create account</CardTitle>
            <CardDescription>
              Enter your information to create your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your work email"
                  required
                  className="focus-visible:ring-brand-teal focus-visible:border-brand-teal"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="companyName">
                  Company Name <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your company name"
                  className="focus-visible:ring-brand-teal focus-visible:border-brand-teal"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className={`focus-visible:ring-brand-teal focus-visible:border-brand-teal ${
                    errors.password ? 'border-destructive' : ''
                  }`}
                />
                {errors.password && (
                  <p className="text-destructive text-xs">{errors.password}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className={`focus-visible:ring-brand-teal focus-visible:border-brand-teal ${
                    errors.confirmPassword ? 'border-destructive' : ''
                  }`}
                />
                {errors.confirmPassword && (
                  <p className="text-destructive text-xs">{errors.confirmPassword}</p>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full bg-brand-teal hover:bg-brand-teal-hover text-white mt-2"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>

              <div className="text-xs text-muted-foreground text-center mt-2">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </div>
              
              <div className="text-center text-sm text-muted-foreground pt-2 border-t">
                Already have an account?{" "}
                <Link 
                  to="/auth/login" 
                  className="text-brand-teal hover:text-brand-teal-hover font-medium hover:underline"
                >
                  Sign in here
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
