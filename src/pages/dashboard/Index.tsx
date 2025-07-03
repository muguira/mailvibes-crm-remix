
import { TopNavbar } from "@/components/layout/top-navbar";
import { TasksPanel } from "@/components/home/tasks-panel";
import { FeedPanel } from "@/components/home/feed-panel";
import { WelcomeHeader } from "@/components/home/welcome-header";
import { useAuth } from "@/components/auth";
import { Navigate } from 'react-router-dom';

const Index = () => {
  const { user, loading } = useAuth();

  // Show loading indicator while checking authentication
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to auth page if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-light/20">
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNavbar />
        
        {/* Welcome Header Section - Not sticky */}
        <div className="overflow-auto flex-1">
          <WelcomeHeader />
          
          {/* Content Section - Positioned very close to My Week bar */}
          <div className="px-6 -mt-14">
            <div className="flex flex-col md:flex-row gap-6 h-full">
              {/* Left Column - Tasks - Fixed width */}
              <div className="w-full md:w-[570px] flex-shrink-0">
                <TasksPanel />
              </div>

              {/* Right Column - Feed - Takes remaining space */}
              <div className="w-full flex-1">
                <FeedPanel />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
