
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileEdit, CalendarPlus, Activity } from 'lucide-react';
import AssociationsTab from './AssociationsTab';
import AboutTab from './AboutTab';

export default function MobileTabView() {
  return (
    <div className="lg:hidden w-full">
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="w-full border-b border-slate-light/30 rounded-none bg-white">
          <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
          <TabsTrigger value="associations" className="flex-1">Associations</TabsTrigger>
          <TabsTrigger value="about" className="flex-1">About</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="p-0 m-0">
          {/* Activity Filter */}
          <div className="px-4 py-3">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Filter Activity (18/18) ▾" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities (18/18)</SelectItem>
                <SelectItem value="calls">Calls</SelectItem>
                <SelectItem value="emails">Emails</SelectItem>
                <SelectItem value="tasks">Tasks</SelectItem>
              </SelectContent>
            </Select>

            {/* Quick Action Buttons - Updated to only show 3 buttons in specified order */}
            <div className="flex items-center justify-around mt-4">
              <button className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border border-slate-light/30 hover:bg-slate-light/10 transition-colors">
                  <FileEdit className="h-6 w-6 text-teal-primary" />
                </div>
                <span className="text-xs text-slate-dark">Add Note</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border border-slate-light/30 hover:bg-slate-light/10 transition-colors">
                  <CalendarPlus className="h-6 w-6 text-teal-primary" />
                </div>
                <span className="text-xs text-slate-dark">Create Task</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border border-slate-light/30 hover:bg-slate-light/10 transition-colors">
                  <Activity className="h-6 w-6 text-teal-primary" />
                </div>
                <span className="text-xs text-slate-dark">Log Activity</span>
              </button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="associations" className="p-0 m-0">
          <AssociationsTab />
        </TabsContent>
        
        <TabsContent value="about" className="p-0 m-0">
          <AboutTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
