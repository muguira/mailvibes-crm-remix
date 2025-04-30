
import { useState } from 'react';
import { ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';

const ZOOM_LEVELS = ['50%', '75%', '90%', '100%', '125%', '150%', '200%'];
const DEFAULT_ZOOM = '100%';

export function ZoomControl() {
  const [zoomLevel, setZoomLevel] = useState<string>(DEFAULT_ZOOM);
  const [showZoomOptions, setShowZoomOptions] = useState<boolean>(false);
  
  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
    }
  };
  
  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
    }
  };
  
  const handleZoomSelect = (level: string) => {
    setZoomLevel(level);
    setShowZoomOptions(false);
  };

  return (
    <div className="zoom-controls">
      <button 
        className="zoom-button"
        onClick={handleZoomOut}
        disabled={zoomLevel === ZOOM_LEVELS[0]}
      >
        <ZoomOut size={16} />
      </button>
      
      <div className="zoom-level">
        <div 
          className="zoom-level-value flex items-center gap-1"
          onClick={() => setShowZoomOptions(!showZoomOptions)}
        >
          <span>{zoomLevel}</span>
          <ChevronDown size={14} />
        </div>
        
        {showZoomOptions && (
          <div className="zoom-popover">
            {ZOOM_LEVELS.map(level => (
              <div 
                key={level} 
                className="zoom-option"
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
      >
        <ZoomIn size={16} />
      </button>
    </div>
  );
}
