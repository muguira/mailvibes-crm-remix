import { useState } from "react";
import { useAuth } from "@/components/auth";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { CustomButton } from "@/components/ui/custom-button";
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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans">
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
          
          {/* Clear Header for Sign In */}
          <h1 className="text-2xl text-navy-deep font-sans mb-2">
            <span className="font-bold">Welcome Back</span>
          </h1>
          <p className="text-slate-medium">Sign in to access your account</p>
        </div>
        
        {/* Sign In Form */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-dark">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-primary focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-dark">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-primary focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>
            
            <CustomButton
              type="submit"
              className="w-full bg-teal-primary hover:bg-teal-dark text-white py-3 rounded-lg font-medium"
              isLoading={isLoading}
            >
              Sign In
            </CustomButton>
            
            <div className="text-center text-sm pt-4 border-t border-slate-200">
              <span className="text-slate-medium">Don't have an account? </span>
              <Link 
                to="/auth/register" 
                className="text-teal-primary hover:text-teal-dark font-medium hover:underline"
              >
                Create one here
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 