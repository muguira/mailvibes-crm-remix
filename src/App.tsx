import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
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
      <AuthProvider>
        <Router>
          <div className="h-screen w-full font-proxima">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Index />} />
              <Route path="/lists" element={<Navigate to="/leads" replace />} />
              <Route path="/new-grid" element={<Navigate to="/leads" replace />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/contact/:id" element={<ContactProfile />} />
              <Route path="/stream-view/:recordId?" element={<StreamView />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
