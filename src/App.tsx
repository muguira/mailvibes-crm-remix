import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { AuthProvider } from "@/components/auth";
import { ActivityProvider } from "@/contexts/ActivityContext";
import { PrivateRoute } from "@/components/PrivateRoute";
import { AuthenticatedRedirect } from "@/components/AuthenticatedRedirect";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import Index from "@/pages/dashboard/Index";
import Lists from "@/pages/dashboard/Lists";
import NewGrid from "@/pages/NewGrid";
import Leads from "@/pages/dashboard/Leads";
import Reports from "@/pages/dashboard/Reports";
import Profile from "@/pages/dashboard/Profile";
import NotFound from "@/pages/NotFound";
import Auth from "@/pages/Auth";
import ContactProfile from "@/pages/dashboard/ContactProfile";
import StreamView from "@/pages/dashboard/StreamView"; // Import the new StreamView page
import Landing from "@/pages/Landing";
import Import from "@/pages/Import";
import DeletedContacts from "@/pages/dashboard/DeletedContacts";
import { useRadixPointerEventsFix } from "@/hooks/use-radix-pointer-events-fix";
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

  return (
    <ErrorBoundary sectionName="Application">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ActivityProvider>
            <Router>
              <div className="h-screen w-full font-proxima">
                <Routes>
                  <Route path="/auth" element={<AuthenticatedRedirect><Auth /></AuthenticatedRedirect>} />
                  <Route path="/landing" element={<Landing />} />
                  <Route path="/" element={<PrivateRoute><Index /></PrivateRoute>} />
                  <Route path="/lists/:listId?" element={<PrivateRoute><Lists /></PrivateRoute>} />
                  <Route path="/new-grid" element={<PrivateRoute><NewGrid /></PrivateRoute>} />
                  <Route path="/leads" element={<PrivateRoute><Leads /></PrivateRoute>} />
                  <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
                  <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                  <Route path="/contact/:id" element={<PrivateRoute><ContactProfile /></PrivateRoute>} />
                  <Route path="/stream" element={<PrivateRoute><StreamView /></PrivateRoute>} />
                  <Route path="/stream-view/:id" element={<PrivateRoute><StreamView /></PrivateRoute>} />
                  <Route path="/import" element={<PrivateRoute><Import /></PrivateRoute>} />
                  <Route path="/deleted-contacts" element={<PrivateRoute><DeletedContacts /></PrivateRoute>} />
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
                />
              </div>
            </Router>
          </ActivityProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
