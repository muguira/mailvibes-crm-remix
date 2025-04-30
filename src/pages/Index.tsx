
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { TasksPanel } from "@/components/home/tasks-panel";
import { FeedPanel } from "@/components/home/feed-panel";

const Index = () => {
  return (
    <div className="flex h-screen bg-slate-light/20">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="flex flex-col md:flex-row gap-6 h-full">
            {/* Left Column - Tasks */}
            <div className="w-full md:w-1/2">
              <TasksPanel />
            </div>
            
            {/* Right Column - Feed */}
            <div className="w-full md:w-1/2">
              <FeedPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
