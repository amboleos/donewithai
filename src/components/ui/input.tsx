"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// ============================================
// Input Variants
// ============================================

const inputVariants = cva(
  "flex w-full rounded-lg text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-input bg-background ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        filled:
          "border-0 bg-muted/50 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        underline:
          "border-0 border-b-2 border-input bg-transparent rounded-none focus-visible:border-primary focus-visible:ring-0 px-0",
        ghost:
          "border-0 bg-transparent focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
      },
      size: {
        default: "h-10 px-3 py-2",
        sm: "h-8 px-2.5 py-1.5 text-xs",
        lg: "h-12 px-4 py-3",
        xl: "h-14 px-5 py-4 text-base",
      },
      state: {
        default: "",
        error: "border-error focus-visible:ring-error",
        success: "border-success focus-visible:ring-success",
        warning: "border-warning focus-visible:ring-warning",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      state: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string
  error?: string
  hint?: string
  showCharacterCount?: boolean
  maxLength?: number
  containerClassName?: string
}

// ============================================
// Input Component
// ============================================

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      state,
      label,
      error,
      hint,
      showCharacterCount = false,
      maxLength,
      containerClassName,
      value,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = React.useState(false)
    const [internalValue, setInternalValue] = React.useState(
      typeof value === "string" ? value : props.defaultValue?.toString() || ""
    )

    // Determine the actual state
    const inputState = error ? "error" : state

    // Character count
    const characterCount = typeof value === "string" ? value.length : internalValue.length
    const hasCharacterCount = showCharacterCount && typeof maxLength === "number"

    // Floating label styles
    const isFloating = variant === "filled" || variant === "underline"
    const hasValue =
      (typeof value === "string" ? value : internalValue).length > 0 || focused

    return (
      <div className={cn("relative w-full", containerClassName)}>
        {label && (
          <label
            className={cn(
              "absolute left-3 pointer-events-none transition-all duration-200 z-10",
              variant === "default" && "-top-2.5 left-2 bg-background px-1 text-xs font-medium text-foreground",
              variant === "filled" && [
                "text-muted-foreground",
                hasValue || focused
                  ? "top-2.5 text-xs"
                  : "top-3 text-sm base-text",
              ],
              variant === "underline" && [
                "left-0 text-muted-foreground",
                hasValue || focused
                  ? "-top-5 text-xs"
                  : "top-2.5 text-sm",
              ],
              inputState === "error" && "text-error",
              inputState === "success" && "text-success"
            )}
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          value={value}
          onChange={(e) => {
            setInternalValue(e.target.value)
            props.onChange?.(e)
          }}
          onFocus={(e) => {
            setFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            props.onBlur?.(e)
          }}
          className={cn(
            inputVariants({ variant, size, state: inputState }),
            label && variant === "default" && "mt-2",
            label && (variant === "filled" || variant === "underline") && "pt-6",
            className
          )}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${props.id || props.name}-error` : hint ? `${props.id || props.name}-hint` : undefined
          }
          {...props}
        />

        {/* Bottom row: hint, error, character count */}
        {(error || hint || hasCharacterCount) && (
          <div className="flex items-center justify-between mt-1.5 px-1">
            <div className="flex-1">
              {error && (
                <span
                  id={`${props.id || props.name}-error`}
                  className="text-xs text-error flex items-center gap-1"
                >
                  <svg
                    className="size-3"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <path d="M6 0C2.686 0 0 2.686 0 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm-.75 3h1.5v3h-1.5V3zm.75 4.5a.75.75 0 100 1.5.75.75 0 000-1.5z" />
                  </svg>
                  {error}
                </span>
              )}
              {!error && hint && (
                <span
                  id={`${props.id || props.name}-hint`}
                  className="text-xs text-muted-foreground"
                >
                  {hint}
                </span>
              )}
            </div>

            {hasCharacterCount && (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  characterCount > maxLength * 0.9
                    ? "text-error"
                    : characterCount > maxLength * 0.7
                      ? "text-warning"
                      : "text-muted-foreground"
                )}
              >
                {characterCount}/{maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

// ============================================
// Textarea Component (variant of Input)
// ============================================

const textareaVariants = cva(
  "flex w-full rounded-lg text-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none",
  {
    variants: {
      variant: {
        default:
          "border border-input bg-background ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        filled:
          "border-0 bg-muted/50 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        underline:
          "border-0 border-b-2 border-input bg-transparent rounded-none focus-visible:border-primary focus-visible:ring-0 px-0",
        ghost:
          "border-0 bg-transparent focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
      },
      size: {
        default: "px-3 py-2 min-h-[80px]",
        sm: "px-2.5 py-1.5 text-xs min-h-[60px]",
        lg: "px-4 py-3 min-h-[120px]",
        xl: "px-5 py-4 text-base min-h-[160px]",
      },
      state: {
        default: "",
        error: "border-error focus-visible:ring-error",
        success: "border-success focus-visible:ring-success",
        warning: "border-warning focus-visible:ring-warning",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      state: "default",
    },
  }
)

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  label?: string
  error?: string
  hint?: string
  showCharacterCount?: boolean
  maxLength?: number
  containerClassName?: string
  autoResize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant,
      size,
      state,
      label,
      error,
      hint,
      showCharacterCount = false,
      maxLength,
      containerClassName,
      autoResize = false,
      value,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = React.useState(false)
    const [internalValue, setInternalValue] = React.useState(
      typeof value === "string" ? value : props.defaultValue?.toString() || ""
    )
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)

    // Forward ref
    React.useImperativeHandle(ref, () => textareaRef.current!)

    // Auto-resize
    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = "auto"
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
    }, [internalValue, autoResize])

    // Determine the actual state
    const inputState = error ? "error" : state

    // Character count
    const characterCount = typeof value === "string" ? value.length : internalValue.length
    const hasCharacterCount = showCharacterCount && typeof maxLength === "number"

    // Floating label styles
    const hasValue =
      (typeof value === "string" ? value : internalValue).length > 0 || focused

    return (
      <div className={cn("relative w-full", containerClassName)}>
        {label && (
          <label
            className={cn(
              "absolute left-3 pointer-events-none transition-all duration-200 z-10",
              variant === "default" && "-top-2.5 left-2 bg-background px-1 text-xs font-medium text-foreground",
              variant === "filled" && [
                "text-muted-foreground",
                hasValue || focused
                  ? "top-2.5 text-xs"
                  : "top-3 text-sm",
              ],
              variant === "underline" && [
                "left-0 text-muted-foreground",
                hasValue || focused
                  ? "-top-5 text-xs"
                  : "top-2.5 text-sm",
              ],
              inputState === "error" && "text-error",
              inputState === "success" && "text-success"
            )}
          >
            {label}
          </label>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setInternalValue(e.target.value)
            props.onChange?.(e)
          }}
          onFocus={(e) => {
            setFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            props.onBlur?.(e)
          }}
          className={cn(
            textareaVariants({ variant, size, state: inputState }),
            label && variant === "default" && "mt-2",
            label && (variant === "filled" || variant === "underline") && "pt-6",
            !autoResize && "h-32",
            className
          )}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${props.id || props.name}-error` : hint ? `${props.id || props.name}-hint` : undefined
          }
          {...props}
        />

        {/* Bottom row: hint, error, character count */}
        {(error || hint || hasCharacterCount) && (
          <div className="flex items-center justify-between mt-1.5 px-1">
            <div className="flex-1">
              {error && (
                <span
                  id={`${props.id || props.name}-error`}
                  className="text-xs text-error flex items-center gap-1"
                >
                  <svg
                    className="size-3"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <path d="M6 0C2.686 0 0 2.686 0 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm-.75 3h1.5v3h-1.5V3zm.75 4.5a.75.75 0 100 1.5.75.75 0 000-1.5z" />
                  </svg>
                  {error}
                </span>
              )}
              {!error && hint && (
                <span
                  id={`${props.id || props.name}-hint`}
                  className="text-xs text-muted-foreground"
                >
                  {hint}
                </span>
              )}
            </div>

            {hasCharacterCount && (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  characterCount > maxLength * 0.9
                    ? "text-error"
                    : characterCount > maxLength * 0.7
                      ? "text-warning"
                      : "text-muted-foreground"
                )}
              >
                {characterCount}/{maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Input, Textarea, inputVariants, textareaVariants }
