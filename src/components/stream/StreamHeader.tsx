import React from 'react';
import { useIsMobile } from "@/hooks/use-mobile";

export default function StreamHeader() {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col w-full mb-4">
      {!isMobile && <h1 className="text-2xl font-semibold">Contact Details</h1>}
    </div>
  );
}
