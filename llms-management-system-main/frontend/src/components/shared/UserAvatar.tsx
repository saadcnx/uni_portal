import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const AVATAR_COLOR_PALETTES = [
  "bg-chart-1/20 text-chart-1",
  "bg-chart-2/20 text-chart-2",
  "bg-chart-3/20 text-chart-3",
  "bg-chart-4/20 text-chart-4",
  "bg-chart-5/20 text-chart-5",
  "bg-brand/20 text-brand",
  "bg-secondary text-secondary-foreground",
  "bg-muted text-muted-foreground",
] as const;

function getAvatarColorClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_COLOR_PALETTES.length;
  return AVATAR_COLOR_PALETTES[index];
}

const sizeClasses = {
  sm: "size-7 text-xs",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
} as const;

export function UserAvatar({
  name,
  src,
  size = "md",
  className,
}: UserAvatarProps) {
  const initials = getInitials(name) || "?";
  const colorClass = getAvatarColorClass(name);

  return (
    <Avatar
      className={cn(sizeClasses[size], "border border-border", className)}
      aria-label={`Avatar of ${name}`}
      title={name}
    >
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback
        className={cn(
          "font-medium select-none flex items-center justify-center size-full rounded-full",
          colorClass
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
