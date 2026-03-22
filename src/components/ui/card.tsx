import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// ============================================
// Card Variants
// ============================================

const cardVariants = cva(
  "rounded-lg text-card-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border bg-card shadow-sm",
        bordered: "border-2 bg-card shadow-sm",
        elevated: "border bg-card shadow-lg hover:shadow-xl",
        "elevated-xl": "border bg-card shadow-xl hover:shadow-2xl",
        flat: "border-0 bg-card shadow-none",
        glass: "border border-white/20 bg-white/10 backdrop-blur-md shadow-lg",
        "glass-dark": "border border-white/10 bg-black/20 backdrop-blur-md shadow-lg",
        outline: "border-2 border-border bg-transparent shadow-none hover:border-primary/50",
        glow: "border border-primary/30 bg-card shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_30px_rgba(139,92,246,0.25)]",
        "glow-ai": "border border-[oklch(0.60_0.24_195)]/30 bg-card shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:shadow-[0_0_30px_rgba(34,211,238,0.25)]",
      },
      size: {
        default: "",
        sm: "text-sm",
        lg: "text-lg",
      },
      interactive: {
        true: "cursor-pointer hover:border-primary/50 active:scale-[0.99]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
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
  ({ className, variant, size, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size, interactive }), className)}
      {...props}
    />
  ))
Card.displayName = "Card"

// ============================================
// Card Header
// ============================================

const cardHeaderVariants = cva(
  "flex flex-col space-y-1.5 p-6",
  {
    variants: {
      spacing: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
        none: "p-0",
      },
    },
    defaultVariants: {
      spacing: "default",
    },
  }
)

export interface CardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardHeaderVariants> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, spacing, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardHeaderVariants({ spacing }), className)}
      {...props}
    />
  ))
CardHeader.displayName = "CardHeader"

// ============================================
// Card Title
// ============================================

const cardTitleVariants = cva(
  "leading-none tracking-tight",
  {
    variants: {
      size: {
        default: "text-2xl font-semibold",
        sm: "text-lg font-semibold",
        lg: "text-3xl font-semibold",
        xl: "text-4xl font-bold",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof cardTitleVariants> {}

const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, size, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(cardTitleVariants({ size }), className)}
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
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

// ============================================
// Card Content
// ============================================

const cardContentVariants = cva(
  "transition-all",
  {
    variants: {
      spacing: {
        default: "p-6 pt-0",
        sm: "p-4 pt-0",
        lg: "p-8 pt-0",
        none: "p-0",
      },
    },
    defaultVariants: {
      spacing: "default",
    },
  }
)

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardContentVariants> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, spacing, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardContentVariants({ spacing }), className)}
      {...props}
    />
  ))
CardContent.displayName = "CardContent"

// ============================================
// Card Footer
// ============================================

const cardFooterVariants = cva(
  "flex items-center",
  {
    variants: {
      spacing: {
        default: "p-6 pt-0",
        sm: "p-4 pt-0",
        lg: "p-8 pt-0",
        none: "p-0",
      },
      align: {
        left: "justify-start",
        center: "justify-center",
        right: "justify-end",
        between: "justify-between",
      },
    },
    defaultVariants: {
      spacing: "default",
      align: "left",
    },
  }
)

export interface CardFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardFooterVariants> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, spacing, align, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardFooterVariants({ spacing, align }), className)}
      {...props}
    />
  ))
CardFooter.displayName = "CardFooter"

// ============================================
// Decorative Card Elements
// ============================================

export interface CardDecorationProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
}

const CardDecoration = React.forwardRef<HTMLDivElement, CardDecorationProps>(
  ({ className, position = "top-right", ...props }, ref) => {
    const positionClasses = {
      "top-left": "top-0 left-0 rounded-tr-none rounded-bl-lg",
      "top-right": "top-0 right-0 rounded-tl-none rounded-br-lg",
      "bottom-left": "bottom-0 left-0 rounded-tl-none rounded-br-lg",
      "bottom-right": "bottom-0 right-0 rounded-tr-none rounded-bl-lg",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "absolute w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 pointer-events-none",
          positionClasses[position],
          className
        )}
        {...props}
      />
    )
  }
)
CardDecoration.displayName = "CardDecoration"

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
  CardDecoration,
  cardVariants,
}
