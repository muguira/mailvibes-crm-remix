import * as React from "react"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
  isActive?: boolean
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
  separator?: React.ReactNode
}

const Breadcrumb = React.forwardRef<
  HTMLElement,
  BreadcrumbProps
>(({ items, className, separator = <ChevronRight className="h-4 w-4" />, ...props }, ref) => {
  return (
    <nav
      ref={ref}
      aria-label="breadcrumb"
      className={cn("flex", className)}
      {...props}
    >
      <ol className="flex items-center space-x-1 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-muted-foreground/50">
                {separator}
              </span>
            )}
            {item.href || item.onClick ? (
              <button
                onClick={item.onClick || (() => item.href && (window.location.href = item.href))}
                className={cn(
                  "hover:text-foreground transition-colors",
                  item.isActive && "text-foreground font-medium"
                )}
              >
                {item.label}
              </button>
            ) : (
              <span
                className={cn(
                  item.isActive && "text-foreground font-medium"
                )}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
})
Breadcrumb.displayName = "Breadcrumb"

export { Breadcrumb }
