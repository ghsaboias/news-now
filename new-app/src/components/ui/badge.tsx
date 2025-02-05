import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-success-100 text-gray-50",
        secondary: "bg-gray-200 text-gray-800",
        success: "bg-success-100 text-black",
        warning: "bg-warning-100 text-black",
        error: "bg-error-100 text-black",
        outline: "border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200",
        ghost: "bg-transparent text-gray-800 dark:text-gray-200",
      },
      size: {
        sm: "text-xs px-2 py-0.5",
        default: "text-sm px-2.5 py-1",
        lg: "text-base px-3 py-1.5",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({
  className,
  variant,
  size,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
