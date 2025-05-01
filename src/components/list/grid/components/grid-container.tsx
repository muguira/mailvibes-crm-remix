
import { ReactNode } from "react";
import { ZoomProvider, useZoom } from "../contexts/zoom-context";

interface GridContainerProps {
  children: ReactNode;
}

export function GridContainer({ children }: GridContainerProps) {
  // Access zoom context
  const { gridStyle } = useZoom();
  
  return (
    <div 
      className="h-full flex flex-col full-screen-grid" 
      style={gridStyle}
    >
      {children}
    </div>
  );
}
