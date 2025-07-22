import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileEdit, CalendarPlus, Activity } from 'lucide-react'
import AboutTab from './AboutTab'

interface MobileTabViewProps {
  contact?: {
    id: string
    name?: string
    email?: string
    phone?: string
    owner?: string
    lastContacted?: string
    lifecycleStage?: string
    source?: string
    company?: string
    industry?: string
    jobTitle?: string
    address?: string
    description?: string
    facebook?: string
    instagram?: string
    linkedin?: string
    twitter?: string
    website?: string
    associatedDeals?: string
    primaryLocation?: string
    status?: string
    data?: Record<string, any>
    activities?: Array<any>
    [key: string]: any
  }
}

export default function MobileTabView({ contact }: MobileTabViewProps) {
  // Mobile activity samples - a subset of the main timeline
  const mobileSamples = contact?.activities?.slice(0, 3) || []

  return (
    <div className="lg:hidden w-full">
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="w-full border-b border-slate-light/30 rounded-none bg-white">
          <TabsTrigger value="activity" className="flex-1">
            Activity
          </TabsTrigger>
          <TabsTrigger value="associations" className="flex-1">
            Associations
          </TabsTrigger>
          <TabsTrigger value="about" className="flex-1">
            About
          </TabsTrigger>
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

            {/* New: Activity feed (mobile) */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-slate-dark mb-2">Recent Activity</h3>
              <div className="space-y-3">
                {mobileSamples.length > 0 ? (
                  mobileSamples.map((activity, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm border border-slate-light/30 p-3">
                      <p className="text-sm text-teal-primary font-medium">
                        {activity.summary || activity.content || 'Activity item'}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-light/30 p-3">
                    <p className="text-sm text-slate-medium">No recent activities</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="associations" className="p-0 m-0">
          <div className="p-4">
            <p className="text-slate-medium">No associations found</p>
          </div>
        </TabsContent>

        <TabsContent value="about" className="p-0 m-0">
          <AboutTab contact={contact} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
