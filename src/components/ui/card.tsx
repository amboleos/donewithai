import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// ============================================
// Card Variants - Neo-Brutalist Style
// ============================================

const cardVariants = cva(
  "transition-all duration-200",
  {
    variants: {
      variant: {
        // Default - White with brutal shadow
        default: "bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal)]",
        // Bordered - No shadow
        bordered: "bg-[var(--card)] border-2 border-[var(--border)]",
        // Interactive - Hover lift effect
        interactive:
          "bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal)] cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] hover:[box-shadow:var(--shadow-brutal-lg)]",
        // Flat - No shadow or border
        flat: "bg-[var(--card)]",
        // Outline - Just border
        outline: "border-2 border-[var(--border)] bg-transparent",
        // Accent - Coral accent shadow
        accent: "bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-accent)]",
        // Primary - Teal accent shadow
        primary: "bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-primary)]",
      },
      size: {
        default: "",
        sm: "",
        lg: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

// ============================================
// Card Root
// ============================================

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size }), className)}
      {...props}
    />
  ))
Card.displayName = "Card"

// ============================================
// Card Header
// ============================================

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

// ============================================
// Card Title
// ============================================

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-bold tracking-tight leading-none uppercase",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

// ============================================
// Card Description
// ============================================

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[var(--muted-foreground)]", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

// ============================================
// Card Content
// ============================================

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

// ============================================
// Card Footer
// ============================================

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// ============================================
// Exports
// ============================================

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
}
