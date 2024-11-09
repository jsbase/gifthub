import React from 'react';
import { GiftIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  groupName?: string;
}

// Move sizes object outside component to prevent recreation
const SIZES = {
  sm: {
    icon: "h-6 w-6",
    text: "text-xl",
  },
  md: {
    icon: "h-8 w-8",
    text: "text-2xl",
  },
  lg: {
    icon: "h-12 w-12",
    text: "text-4xl md:text-5xl lg:text-6xl",
  }
} as const;

export const Logo = React.memo(function Logo({ 
  size = 'md', 
  className, 
  groupName 
}: LogoProps) {
  const containerClasses = useMemo(() => cn(
    "flex",
    "items-center",
    "space-x-2",
    className
  ), [className]);

  const iconClasses = useMemo(() => cn(
    SIZES[size].icon,
    "text-primary"
  ), [size]);

  const textClasses = useMemo(() => cn(
    SIZES[size].text,
    "font-extrabold",
    "tracking-tight",
    "leading-none",
    "text-foreground"
  ), [size]);

  return (
    <div className={containerClasses}>
      <GiftIcon className={iconClasses} />
      <h1 className={textClasses}>
        {groupName || "GiftHub"}
      </h1>
    </div>
  );
});
