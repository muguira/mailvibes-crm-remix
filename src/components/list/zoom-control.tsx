
import { useState, useEffect } from 'react';
import { ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';

const ZOOM_LEVELS = ['50%', '75%', '90%', '100%', '125%', '150%', '200%'];
const DEFAULT_ZOOM = '100%';

interface ZoomControlProps {
  onZoomChange?: (zoom: string) => void;
  currentZoom?: string;
}

export function ZoomControl({ onZoomChange, currentZoom = DEFAULT_ZOOM }: ZoomControlProps) {
  const [zoomLevel, setZoomLevel] = useState<string>(currentZoom);
  const [showZoomOptions, setShowZoomOptions] = useState<boolean>(false);
  
  // Update internal state when prop changes
  useEffect(() => {
    if (currentZoom) {
      setZoomLevel(currentZoom);
    }
  }, [currentZoom]);
  
  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      const newZoom = ZOOM_LEVELS[currentIndex + 1];
      setZoomLevel(newZoom);
      if (onZoomChange) onZoomChange(newZoom);
    }
  };
  
  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex > 0) {
      const newZoom = ZOOM_LEVELS[currentIndex - 1];
      setZoomLevel(newZoom);
      if (onZoomChange) onZoomChange(newZoom);
    }
  };
  
  const handleZoomSelect = (level: string) => {
    setZoomLevel(level);
    setShowZoomOptions(false);
    if (onZoomChange) onZoomChange(level);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    if (showZoomOptions) {
      const handleClickOutside = (e: MouseEvent) => {
        setShowZoomOptions(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showZoomOptions]);

  return (
    <div className="zoom-controls">
      <button 
        className="zoom-button"
        onClick={handleZoomOut}
        disabled={zoomLevel === ZOOM_LEVELS[0]}
        title="Zoom out"
      >
        <ZoomOut size={16} />
      </button>
      
      <div className="zoom-level relative">
        <div 
          className="zoom-level-value flex items-center gap-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setShowZoomOptions(!showZoomOptions);
          }}
        >
          <span>{zoomLevel}</span>
          <ChevronDown size={14} />
        </div>
        
        {showZoomOptions && (
          <div 
            className="zoom-popover"
            onClick={(e) => e.stopPropagation()}
          >
            {ZOOM_LEVELS.map(level => (
              <div 
                key={level} 
                className={`zoom-option ${level === zoomLevel ? 'active' : ''}`}
                onClick={() => handleZoomSelect(level)}
              >
                {level}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <button 
        className="zoom-button"
        onClick={handleZoomIn}
        disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
        title="Zoom in"
      >
        <ZoomIn size={16} />
      </button>
    </div>
  );
}
