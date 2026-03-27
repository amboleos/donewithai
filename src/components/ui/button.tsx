"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// ============================================
   // Button Variants - Neo-Brutalist Style
   // ============================================

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 font-semibold text-sm uppercase tracking-wider border-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary - Teal with brutal shadow
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--border)] [box-shadow:var(--shadow-brutal)] hover:translate-x-[2px] hover:translate-y-[2px] hover:[box-shadow:var(--shadow-brutal-sm)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
        // Secondary - Light background
        secondary:
          "bg-[var(--secondary)] text-[var(--secondary-foreground)] border-[var(--border)] [box-shadow:var(--shadow-brutal)] hover:translate-x-[2px] hover:translate-y-[2px] hover:[box-shadow:var(--shadow-brutal-sm)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
        // Outline - No fill
        outline:
          "bg-[var(--card)] text-[var(--foreground)] border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)] hover:bg-[var(--muted)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none",
        // Ghost - No border or shadow
        ghost:
          "bg-transparent text-[var(--foreground)] border-transparent hover:bg-[var(--muted)] hover:border-[var(--border)]",
        // Accent - Coral/Orange
        accent:
          "bg-[var(--accent)] text-[var(--accent-foreground)] border-[var(--border)] [box-shadow:var(--shadow-brutal-accent)] hover:translate-x-[2px] hover:translate-y-[2px] hover:[box-shadow:2px_2px_0px_0px_var(--accent)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
        // Destructive - Red
        destructive:
          "bg-[var(--destructive)] text-white border-[var(--border)] [box-shadow:var(--shadow-brutal)] hover:translate-x-[2px] hover:translate-y-[2px] hover:[box-shadow:var(--shadow-brutal-sm)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
        // Success - Green
        success:
          "bg-[var(--success)] text-white border-[var(--border)] [box-shadow:var(--shadow-brutal)] hover:translate-x-[2px] hover:translate-y-[2px] hover:[box-shadow:var(--shadow-brutal-sm)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
        // Link - No styling
        link:
          "border-transparent bg-transparent text-[var(--primary)] underline-offset-4 hover:underline shadow-none",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-3.5 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon:
          "h-10 w-10 p-0 [box-shadow:var(--shadow-brutal)] hover:translate-x-[2px] hover:translate-y-[2px] hover:[box-shadow:var(--shadow-brutal-sm)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
