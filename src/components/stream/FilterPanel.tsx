
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactTasksPanel } from "./ContactTasksPanel";

interface FilterPanelProps {
  contact?: {
    id: string;
    name?: string;
    [key: string]: any;
  };
}

export default function FilterPanel({ contact }: FilterPanelProps) {
  return (
    <div className="space-y-2">
      {/* Tasks Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Tasks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {contact?.id ? (
            <div className="h-[300px]">
              <ContactTasksPanel 
                contactId={contact.id} 
                contactName={contact.name}
              />
            </div>
          ) : (
            <div className="p-4">
              <p className="text-sm text-slate-medium mb-2">
                Select a contact to view tasks
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Sharing Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Contact Sharing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-medium mb-2">
            Coming soon
          </p>
          <Skeleton className="w-full h-20" />
        </CardContent>
      </Card>
    </div>
  );
}
