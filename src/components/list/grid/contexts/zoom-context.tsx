
import { createContext, useContext, useState, ReactNode } from "react";

type ZoomLevel = "75%" | "100%" | "125%" | "150%" | "175%" | "200%";

interface ZoomContextType {
  zoomLevel: ZoomLevel;
  setZoomLevel: (level: ZoomLevel) => void;
  gridStyle: React.CSSProperties;
}

const ZoomContext = createContext<ZoomContextType>({
  zoomLevel: "100%",
  setZoomLevel: () => {},
  gridStyle: {}
});

export const useZoom = () => useContext(ZoomContext);

export const ZoomProvider = ({ children }: { children: ReactNode }) => {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("100%");
  
  // Calculate zoom factor and variables for the grid
  const getZoomFactor = (): number => {
    switch(zoomLevel) {
      case "75%": return 0.75;
      case "125%": return 1.25;
      case "150%": return 1.50;
      case "175%": return 1.75;
      case "200%": return 2.0;
      default: return 1.0; // 100%
    }
  };
  
  const zoomFactor = getZoomFactor();
  const baseRowHeight = 24; // Base row height in pixels
  const baseCellMinWidth = 150; // Base minimum cell width
  
  const gridStyle: React.CSSProperties = {
    // Using CSS variables for easier scaling
    // Use the correct TypeScript syntax for CSS variables
    "--row-height": `${baseRowHeight * zoomFactor}px`,
    "--cell-min-width": `${baseCellMinWidth * zoomFactor}px`,
    fontSize: `${14 * zoomFactor}px`,
  } as React.CSSProperties; // Add type assertion to fix TypeScript error
  
  return (
    <ZoomContext.Provider value={{ zoomLevel, setZoomLevel, gridStyle }}>
      {children}
    </ZoomContext.Provider>
  );
};
