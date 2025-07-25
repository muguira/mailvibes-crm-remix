import { useState, useEffect } from "react";
import { useAuthActions, useAuthState } from "@/hooks/useAuthStore";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isPasswordChanged, setIsPasswordChanged] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updatePassword } = useAuthActions();
  const { user, loading, errors } = useAuthState();

  // Extract token from URL parameters
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const type = searchParams.get('type');

  // Verify token and set session on component mount
  useEffect(() => {
    const verifyTokenAndSetSession = async () => {
      console.log('🔍 Reset Password Debug Info:');
      console.log('Access Token:', accessToken);
      console.log('Refresh Token:', refreshToken);
      console.log('Type:', type);
      console.log('Full URL:', window.location.href);
      
      // Check if we have the expected parameters
      if (!accessToken || type !== 'recovery') {
        console.log('❌ Token validation failed:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          typeIsRecovery: type === 'recovery',
          actualType: type
        });
        setIsValidToken(false);
        setIsVerifyingToken(false);
        return;
      }

      try {
        console.log('🔄 Attempting to get current session...');
        
        // First try to get the current session to see if user is already authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('📊 Current session check:', { session, sessionError });
        
        if (session?.user) {
          // User is already authenticated via the URL parameters
          console.log('✅ User already authenticated via URL');
          setIsValidToken(true);
        } else {
          // Try to exchange the tokens
          console.log('🔄 Attempting to set session with tokens...');
          
          const sessionData: any = {
            access_token: accessToken,
          };
          
          if (refreshToken && refreshToken.trim()) {
            sessionData.refresh_token = refreshToken;
          }
          
          const { data, error } = await supabase.auth.setSession(sessionData);
          
          console.log('📊 Session result:', { data, error });

          if (error) {
            console.error('❌ Error setting session:', error);
            // If JWT error, the tokens might be PKCE codes instead of JWTs
            if (error.message?.includes('JWT') || error.message?.includes('Invalid')) {
              console.log('🔄 Tokens appear to be PKCE codes, not JWTs. Checking if already authenticated...');
              // Sometimes Supabase handles this automatically in the background
              // Let's wait a moment and check again
              setTimeout(async () => {
                const { data: { session: retrySession } } = await supabase.auth.getSession();
                if (retrySession?.user) {
                  console.log('✅ User authenticated after retry');
                  setIsValidToken(true);
                } else {
                  setIsValidToken(false);
                }
                setIsVerifyingToken(false);
              }, 1000);
              return;
            }
            setIsValidToken(false);
          } else {
            console.log('✅ Session set successfully');
            setIsValidToken(true);
          }
        }
      } catch (error) {
        console.error('❌ Error verifying token:', error);
        setIsValidToken(false);
      } finally {
        setIsVerifyingToken(false);
      }
    };

    verifyTokenAndSetSession();
  }, [accessToken, refreshToken, type]);

  // If user is already logged in and not resetting password, redirect to home
  if (user && !accessToken && !isPasswordChanged) {
    return <Navigate to="/" />;
  }

  // Validate password requirements
  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    
    if (pwd.length < 7) {
      errors.push("Password must be at least 7 characters long");
    }
    
    if (!/(?=.*[a-z])/.test(pwd)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    
    if (!/(?=.*[A-Z])/.test(pwd)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    
    if (!/(?=.*\d)/.test(pwd)) {
      errors.push("Password must contain at least one number");
    }
    
    return errors;
  };

  // Handle password input changes with validation
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    // Validate password in real-time
    const errors = validatePassword(newPassword);
    setValidationErrors(errors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setValidationErrors(passwordErrors);
      return;
    }
    
    if (password !== confirmPassword) {
      setValidationErrors(["Passwords do not match"]);
      return;
    }
    
    try {
      await updatePassword(password);
      setIsPasswordChanged(true);
    } catch (error) {
      // Error is handled by the store and displayed via toast
      console.error("Password update error:", error);
    }
  };

  // Loading state while verifying token
  if (isVerifyingToken) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <div className="w-8 h-8 animate-spin border-2 border-brand-teal border-t-transparent rounded-full mx-auto" />
                <p className="text-muted-foreground">Verifying reset link...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!isValidToken) {
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
              <h1 className="text-2xl font-semibold tracking-tight text-red-600">
                Invalid Reset Link
              </h1>
              <p className="text-muted-foreground">
                This password reset link is invalid or has expired
              </p>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    The password reset link you clicked is either invalid or has expired. 
                    Password reset links are only valid for 1 hour after being sent.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Button
                    onClick={() => navigate('/auth/forgot-password')}
                    className="w-full bg-brand-teal hover:bg-brand-teal-hover text-white"
                  >
                    Request New Reset Link
                  </Button>
                  
                  <Button
                    onClick={() => navigate('/auth/login')}
                    variant="outline"
                    className="w-full"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state after password change
  if (isPasswordChanged) {
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
                Password Changed Successfully
              </h1>
              <p className="text-muted-foreground">
                Your password has been updated successfully
              </p>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Your password has been changed successfully. You can now sign in with your new password.
                  </p>
                </div>

                <Button
                  onClick={() => navigate('/auth/login')}
                  className="w-full bg-brand-teal hover:bg-brand-teal-hover text-white"
                >
                  Continue to Sign In
                </Button>
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
              Set New Password
            </h1>
            <p className="text-muted-foreground">
              Choose a strong password for your account
            </p>
          </div>
        </div>
        
        {/* Password Reset Form */}
        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Create New Password</CardTitle>
            <CardDescription>
              Your new password must meet the security requirements below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Enter your new password"
                    required
                    className="focus-visible:ring-brand-teal focus-visible:border-brand-teal pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                    className="focus-visible:ring-brand-teal focus-visible:border-brand-teal pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Password Requirements:</p>
                <ul className="text-xs space-y-1">
                  <li className={`flex items-center gap-2 ${password.length >= 7 ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${password.length >= 7 ? 'bg-green-600' : 'bg-gray-300'}`} />
                    At least 7 characters
                  </li>
                  <li className={`flex items-center gap-2 ${/(?=.*[a-z])/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${/(?=.*[a-z])/.test(password) ? 'bg-green-600' : 'bg-gray-300'}`} />
                    One lowercase letter
                  </li>
                  <li className={`flex items-center gap-2 ${/(?=.*[A-Z])/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${/(?=.*[A-Z])/.test(password) ? 'bg-green-600' : 'bg-gray-300'}`} />
                    One uppercase letter
                  </li>
                  <li className={`flex items-center gap-2 ${/(?=.*\d)/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${/(?=.*\d)/.test(password) ? 'bg-green-600' : 'bg-gray-300'}`} />
                    One number
                  </li>
                  <li className={`flex items-center gap-2 ${password === confirmPassword && password.length > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${password === confirmPassword && password.length > 0 ? 'bg-green-600' : 'bg-gray-300'}`} />
                    Passwords match
                  </li>
                </ul>
              </div>

              {/* Validation Errors */}
              {(validationErrors.length > 0 || errors.updatePassword) && (
                <Alert>
                  <AlertDescription className="text-left">
                    {validationErrors.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    ) : (
                      errors.updatePassword
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                type="submit"
                className="w-full bg-brand-teal hover:bg-brand-teal-hover text-white"
                disabled={
                  loading.updatingPassword || 
                  validationErrors.length > 0 || 
                  !password.trim() || 
                  !confirmPassword.trim() ||
                  password !== confirmPassword
                }
              >
                {loading.updatingPassword ? (
                  <>
                    <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full mr-2" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Update Password
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 