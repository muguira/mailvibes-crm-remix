import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth";
import { ActivityProvider } from "@/contexts/ActivityContext";
import { PrivateRoute } from "@/components/PrivateRoute";
import { AuthenticatedRedirect } from "@/components/AuthenticatedRedirect";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import Index from "@/pages/dashboard/Index";
import Lists from "@/pages/dashboard/Lists";
import NewGrid from "@/pages/NewGrid";
import Leads from "@/pages/dashboard/Leads";
import Opportunities from "@/pages/dashboard/Opportunities";
import Reports from "@/pages/dashboard/Reports";
import Profile from "@/pages/dashboard/Profile";
import NotFound from "@/pages/NotFound";
import Auth from "@/pages/Auth";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import ContactProfile from "@/pages/dashboard/ContactProfile";
import StreamView from "@/pages/dashboard/StreamView"; // Import the new StreamView page
import Integrations from "@/pages/dashboard/Integrations";
import Imports from "@/pages/dashboard/Imports";
import Settings from "@/pages/dashboard/Settings";
import OrganizationUsers from "@/pages/dashboard/OrganizationUsers";
import OrganizationGeneral from "@/pages/dashboard/OrganizationGeneral";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AccountProperties from "@/pages/dashboard/AccountProperties";
import { PasswordRecoveryHandler } from "@/components/PasswordRecoveryHandler";
import Landing from "@/pages/Landing";
import Import from "@/pages/Import";
import GmailImport from "@/pages/dashboard/GmailImport";
import GmailDashboard from "@/pages/dashboard/GmailDashboard";
import DeletedContacts from "@/pages/dashboard/DeletedContacts";
import { AcceptInvitation } from "@/pages/AcceptInvitation";
import { useRadixPointerEventsFix } from "@/hooks/use-radix-pointer-events-fix";
import PerformanceTestingDashboard from "@/components/debug/PerformanceTestingDashboard";
import { PendingInvitationsHandler } from "@/components/settings/PendingInvitationsHandler";
import { useEffect, useState } from "react";
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
  // Fix for Radix UI pointer-events: none bug in production
  useRadixPointerEventsFix();

  // Performance dashboard state
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);

  // Global keyboard shortcut for performance dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setShowPerformanceDashboard(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ErrorBoundary sectionName="Application">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <AuthProvider>
            <ActivityProvider>
              {/* Temporarily disabled to fix infinite loop - will re-enable after testing */}
              {/* <PendingInvitationsHandler /> */}
              <Router>
              <div className="h-screen w-full font-proxima">
                <PasswordRecoveryHandler />
                <Routes>
                  <Route path="/auth" element={<AuthenticatedRedirect><Auth /></AuthenticatedRedirect>} />
                  <Route path="/auth/login" element={<AuthenticatedRedirect><SignIn /></AuthenticatedRedirect>} />
                  <Route path="/auth/register" element={<AuthenticatedRedirect><SignUp /></AuthenticatedRedirect>} />
                  <Route path="/auth/forgot-password" element={<AuthenticatedRedirect><ForgotPassword /></AuthenticatedRedirect>} />
                  <Route path="/auth/reset-password" element={<ResetPassword />} />
                  <Route path="/landing" element={<Landing />} />
                  <Route path="/accept-invitation/:invitationId" element={<AcceptInvitation />} />
                  <Route path="/accept-invitation" element={<AcceptInvitation />} />
                  <Route path="/" element={<PrivateRoute><Index /></PrivateRoute>} />
                  <Route path="/lists/:listId?" element={<PrivateRoute><Lists /></PrivateRoute>} />
                  <Route path="/new-grid" element={<PrivateRoute><NewGrid /></PrivateRoute>} />
                  <Route path="/leads" element={<PrivateRoute><Leads /></PrivateRoute>} />
                  <Route path="/opportunities" element={<PrivateRoute><Opportunities /></PrivateRoute>} />
                  <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
                  <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                  <Route path="/contact/:id" element={<PrivateRoute><ContactProfile /></PrivateRoute>} />
                  <Route path="/stream" element={<PrivateRoute><StreamView /></PrivateRoute>} />
                  <Route path="/stream-view/:id" element={<PrivateRoute><StreamView /></PrivateRoute>} />
                  <Route path="/import" element={<PrivateRoute><Import /></PrivateRoute>} />
                  <Route path="/gmail-import" element={<PrivateRoute><GmailImport /></PrivateRoute>} />
                  <Route path="/deleted-contacts" element={<PrivateRoute><DeletedContacts /></PrivateRoute>} />
                  <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                  <Route path="/settings/organization/general" element={<PrivateRoute><OrganizationGeneral /></PrivateRoute>} />
                  <Route path="/settings/organization/users" element={<PrivateRoute><OrganizationUsers /></PrivateRoute>} />
                  <Route path="/settings/integrations" element={<PrivateRoute><Integrations /></PrivateRoute>} />
                  <Route path="/settings/integrations/gmail-dashboard" element={<PrivateRoute><GmailDashboard /></PrivateRoute>} />
                  <Route path="/settings/imports" element={<PrivateRoute><Imports /></PrivateRoute>} />
                  <Route path="/settings/account-properties" element={<PrivateRoute><AccountProperties /></PrivateRoute>} />
                  <Route path="/integrations" element={<PrivateRoute><Integrations /></PrivateRoute>} />
                  <Route path="/users" element={<PrivateRoute><OrganizationUsers /></PrivateRoute>} />
                  
                  {/* Temporary test route removed - Gmail hooks are now stable */}
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Toaster />
                <SonnerToaster 
                  position="top-center"
                  toastOptions={{
                    style: {
                      background: '#fff',
                      color: '#333',
                      border: '1px solid #e5e7eb',
                    },
                  }}
                  className="sm:!top-4 !top-16"
                  gap={16}
                  duration={4000}
                  visibleToasts={3}
                />
              </div>
            </Router>
          </ActivityProvider>
        </AuthProvider>
        
        {/* Performance Testing Dashboard - Global access via Ctrl+Shift+P */}
        {showPerformanceDashboard && (
          <PerformanceTestingDashboard 
            isVisible={showPerformanceDashboard}
            onClose={() => setShowPerformanceDashboard(false)}
          />
        )}
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
