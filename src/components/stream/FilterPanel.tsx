
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function FilterPanel() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Filters / Tasks / Sharing</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-medium">
          Filter options and task management will appear here in future updates.
        </p>
      </CardContent>
    </Card>
  );
}
