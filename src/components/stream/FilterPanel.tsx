
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FilterPanel() {
  return (
    <div className="space-y-2">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-medium mb-2">
            Coming soon
          </p>
          <Skeleton className="w-full h-[25px]" />
        </CardContent>
      </Card>
    </div>
  );
}
