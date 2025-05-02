import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FilterPanel() {
  const panels = [
    { title: "Filters", height: 80 },
    { title: "Tasks", height: 100 },
    { title: "Contact Sharing", height: 90 }
  ];
  
  return (
    <div className="space-y-2">
      {panels.map((panel, index) => (
        <Card key={index} className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{panel.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-medium mb-2">
              Coming soon
            </p>
            <Skeleton className={`w-full h-${panel.height / 4}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
