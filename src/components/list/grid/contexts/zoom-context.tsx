
import React, { createContext, useState, useContext, useMemo } from "react";

interface ZoomContextType {
  zoomLevel: string;
  setZoomLevel: (zoom: string) => void;
  gridStyle: React.CSSProperties;
}

const ZoomContext = createContext<ZoomContextType | null>(null);

export function ZoomProvider({ children }: { children: React.ReactNode }) {
  const [zoomLevel, setZoomLevel] = useState('100%');
  
  const gridStyle = useMemo(() => {
    // Remove the % sign and convert to a number
    const zoomPercentage = parseFloat(zoomLevel.replace('%', '')) / 100;
    
    return {
      // Scale font size to adjust content size
      fontSize: `${13 * zoomPercentage}px`,
      // Adjust row height based on zoom
      '--row-height': `${24 * zoomPercentage}px`,
      '--cell-min-width': `${150 * zoomPercentage}px`,
    } as React.CSSProperties;
  }, [zoomLevel]);
  
  return (
    <ZoomContext.Provider 
      value={{ 
        zoomLevel, 
        setZoomLevel,
        gridStyle 
      }}
    >
      {children}
    </ZoomContext.Provider>
  );
}

export function useZoom() {
  const context = useContext(ZoomContext);
  if (!context) {
    throw new Error("useZoom must be used within a ZoomProvider");
  }
  return context;
}
