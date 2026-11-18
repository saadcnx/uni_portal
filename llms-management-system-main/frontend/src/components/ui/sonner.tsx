"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ position = "bottom-right", ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position={position}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-success shrink-0" />
        ),
        info: (
          <InfoIcon className="size-4 text-primary shrink-0" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-warning shrink-0" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-destructive shrink-0" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground shrink-0" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-xl)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl text-sm font-medium",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground text-xs font-medium",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground text-xs font-medium",
          error:
            "group-[.toaster]:!bg-destructive/10 group-[.toaster]:!text-destructive group-[.toaster]:!border-destructive/30 [&_[data-description]]:!text-destructive/80 [&_[data-icon]]:!text-destructive",
          success:
            "group-[.toaster]:!bg-success/10 group-[.toaster]:!text-success group-[.toaster]:!border-success/30 [&_[data-description]]:!text-success/80 [&_[data-icon]]:!text-success",
          warning:
            "group-[.toaster]:!bg-warning/10 group-[.toaster]:!text-warning group-[.toaster]:!border-warning/30 [&_[data-description]]:!text-warning/80 [&_[data-icon]]:!text-warning",
          info:
            "group-[.toaster]:!bg-card group-[.toaster]:!text-foreground group-[.toaster]:!border-border [&_[data-description]]:!text-muted-foreground [&_[data-icon]]:!text-primary",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
