import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/auth";

interface AuthenticatedRedirectProps {
    children: React.ReactNode;
}

export function AuthenticatedRedirect({ children }: AuthenticatedRedirectProps) {
    const { user, loading } = useAuth();

    // Show loading indicator while checking auth state
    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-primary"></div>
            </div>
        );
    }

    // If user is authenticated, redirect to home
    if (user) {
        return <Navigate to="/" replace />;
    }

    // Otherwise, show the children (typically the Landing page)
    return <>{children}</>;
} 