import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/auth";

interface PrivateRouteProps {
    children: React.ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
    const { user, loading, isInitialized } = useAuth();

    // Solo mostramos el loader durante la inicialización inicial
    if (!isInitialized && loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Si no hay usuario después de la inicialización, redirigimos
    if (isInitialized && !user) {
        return <Navigate to="/auth/login" />;
    }

    // Si hay usuario o estamos en proceso de carga post-inicialización, mostramos el contenido
    return <>{children}</>;
} 