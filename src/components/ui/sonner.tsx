"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--shadow-brutal": "4px 4px 0px 0px var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal)] font-mono",
          title: "font-bold text-sm",
          description: "text-xs",
          closeButton: "border-2 border-[var(--border)] bg-[var(--muted)] hover:bg-[var(--muted-foreground)]/10",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
