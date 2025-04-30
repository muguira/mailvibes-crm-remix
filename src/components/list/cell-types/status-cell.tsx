
interface StatusCellProps {
  value: string;
  colors?: Record<string, string>;
}

export function StatusCell({ value, colors }: StatusCellProps) {
  if (!value) return null;

  let backgroundColor = '';
  let textColor = '#ffffff';

  // Use custom colors if provided
  if (colors && colors[value]) {
    backgroundColor = colors[value];
    
    // Calculate if text should be black or white based on background color brightness
    // Simple calculation to determine if background is light or dark
    const hex = colors[value].replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    textColor = brightness > 128 ? '#000000' : '#ffffff';
  } else {
    // Default colors based on predefined statuses
    backgroundColor = 
      value === 'Deal Won' ? '#34D399' : 
      value === 'Qualified' ? '#60A5FA' : 
      value === 'In Procurement' ? '#F59E0B' :
      value === 'Contract Sent' ? '#8B5CF6' :
      value === 'Discovered' ? '#A78BFA' :
      '#94A3B8';  // default gray for unknown statuses
  }

  return (
    <span className="status-pill" style={{ 
      backgroundColor, 
      color: textColor 
    }}>
      {value}
    </span>
  );
}
