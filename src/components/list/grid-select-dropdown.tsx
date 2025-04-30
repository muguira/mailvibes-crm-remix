
interface SelectDropdownProps {
  isOpen: boolean;
  position: { top: number; left: number };
  options: string[];
  onSelect: (value: string) => void;
}

export function GridSelectDropdown({
  isOpen,
  position,
  options,
  onSelect
}: SelectDropdownProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed bg-white shadow-lg rounded-md z-50 border border-slate-200 option-menu"
      style={{
        top: position.top + 'px',
        left: position.left + 'px',
      }}
    >
      <div className="py-1">
        {options.map((option) => (
          <button
            key={option}
            className="option-item w-full text-left px-4 py-2"
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
