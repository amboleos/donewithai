"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// ============================================
// Progress Variants - Neo-Brutalist Style
// ============================================

const progressVariants = cva(
  "relative w-full overflow-hidden transition-all duration-300 border-2 border-[var(--border)] bg-[var(--muted)]",
  {
    variants: {
      size: {
        default: "h-3",
        sm: "h-2",
        lg: "h-4",
        xl: "h-5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const indicatorVariants = cva(
  "h-full w-full transition-all duration-300 ease-out",
  {
    variants: {
      color: {
        default: "bg-[var(--primary)]",
        primary: "bg-[var(--primary)]",
        accent: "bg-[var(--accent)]",
        success: "bg-[var(--success)]",
        warning: "bg-[var(--warning)]",
        error: "bg-[var(--destructive)]",
      },
      striped: {
        true: "bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)]",
        false: "",
      },
    },
    compoundVariants: [
      {
        striped: true,
        className: "animate-stripe",
      },
    ],
    defaultVariants: {
      color: "default",
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
>(({ className, size, color, striped, showLabel, labelPosition = "top", labelFormat = "percentage", value = 0, max = 100, ...props }, ref) => {
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
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
          {formatLabel()}
        </span>
      )
    }

    return (
      <div className={cn(
        "flex justify-between text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2",
        labelPosition === "bottom" && "flex-col-reverse mt-2 mb-0"
      )}>
        <span>{props.children || "Progress"}</span>
        <span className="font-mono">{formatLabel()}</span>
      </div>
    )
  }

  return (
    <div className="w-full">
      {labelPosition === "top" && renderLabel()}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ size }), className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(indicatorVariants({ color, striped }))}
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
      default: "var(--primary)",
      primary: "var(--primary)",
      accent: "var(--accent)",
      success: "var(--success)",
      warning: "var(--warning)",
      error: "var(--destructive)",
    }

    const formatLabel = () => {
      if (labelFormat === "percentage") return `${Math.round(percentage)}%`
      if (labelFormat === "fraction") return `${value}/${max}`
      return `${value}`
    }

    return (
      <div ref={ref} className={cn("relative inline-flex items-center justify-center", className)} {...props}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--muted)"
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
            strokeLinecap="square"
            className="transition-all duration-300"
          />
        </svg>
        {showLabel && (
          <span className="absolute text-xs font-bold tabular-nums">
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
      default: "border-2 border-[var(--border)]",
      circle: "rounded-full border-2 border-[var(--border)]",
      text: "h-4",
      rect: "",
    }

    const skeletons = Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        ref={i === 0 ? ref : null}
        className={cn(
          "animate-pulse bg-[var(--muted)]",
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
  color?: "default" | "primary" | "accent" | "success" | "warning" | "error"
}

const sizeMap = {
  xs: "size-3",
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
  xl: "size-12",
}

const borderColors = {
  default: "border-[var(--foreground)]",
  primary: "border-[var(--primary)]",
  accent: "border-[var(--accent)]",
  success: "border-[var(--success)]",
  warning: "border-[var(--warning)]",
  error: "border-[var(--destructive)]",
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
// Dots Spinner Component
// ============================================

export interface DotsSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
  color?: string
}

const dotsSizeMap = {
  sm: "size-1",
  md: "size-2",
  lg: "size-3",
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
              "rounded-full animate-bounce-dot",
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
