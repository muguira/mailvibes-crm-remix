import { useAuth } from "@/components/auth";
import { LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useRadixPointerEventsFix } from "@/hooks/use-radix-pointer-events-fix";
import { useRef, useCallback, useEffect } from "react";

export function ProfileMenu() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoggingOutRef = useRef(false);
  
  // Fix for Radix UI pointer-events bug that can cause infinite loops
  const { forceCleanup } = useRadixPointerEventsFix();

  // Enhanced logout handler with timeout management
  const handleLogout = useCallback(async () => {
    // Prevent multiple logout attempts
    if (isLoggingOutRef.current || loading) {
      console.log('🚫 Logout already in progress or auth loading, skipping...');
      return;
    }

    try {
      isLoggingOutRef.current = true;
      console.log('🔓 Starting logout process...');
      
      // Clear any pending timeouts that might interfere
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Force cleanup of pointer events immediately
      forceCleanup();
      
      // Ensure we can interact with the page during logout
      document.body.style.pointerEvents = "";
      
      await signOut();
      console.log('✅ Logout successful, navigating to auth...');
      
      // Navigate immediately without timeout to avoid interference
      navigate("/auth", { replace: true });
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Even if logout fails, force navigation and cleanup
      forceCleanup();
      document.body.style.pointerEvents = "";
      navigate("/auth", { replace: true });
    } finally {
      isLoggingOutRef.current = false;
    }
  }, [signOut, navigate, forceCleanup, loading]);
  
  const handleLogin = useCallback(() => {
    navigate("/auth");
  }, [navigate]);

  // Enhanced dropdown close handler with better timeout management
  const handleDropdownOpenChange = useCallback((open: boolean) => {
    if (!open) {
      // Clear any existing timeout first
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a new timeout with cleanup
      timeoutRef.current = setTimeout(() => {
        forceCleanup();
        timeoutRef.current = null;
      }, 50);
    }
  }, [forceCleanup]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!user) {
    return (
      <button
        onClick={handleLogin}
        className="p-2 rounded-full bg-teal-primary text-white hover:bg-teal-dark"
      >
        <User className="h-5 w-5" />
      </button>
    );
  }

  const userInitials = user.email ? user.email.substring(0, 2).toUpperCase() : "U";

  return (
    <DropdownMenu onOpenChange={handleDropdownOpenChange}>
      <DropdownMenuTrigger asChild>
        <button 
          className="p-2 rounded-full bg-navy-deep text-white hover:bg-navy-light flex items-center justify-center h-9 w-9"
          disabled={loading}
        >
          {userInitials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-[10001]">
        <div className="px-2 py-2 text-sm">
          <p className="font-medium">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleLogout}
          disabled={loading || isLoggingOutRef.current}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{loading || isLoggingOutRef.current ? 'Signing out...' : 'Log out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
