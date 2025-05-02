
import React from 'react';
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface TabStripProps {
  className?: string;
}

export default function TabStrip({ className = '' }: TabStripProps) {
  return (
    <div className={`w-full ${className}`}>
      <Tabs defaultValue="stream" className="w-full">
        <TabsList className="mx-auto w-fit">
          <TabsTrigger value="stream">Stream</TabsTrigger>
          <TabsTrigger value="associations">Associations</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stream" className="py-4 text-muted-foreground">
          Stream tab content coming soon...
        </TabsContent>
        <TabsContent value="associations" className="py-4 text-muted-foreground">
          Associations tab content coming soon...
        </TabsContent>
        <TabsContent value="about" className="py-4 text-muted-foreground">
          About tab content coming soon...
        </TabsContent>
      </Tabs>
    </div>
  );
}
