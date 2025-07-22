import { ExternalLink } from 'lucide-react'
import { isValidUrl } from '../grid-utils'

interface UrlCellProps {
  value: string
}

export function UrlCell({ value }: UrlCellProps) {
  if (!value) return <span></span>

  return (
    <div className="flex items-center text-teal-primary hover:underline cursor-pointer">
      <span>{value}</span>
      <ExternalLink size={14} className="ml-1" />
    </div>
  )
}
