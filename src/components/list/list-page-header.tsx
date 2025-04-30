
import React from "react";

interface ListPageHeaderProps {
  title: string;
}

export function ListPageHeader({ title }: ListPageHeaderProps) {
  return (
    <div className="bg-white border-b border-slate-light/30 p-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-medium text-slate-dark">
          {title}
        </h1>
      </div>
    </div>
  );
}
