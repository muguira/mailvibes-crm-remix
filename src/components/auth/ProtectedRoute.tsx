import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {
        // Redirect to auth page while saving the attempted url
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    return <>{children}</>;
} 