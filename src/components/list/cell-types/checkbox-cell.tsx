import { Checkbox } from '@/components/ui/checkbox'

interface CheckboxCellProps {
  value: boolean
  onToggle: () => void
}

export function CheckboxCell({ value, onToggle }: CheckboxCellProps) {
  return (
    <div className="flex justify-center">
      <Checkbox checked={!!value} onCheckedChange={onToggle} />
    </div>
  )
}
