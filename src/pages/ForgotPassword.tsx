import { useState } from "react";
import { useAuthActions, useAuthState } from "@/hooks/useAuthStore";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  
  const { resetPassword } = useAuthActions();
  const { user, loading, errors } = useAuthState();

  // If user is already logged in, redirect to home
  if (user) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await resetPassword(email);
      setEmailSent(true);
    } catch (error) {
      // Error is handled by the store and displayed via toast
      console.error("Password reset error:", error);
    }
  };

  if (emailSent) {
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
              <div className="flex items-center justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Check Your Email
              </h1>
              <p className="text-muted-foreground">
                We've sent a password reset link to your email
              </p>
            </div>
          </div>
          
          {/* Success Card */}
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <Mail className="w-16 h-16 text-brand-teal" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Password reset email sent</h3>
                  <p className="text-sm text-muted-foreground">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Check your email and click the link to reset your password. 
                    The link will expire in 1 hour.
                  </p>
                </div>

                <Alert>
                  <AlertDescription className="text-left">
                    <strong>Didn't receive the email?</strong> Check your spam folder or{" "}
                    <button 
                      onClick={() => setEmailSent(false)}
                      className="text-brand-teal hover:text-brand-teal-hover underline"
                    >
                      try again
                    </button>
                  </AlertDescription>
                </Alert>

                <div className="pt-4 border-t">
                  <Link 
                    to="/auth/login" 
                    className="inline-flex items-center text-sm text-brand-teal hover:text-brand-teal-hover font-medium hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Sign In
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
              Forgot Password?
            </h1>
            <p className="text-muted-foreground">
              Enter your email to receive a password reset link
            </p>
          </div>
        </div>
        
        {/* Password Reset Form */}
        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Reset Password</CardTitle>
            <CardDescription>
              We'll send a password reset link to your email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="focus-visible:ring-brand-teal focus-visible:border-brand-teal"
                />
                {errors.resetPassword && (
                  <p className="text-sm text-red-600">{errors.resetPassword}</p>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full bg-brand-teal hover:bg-brand-teal-hover text-white"
                disabled={loading.resettingPassword || !email.trim()}
              >
                {loading.resettingPassword ? (
                  <>
                    <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full mr-2" />
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Reset Link
                  </>
                )}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                <Link 
                  to="/auth/login" 
                  className="inline-flex items-center text-brand-teal hover:text-brand-teal-hover font-medium hover:underline"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 