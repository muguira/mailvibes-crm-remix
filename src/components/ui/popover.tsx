import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal container={typeof window !== 'undefined' ? document.body : undefined}>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-[9999] w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

// Custom popover content that can be positioned absolutely
interface AbsolutePopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: { top: number; left: number };
  onClose?: () => void;
  children: React.ReactNode;
}

const AbsolutePopoverContent = React.forwardRef<
  HTMLDivElement,
  AbsolutePopoverContentProps
>(({ className, position, children, ...props }, ref) => (
  <div
    ref={ref}

    className={cn(
      "fixed bg-white rounded-md border border-slate-200 shadow-lg z-[9999] popover-element",
      className
    )}
    style={{
      top: position?.top !== undefined ? `${position.top}px` : undefined,
      left: position?.left !== undefined ? `${position.left}px` : undefined,
    }}
    {...props}
  >
    {children}
  </div>
))
AbsolutePopoverContent.displayName = "AbsolutePopoverContent"

export { Popover, PopoverTrigger, PopoverContent, AbsolutePopoverContent }
