"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// ============================================
// Input Variants - Neo-Brutalist Style
// ============================================

const inputVariants = cva(
  "flex w-full border-2 bg-[var(--card)] text-sm transition-all duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--muted-foreground)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Default - Brutal shadow
        default:
          "border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)] focus-visible:translate-x-[2px] focus-visible:translate-y-[2px] focus-visible:shadow-none focus-visible:border-[var(--primary)]",
        // Filled - No shadow
        filled:
          "border-[var(--border)] bg-[var(--muted)] focus-visible:bg-[var(--card)] focus-visible:border-[var(--primary)]",
        // Underline - Bottom border only
        underline:
          "border-0 border-b-2 border-[var(--border)] bg-transparent rounded-none focus-visible:border-[var(--primary)] px-0",
        // Ghost - Minimal
        ghost:
          "border-transparent bg-transparent focus-visible:bg-[var(--muted)] focus-visible:border-[var(--border)]",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3 py-1.5 text-xs",
        lg: "h-12 px-5 py-3",
        xl: "h-14 px-6 py-4 text-base",
      },
      state: {
        default: "",
        error: "border-[var(--destructive)] focus-visible:border-[var(--destructive)]",
        success: "border-[var(--success)] focus-visible:border-[var(--success)]",
        warning: "border-[var(--warning)] focus-visible:border-[var(--warning)]",
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
              "absolute left-4 pointer-events-none transition-all duration-200 z-10 font-semibold text-xs uppercase tracking-wider",
              variant === "default" && "-top-2.5 left-3 bg-[var(--card)] px-1 text-[var(--foreground)]",
              variant === "filled" && [
                "text-[var(--muted-foreground)]",
                hasValue || focused
                  ? "top-2 text-xs"
                  : "top-3 text-sm",
              ],
              variant === "underline" && [
                "left-0 text-[var(--muted-foreground)]",
                hasValue || focused
                  ? "-top-5 text-xs"
                  : "top-2.5 text-sm",
              ],
              inputState === "error" && "text-[var(--destructive)]",
              inputState === "success" && "text-[var(--success)]"
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
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex-1">
              {error && (
                <span
                  id={`${props.id || props.name}-error`}
                  className="text-xs text-[var(--destructive)] font-semibold uppercase flex items-center gap-1"
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
                  className="text-xs text-[var(--muted-foreground)]"
                >
                  {hint}
                </span>
              )}
            </div>

            {hasCharacterCount && (
              <span
                className={cn(
                  "text-xs font-mono tabular-nums",
                  characterCount > maxLength * 0.9
                    ? "text-[var(--destructive)]"
                    : characterCount > maxLength * 0.7
                      ? "text-[var(--warning)]"
                      : "text-[var(--muted-foreground)]"
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
  "flex w-full border-2 bg-[var(--card)] text-sm transition-all duration-150 placeholder:text-[var(--muted-foreground)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none",
  {
    variants: {
      variant: {
        default:
          "border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)] focus-visible:translate-x-[2px] focus-visible:translate-y-[2px] focus-visible:shadow-none focus-visible:border-[var(--primary)]",
        filled:
          "border-[var(--border)] bg-[var(--muted)] focus-visible:bg-[var(--card)] focus-visible:border-[var(--primary)]",
        underline:
          "border-0 border-b-2 border-[var(--border)] bg-transparent rounded-none focus-visible:border-[var(--primary)] px-0",
        ghost:
          "border-transparent bg-transparent focus-visible:bg-[var(--muted)] focus-visible:border-[var(--border)]",
      },
      size: {
        default: "px-4 py-3 min-h-[100px]",
        sm: "px-3 py-2 text-xs min-h-[80px]",
        lg: "px-5 py-4 min-h-[140px]",
        xl: "px-6 py-5 text-base min-h-[180px]",
      },
      state: {
        default: "",
        error: "border-[var(--destructive)] focus-visible:border-[var(--destructive)]",
        success: "border-[var(--success)] focus-visible:border-[var(--success)]",
        warning: "border-[var(--warning)] focus-visible:border-[var(--warning)]",
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
              "absolute left-4 pointer-events-none transition-all duration-200 z-10 font-semibold text-xs uppercase tracking-wider",
              variant === "default" && "-top-2.5 left-3 bg-[var(--card)] px-1 text-[var(--foreground)]",
              variant === "filled" && [
                "text-[var(--muted-foreground)]",
                hasValue || focused
                  ? "top-2 text-xs"
                  : "top-3 text-sm",
              ],
              variant === "underline" && [
                "left-0 text-[var(--muted-foreground)]",
                hasValue || focused
                  ? "-top-5 text-xs"
                  : "top-2.5 text-sm",
              ],
              inputState === "error" && "text-[var(--destructive)]",
              inputState === "success" && "text-[var(--success)]"
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
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex-1">
              {error && (
                <span
                  id={`${props.id || props.name}-error`}
                  className="text-xs text-[var(--destructive)] font-semibold uppercase flex items-center gap-1"
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
                  className="text-xs text-[var(--muted-foreground)]"
                >
                  {hint}
                </span>
              )}
            </div>

            {hasCharacterCount && (
              <span
                className={cn(
                  "text-xs font-mono tabular-nums",
                  characterCount > maxLength * 0.9
                    ? "text-[var(--destructive)]"
                    : characterCount > maxLength * 0.7
                      ? "text-[var(--warning)]"
                      : "text-[var(--muted-foreground)]"
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
