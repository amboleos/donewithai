import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// ============================================
// Badge Variants
// ============================================

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.75 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-error text-error-foreground hover:bg-error/80",
        outline: "text-foreground border-border hover:bg-muted/50",
        // AI-specific variants
        ai:
          "border-transparent bg-[oklch(0.60_0.24_195)] text-white shadow-[0_0_10px_rgba(34,211,238,0.3)] hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] hover:bg-[oklch(0.55_0.24_195)]",
        "ai-outline":
          "border-[oklch(0.60_0.24_195)] bg-[oklch(0.60_0.24_195_/10%)] text-[oklch(0.55_0.24_195)] hover:bg-[oklch(0.60_0.24_195_/20%)]",
        "ai-soft":
          "border-transparent bg-gradient-to-r from-[oklch(0.85_0.10_195)] to-[oklch(0.80_0.12_285)] text-[oklch(0.30_0.18_195)]",
        // Success variant
        success:
          "border-transparent bg-success text-success-foreground hover:bg-success/80",
        // Warning variant
        warning:
          "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
        // Info variant
        info:
          "border-transparent bg-[oklch(0.58_0.20_285)] text-white hover:bg-[oklch(0.53_0.20_285)]",
      },
      size: {
        default: "px-2.5 py-0.75 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
        icon: "size-6 p-0",
      },
      dot: {
        true: "pl-1.5",
        false: "",
      },
    },
    compoundVariants: [
      {
        size: "sm",
        dot: true,
        className: "pl-1",
      },
      {
        size: "lg",
        dot: true,
        className: "pl-2",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      dot: false,
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
  dotColor?: string
}

// ============================================
// Badge Dot Component
// ============================================

function BadgeDot({ color }: { color?: string }) {
  return (
    <span
      className={cn(
        "size-1.5 rounded-full animate-pulse",
        color || "bg-current"
      )}
    />
  )
}

// ============================================
// Badge Component
// ============================================

function Badge({
  className,
  variant,
  size,
  dot,
  dotColor,
  children,
  ...props
}: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size, dot }), className)} {...props}>
      {dot && <BadgeDot color={dotColor} />}
      {children}
    </div>
  )
}

// ============================================
// AI Badge Component (specialized for AI detection)
// ============================================

export interface AIBadgeProps extends Omit<BadgeProps, "variant"> {
  confidence?: number
  showConfidence?: boolean
}

const aiConfidenceToColor = (confidence: number) => {
  if (confidence >= 0.8) return "bg-[oklch(0.60_0.24_195)]" // High confidence - cyan
  if (confidence >= 0.6) return "bg-[oklch(0.65_0.22_45)]" // Medium - orange
  return "bg-warning" // Low - amber
}

const aiConfidenceToLabel = (confidence: number) => {
  if (confidence >= 0.8) return "High"
  if (confidence >= 0.6) return "Medium"
  return "Low"
}

function AIBadge({
  className,
  confidence,
  showConfidence = false,
  children = "AI",
  ...props
}: AIBadgeProps) {
  const confidenceColor = confidence !== undefined ? aiConfidenceToColor(confidence) : undefined

  return (
    <Badge
      variant="ai"
      className={cn("gap-1", className)}
      {...props}
    >
      <svg
        className="size-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
      {children}
      {showConfidence && confidence !== undefined && (
        <span className="opacity-80">{aiConfidenceToLabel(confidence)}</span>
      )}
    </Badge>
  )
}

// ============================================
// Status Badge (for sync status, etc.)
// ============================================

export type Status = "syncing" | "success" | "error" | "pending" | "warning"

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: Status
}

const statusVariantMap: Record<Status, BadgeProps["variant"]> = {
  syncing: "ai",
  success: "success",
  error: "destructive",
  pending: "outline",
  warning: "warning",
}

function StatusBadge({ status, children, ...props }: StatusBadgeProps) {
  const variant = statusVariantMap[status]

  return (
    <Badge variant={variant} dot={status === "syncing"} {...props}>
      {children}
    </Badge>
  )
}

// ============================================
// Pulse Badge (with animated glow)
// ============================================

export interface PulseBadgeProps extends BadgeProps {
  pulseColor?: "primary" | "ai" | "success" | "error" | "warning"
}

const pulseGlowMap = {
  primary: "shadow-[0_0_10px_rgba(139,92,246,0.5)] animate-pulse-glow",
  ai: "shadow-[0_0_10px_rgba(34,211,238,0.5)] animate-pulse-glow",
  success: "shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse-glow",
  error: "shadow-[0_0_10px_rgba(248,113,113,0.5)] animate-pulse-glow",
  warning: "shadow-[0_0_10px_rgba(251,191,36,0.5)] animate-pulse-glow",
}

function PulseBadge({
  pulseColor = "primary",
  className,
  ...props
}: PulseBadgeProps) {
  return (
    <Badge
      className={cn(pulseGlowMap[pulseColor], className)}
      {...props}
    />
  )
}

// ============================================
// Exports
// ============================================

export {
  Badge,
  badgeVariants,
  AIBadge,
  StatusBadge,
  PulseBadge,
}
