
interface StatusCellProps {
  value: string;
}

export function StatusCell({ value }: StatusCellProps) {
  if (!value) return null;

  return (
    <span className={`status-pill ${
      value === 'Deal Won' ? 'status-won' : 
      value === 'Qualified' ? 'status-qualified' : 
      value === 'In Procurement' ? 'status-procurement' :
      value === 'Contract Sent' ? 'status-sent' :
      value === 'Discovered' ? 'status-discovered' :
      'status-other'
    }`}>
      {value}
    </span>
  );
}
