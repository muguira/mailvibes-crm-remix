import { ButtonHTMLAttributes, forwardRef } from 'react'
import { VariantProps, cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-primary disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-teal-primary text-white hover:bg-teal-dark',
        destructive: 'bg-coral text-white hover:bg-coral/90',
        outline: 'border border-input bg-background hover:bg-slate-light/30',
        secondary: 'bg-navy-deep text-white hover:bg-navy-dark',
        ghost: 'hover:bg-slate-light/30',
        link: 'text-teal-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2', // Medium (size1)
        sm: 'h-8 px-3 py-1 text-xs', // Small (size0)
        lg: 'h-12 px-6 py-3', // Large (size2)
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

const CustomButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading = false, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  },
)

CustomButton.displayName = 'CustomButton'

export { CustomButton }
