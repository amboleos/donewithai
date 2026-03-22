"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// ============================================
// Ripple Effect Hook
// ============================================

function useRipple() {
  const [ripples, setRipples] = React.useState<Array<{
    id: number
    x: number
    y: number
    size: number
  }>>([])

  const onClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2.5
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    const newRipple = {
      id: Date.now() + Math.random(),
      x,
      y,
      size,
    }

    setRipples(prev => [...prev, newRipple])

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id))
    }, 600)
  }, [])

  return { ripples, onClick }
}

// ============================================
// Button Variants
// ============================================

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/90 hover:shadow-lg",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        // New: Glow variant with animated shadow
        glow:
          "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] hover:bg-primary/90",
        // New: AI glow variant
        "glow-ai":
          "bg-[oklch(0.60_0.24_195)] text-white shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] hover:bg-[oklch(0.55_0.24_195)]",
        // New: Accent glow variant
        "glow-accent":
          "bg-[oklch(0.65_0.22_45)] text-white shadow-[0_0_20px_rgba(251,146,60,0.4)] hover:shadow-[0_0_30px_rgba(251,146,60,0.6)] hover:bg-[oklch(0.60_0.22_45)]",
        // New: Gradient variant
        gradient:
          "bg-gradient-to-r from-[oklch(0.58_0.20_285)] to-[oklch(0.65_0.22_45)] text-white hover:from-[oklch(0.53_0.20_285)] hover:to-[oklch(0.60_0.22_45)] hover:shadow-lg",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xl: "h-10 gap-2 px-4 text-base [&_svg:not([class*='size-'])]:size-5",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
      ripple: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        ripple: true,
        className: "",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      ripple: false,
    },
  }
)

export interface ButtonProps
  extends ButtonPrimitive.Props,
    VariantProps<typeof buttonVariants> {
  ripple?: boolean
}

// ============================================
// Ripple Animation Component
// ============================================

function RippleEffect({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <span
      className="absolute pointer-events-none rounded-full bg-current opacity-50 animate-ripple"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
      }}
    />
  )
}

// ============================================
// Button Component
// ============================================

function Button({
  className,
  variant = "default",
  size = "default",
  ripple = false,
  onClick,
  ...props
}: ButtonProps) {
  const { ripples, onClick: onRippleClick } = useRipple()

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple) {
        onRippleClick(e)
      }
      onClick?.(e as any)
    },
    [ripple, onClick, onRippleClick]
  )

  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      className={cn(buttonVariants({ variant, size, ripple }), className)}
      onClick={handleClick}
      {...props}
    >
      {props.children}
      {ripple && ripples.map(r => (
        <RippleEffect key={r.id} x={r.x} y={r.y} size={r.size} />
      ))}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
