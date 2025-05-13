import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { ActivityProvider } from "@/contexts/ActivityContext";
import { LoginTracker } from "@/components/activity/LoginTracker";
import { LogoutTracker } from "@/components/activity/LogoutTracker";
import { PrivateRoute } from "@/components/PrivateRoute";
import { AuthenticatedRedirect } from "@/components/AuthenticatedRedirect";
import Index from "@/pages/dashboard/Index";
import Leads from "@/pages/dashboard/Leads";
import Reports from "@/pages/dashboard/Reports";
import Profile from "@/pages/dashboard/Profile";
import NotFound from "@/pages/NotFound";
import Auth from "@/pages/Auth";
import ContactProfile from "@/pages/dashboard/ContactProfile";
import StreamView from "@/pages/dashboard/StreamView";
import Landing from "@/pages/Landing";
// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ActivityProvider>
        <AuthProvider>
          <LoginTracker />
          <LogoutTracker />
          <Router>
            <div className="h-screen w-full font-proxima">
              <Routes>
                <Route path="/" element={<AuthenticatedRedirect><Landing /></AuthenticatedRedirect>} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<PrivateRoute><Index /></PrivateRoute>} />
                <Route path="/lists" element={<PrivateRoute><Navigate to="/leads" replace /></PrivateRoute>} />
                <Route path="/new-grid" element={<PrivateRoute><Navigate to="/leads" replace /></PrivateRoute>} />
                <Route path="/leads" element={<PrivateRoute><Leads /></PrivateRoute>} />
                <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                <Route path="/contact/:id" element={<PrivateRoute><ContactProfile /></PrivateRoute>} />
                <Route path="/stream-view/:recordId?" element={<PrivateRoute><StreamView /></PrivateRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </div>
          </Router>
        </AuthProvider>
      </ActivityProvider>
    </QueryClientProvider>
  );
}

export default App;
