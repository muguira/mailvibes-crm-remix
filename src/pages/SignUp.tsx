import { useState } from "react";
import { useAuth } from "@/components/auth";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { CustomButton } from "@/components/ui/custom-button";
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
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-sans">
      <div className="w-full max-w-md m-auto p-8">
        <div className="mb-8 text-center">
          {/* New Logo */}
          <div className="mb-6">
            <img 
              src="https://i.imgur.com/HDICIxv.png" 
              alt="SalesSheet Logo" 
              className="w-16 h-16 mx-auto"
            />
          </div>
          
          {/* Clear Header for Sign Up */}
          <h1 className="text-2xl text-navy-deep font-sans mb-2">
            <span className="font-bold">Join SalesSheet</span>
          </h1>
          <p className="text-slate-medium">Create your account to get started</p>
          
          {/* Progress indicator */}
          <div className="flex justify-center mt-4 space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Step 1 of 3: Create Account</p>
        </div>
        
        {/* Sign Up Form */}
        <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-dark">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your work email"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="companyName" className="text-sm font-medium text-slate-dark">
                Company Name <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your company name"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-dark">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.password ? 'border-red-300 bg-red-50' : 'border-slate-300'
                }`}
                placeholder="Create a strong password"
                required
              />
              {errors.password && (
                <p className="text-red-500 text-xs">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-dark">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-300'
                }`}
                placeholder="Confirm your password"
                required
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs">{errors.confirmPassword}</p>
              )}
            </div>
            
            <CustomButton
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
              isLoading={isLoading}
            >
              Create Account
            </CustomButton>

            <div className="text-xs text-slate-500 text-center">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </div>
            
            <div className="text-center text-sm pt-4 border-t border-slate-200">
              <span className="text-slate-medium">Already have an account? </span>
              <Link 
                to="/auth/login" 
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                Sign in here
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 