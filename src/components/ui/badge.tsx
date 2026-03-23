import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// ============================================
// Badge Variants - Neo-Brutalist Style
// ============================================

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 border-2 px-2.5 py-1 text-xs font-bold uppercase tracking-wider transition-all duration-200",
  {
    variants: {
      variant: {
        // Default - Primary teal
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--border)]",
        // Secondary
        secondary:
          "bg-[var(--secondary)] text-[var(--secondary-foreground)] border-[var(--border)]",
        // Outline
        outline:
          "bg-transparent text-[var(--foreground)] border-[var(--border)]",
        // AI Badge - Cyan
        ai:
          "bg-cyan-500 text-white border-[var(--border)]",
        // AI Outline
        "ai-outline":
          "bg-transparent text-cyan-600 border-cyan-500 dark:text-cyan-400",
        // Human Badge - Green
        human:
          "bg-emerald-500 text-white border-[var(--border)]",
        // Human Outline
        "human-outline":
          "bg-transparent text-emerald-600 border-emerald-500 dark:text-emerald-400",
        // Agentic AI - Red
        agentic:
          "bg-red-500 text-white border-[var(--border)]",
        // Agentic Outline
        "agentic-outline":
          "bg-transparent text-red-600 border-red-500 dark:text-red-400",
        // Success
        success:
          "bg-[var(--success)] text-white border-[var(--border)]",
        // Warning
        warning:
          "bg-[var(--warning)] text-white border-[var(--border)]",
        // Destructive
        destructive:
          "bg-[var(--destructive)] text-white border-[var(--border)]",
        // Not Analyzed
        none:
          "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]",
      },
      size: {
        default: "px-2.5 py-1 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

// ============================================
// Badge Component
// ============================================

function Badge({
  className,
  variant,
  size,
  dot,
  children,
  ...props
}: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span className="size-1.5 rounded-full bg-current animate-pulse-dot" />
      )}
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

const aiConfidenceToVariant = (confidence: number): BadgeProps["variant"] => {
  if (confidence >= 0.8) return "ai"
  if (confidence >= 0.6) return "warning"
  return "outline"
}

const aiConfidenceToLabel = (confidence: number) => {
  if (confidence >= 0.8) return "HIGH"
  if (confidence >= 0.6) return "MED"
  return "LOW"
}

function AIBadge({
  className,
  confidence,
  showConfidence = false,
  children = "AI",
  ...props
}: AIBadgeProps) {
  const variant = confidence !== undefined ? aiConfidenceToVariant(confidence) : "ai"

  return (
    <Badge variant={variant} className={cn("gap-1", className)} {...props}>
      <svg
        className="size-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
      {children}
      {showConfidence && confidence !== undefined && (
        <span className="opacity-80">({aiConfidenceToLabel(confidence)})</span>
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
// Exports
// ============================================

export {
  Badge,
  badgeVariants,
  AIBadge,
  StatusBadge,
}
