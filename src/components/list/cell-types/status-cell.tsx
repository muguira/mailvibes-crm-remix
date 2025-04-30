
interface StatusCellProps {
  value: string;
  colors?: Record<string, string>;
}

export function StatusCell({ value, colors }: StatusCellProps) {
  if (!value) return null;

  // Get the color from the column definition if available, otherwise use defaults
  let backgroundColor;
  let textColor = 'text-white';
  
  if (colors && colors[value]) {
    backgroundColor = colors[value];
    
    // Automatically determine text color based on background color lightness
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };
    
    // Calculate the luminance of the background color
    const rgb = hexToRgb(colors[value]);
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    
    // Use dark text on light backgrounds
    if (luminance > 0.5) {
      textColor = 'text-slate-dark';
    }
  } else {
    // Default color mapping
    backgroundColor = value === 'Deal Won' ? '#4ADE80' : 
                  value === 'Qualified' ? '#3B82F6' : 
                  value === 'In Procurement' ? '#A78BFA' :
                  value === 'Contract Sent' ? '#F97316' :
                  value === 'Discovered' ? '#F59E0B' :
                  value === 'Not Now' ? '#A1A1AA' :
                  '#60A5FA';
  }

  return (
    <span 
      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${textColor}`} 
      style={{ backgroundColor }}
    >
      {value}
    </span>
  );
}
