
import React, { useState } from 'react';
import { ColorPicker } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Define color palette for quick selection
const colorPalette = [
  // Greens
  '#4ADE80', '#22C55E', '#16A34A',
  // Blues
  '#60A5FA', '#3B82F6', '#2563EB',
  // Purples
  '#A78BFA', '#8B5CF6', '#7C3AED',
  // Pinks
  '#F472B6', '#EC4899', '#DB2777',
  // Oranges
  '#FB923C', '#F97316', '#EA580C',
  // Yellows
  '#FBBF24', '#F59E0B', '#D97706',
  // Reds
  '#FB7185', '#F43F5E', '#E11D48',
  // Grays
  '#A1A1AA', '#71717A', '#52525B',
];

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export function StatusColorPicker({ color, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentColor, setCurrentColor] = useState(color || '#4ADE80');
  
  const handleColorChange = (newColor: string) => {
    setCurrentColor(newColor);
    onChange(newColor);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className="flex items-center gap-1 text-xs hover:bg-slate-100 p-1 rounded"
          style={{ color: currentColor }}
          title="Change color"
        >
          <ColorPicker size={14} />
          <span className="hidden sm:inline">Color</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="mb-3">
          <label htmlFor="custom-color" className="text-sm font-medium">
            Custom Color
          </label>
          <div className="flex mt-1">
            <input
              id="custom-color"
              type="color"
              value={currentColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-full h-8 cursor-pointer"
            />
          </div>
        </div>
        
        <div className="mb-2">
          <label className="text-sm font-medium">Preset Colors</label>
          <div className="grid grid-cols-6 gap-2 mt-1">
            {colorPalette.map((paletteColor) => (
              <button
                key={paletteColor}
                className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                style={{ backgroundColor: paletteColor }}
                onClick={() => handleColorChange(paletteColor)}
                aria-label={`Select color ${paletteColor}`}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
