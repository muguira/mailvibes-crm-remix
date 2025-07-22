interface TextCellProps {
  value: string | number
}

export function TextCell({ value }: TextCellProps) {
  return <span>{value}</span>
}
