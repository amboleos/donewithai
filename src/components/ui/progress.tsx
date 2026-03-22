"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// ============================================
// Progress Variants
// ============================================

const progressVariants = cva(
  "relative w-full overflow-hidden transition-all duration-300",
  {
    variants: {
      size: {
        default: "h-2",
        sm: "h-1",
        lg: "h-3",
        xl: "h-4",
      },
      variant: {
        default: "rounded-full bg-slate-100 dark:bg-slate-800",
        rounded: "rounded-md bg-slate-100 dark:bg-slate-800",
        flat: "rounded-none bg-slate-100 dark:bg-slate-800",
        glow: "rounded-full bg-slate-100 dark:bg-slate-800 shadow-[0_0_10px_rgba(139,92,246,0.2)]",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

const indicatorVariants = cva(
  "h-full w-full transition-all duration-300 ease-out",
  {
    variants: {
      color: {
        default: "bg-indigo-600",
        primary: "bg-[oklch(0.58_0.20_285)]",
        ai: "bg-[oklch(0.60_0.24_195)]",
        success: "bg-[oklch(0.58_0.23_145)]",
        warning: "bg-[oklch(0.64_0.26_85)]",
        error: "bg-[oklch(0.58_0.27_25)]",
        gradient: "bg-gradient-to-r from-[oklch(0.58_0.20_285)] to-[oklch(0.65_0.22_45)]",
        "gradient-ai": "bg-gradient-to-r from-[oklch(0.70_0.20_195)] to-[oklch(0.60_0.24_195)]",
      },
      animated: {
        true: "relative overflow-hidden",
        false: "",
      },
      striped: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        striped: true,
        className: "bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)]",
      },
      {
        striped: true,
        animated: true,
        className: "animate-[stripe_1s_linear_infinite]",
      },
    ],
    defaultVariants: {
      color: "default",
      animated: false,
      striped: false,
    },
  }
)

export interface ProgressProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>, 'color'>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof indicatorVariants> {
  showLabel?: boolean
  labelPosition?: "top" | "bottom" | "inner"
  labelFormat?: "percentage" | "fraction" | "value"
}

// ============================================
// Progress Component
// ============================================

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, size, variant, color, animated, striped, showLabel, labelPosition = "top", labelFormat = "percentage", value = 0, max = 100, ...props }, ref) => {
  const safeValue = value ?? 0
  const percentage = Math.min(Math.max((safeValue / max) * 100, 0), 100)

  const formatLabel = () => {
    if (labelFormat === "percentage") return `${Math.round(percentage)}%`
    if (labelFormat === "fraction") return `${safeValue}/${max}`
    return `${safeValue}`
  }

  const renderLabel = () => {
    if (!showLabel) return null

    if (labelPosition === "inner") {
      return (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-difference">
          {formatLabel()}
        </span>
      )
    }

    return (
      <div className={cn(
        "flex justify-between text-xs font-medium text-muted-foreground mb-1",
        labelPosition === "bottom" && "flex-col-reverse mt-1 mb-0"
      )}>
        <span>{props.children || "Progress"}</span>
        <span>{formatLabel()}</span>
      </div>
    )
  }

  return (
    <div className="w-full">
      {labelPosition === "top" && renderLabel()}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ size, variant }), className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(indicatorVariants({ color, animated, striped }))}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        >
          {labelPosition === "inner" && percentage > 15 && renderLabel()}
        </ProgressPrimitive.Indicator>
      </ProgressPrimitive.Root>
      {labelPosition === "bottom" && renderLabel()}
    </div>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

// ============================================
// Circular Progress Component
// ============================================

export interface CircularProgressProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
  value?: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: ProgressProps["color"]
  showLabel?: boolean
  labelFormat?: ProgressProps["labelFormat"]
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  (
    {
      value = 0,
      max = 100,
      size = 40,
      strokeWidth = 3,
      color = "primary",
      showLabel = true,
      labelFormat = "percentage",
      className,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percentage / 100) * circumference

    const colorMap = {
      default: "#4f46e5",
      primary: "oklch(0.58 0.20 285)",
      ai: "oklch(0.60 0.24 195)",
      success: "oklch(0.58 0.23 145)",
      warning: "oklch(0.64 0.26 85)",
      error: "oklch(0.58 0.27 25)",
      gradient: "url(#gradient)",
      "gradient-ai": "url(#gradient-ai)",
    }

    const formatLabel = () => {
      if (labelFormat === "percentage") return `${Math.round(percentage)}%`
      if (labelFormat === "fraction") return `${value}/${max}`
      return `${value}`
    }

    return (
      <div ref={ref} className={cn("relative inline-flex items-center justify-center", className)} {...props}>
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.58 0.20 285)" />
              <stop offset="100%" stopColor="oklch(0.65 0.22 45)" />
            </linearGradient>
            <linearGradient id="gradient-ai" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.70 0.20 195)" />
              <stop offset="100%" stopColor="oklch(0.60 0.24 195)" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="oklch(0.90 0.015 265)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colorMap[color as keyof typeof colorMap]}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        {showLabel && (
          <span className="absolute text-xs font-medium tabular-nums">
            {formatLabel()}
          </span>
        )}
      </div>
    )
  }
)
CircularProgress.displayName = "CircularProgress"

// ============================================
// Skeleton Loader Component
// ============================================

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circle" | "text" | "rect"
  width?: string | number
  height?: string | number
  count?: number
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = "default", width, height, count = 1, ...props }, ref) => {
    const variantClasses = {
      default: "rounded-md",
      circle: "rounded-full",
      text: "h-4 rounded",
      rect: "rounded-sm",
    }

    const skeletons = Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        ref={i === 0 ? ref : null}
        className={cn(
          "animate-pulse bg-muted",
          variantClasses[variant],
          className
        )}
        style={{ width, height }}
        {...props}
      />
    ))

    return <>{skeletons}</>
  }
)
Skeleton.displayName = "Skeleton"

// ============================================
// Spinner Component
// ============================================

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  color?: "default" | "primary" | "ai" | "success" | "warning" | "error"
}

const sizeMap = {
  xs: "size-3",
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
  xl: "size-12",
}

const borderColors = {
  default: "border-foreground",
  primary: "border-[oklch(0.58_0.20_285)]",
  ai: "border-[oklch(0.60_0.24_195)]",
  success: "border-[oklch(0.58_0.23_145)]",
  warning: "border-[oklch(0.64_0.26_85)]",
  error: "border-[oklch(0.58_0.27_25)]",
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", color = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full border-2 border-transparent border-t-current",
          sizeMap[size],
          borderColors[color],
          className
        )}
        {...props}
      />
    )
  }
)
Spinner.displayName = "Spinner"

// ============================================
// Dots Spinner Component (creative variant)
// ============================================

export interface DotsSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
  color?: string
}

const dotsSizeMap = {
  sm: "size-1",
  md: "size-1.5",
  lg: "size-2",
}

const DotsSpinner = React.forwardRef<HTMLDivElement, DotsSpinnerProps>(
  ({ className, size = "md", color = "currentColor", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-1", className)}
        {...props}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "rounded-full animate-bounce",
              dotsSizeMap[size]
            )}
            style={{
              backgroundColor: color,
              animationDelay: `${i * 0.15}s`,
              animationDuration: "0.6s",
            }}
          />
        ))}
      </div>
    )
  }
)
DotsSpinner.displayName = "DotsSpinner"

// ============================================
// Exports
// ============================================

export {
  Progress,
  CircularProgress,
  Skeleton,
  Spinner,
  DotsSpinner,
  progressVariants,
  indicatorVariants,
}
