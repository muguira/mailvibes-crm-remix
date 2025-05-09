import { TopNavbar } from "@/components/layout/top-navbar";
import { TasksPanel } from "@/components/home/tasks-panel";
import { FeedPanel } from "@/components/home/feed-panel";
import { WelcomeHeader } from "@/components/home/welcome-header";

const Index = () => {
  return (
    <div className="flex h-screen bg-slate-light/20">
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNavbar />
        
        {/* Welcome Header Section - Not sticky */}
        <div className="overflow-auto flex-1">
          <WelcomeHeader 
            username="Andres"
            taskCount={2} 
            collaboratorCount={0}
          />
          
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
