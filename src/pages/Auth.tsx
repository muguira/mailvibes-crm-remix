import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import { CustomButton } from "@/components/ui/custom-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isSignUp) {
        await signUp(email, password);
        // Navigate to dashboard after signup
        navigate("/dashboard");
      } else {
        await signIn(email, password);
        // Navigate to dashboard after signin
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Authentication error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-light/10 font-sans">
      <div className="w-full max-w-md m-auto p-8">
        <div className="mb-8 text-center">
          <span className="text-teal-primary text-3xl font-bold mb-4 inline-block">
            $
          </span>
          <h1 className="text-2xl text-navy-deep font-sans">
            <span className="font-bold">Sales</span> <span className="font-normal">Sheets</span>
          </h1>
          <p className="text-slate-medium mt-2">Sign in to access your account</p>
        </div>
        
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
              className="w-full p-2 border border-slate-light rounded focus:outline-none focus:ring-2 focus:ring-teal-primary"
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
              className="w-full p-2 border border-slate-light rounded focus:outline-none focus:ring-2 focus:ring-teal-primary"
              required
            />
          </div>
          
          <CustomButton
            type="submit"
            className="w-full"
            isLoading={isLoading}
          >
            {isSignUp ? "Sign Up" : "Sign In"}
          </CustomButton>
          
          <div className="text-center text-sm">
            <button
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)} 
              className="text-teal-primary hover:underline"
            >
              {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
