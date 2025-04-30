
interface StatusCellProps {
  value: string;
  colors?: Record<string, string>;
}

export function StatusCell({ value, colors }: StatusCellProps) {
  if (!value) return null;

  // Default softer colors based on status values
  const defaultColors = {
    'Deal Won': 'rgba(52, 211, 153, 0.2)',
    'Qualified': 'rgba(96, 165, 250, 0.2)',
    'In Procurement': 'rgba(217, 119, 6, 0.2)',
    'Contract Sent': 'rgba(234, 179, 8, 0.2)',
    'Discovered': 'rgba(249, 115, 22, 0.2)',
    'Not Now': 'rgba(239, 68, 68, 0.2)',
    'New': 'rgba(168, 85, 247, 0.2)'
  };

  const defaultTextColors = {
    'Deal Won': '#22c55e',
    'Qualified': '#3b82f6',
    'In Procurement': '#d97706',
    'Contract Sent': '#eab308',
    'Discovered': '#f97316',
    'Not Now': '#ef4444',
    'New': '#a855f7'
  };

  let backgroundColor = '';
  let textColor = '';

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
    // Use default soft colors
    backgroundColor = defaultColors[value] || 'rgba(148, 163, 184, 0.2)';
    textColor = defaultTextColors[value] || '#64748b';
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
