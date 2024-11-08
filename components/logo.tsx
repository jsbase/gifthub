import { GiftIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  groupName?: string;
}

export function Logo({ size = 'md', className, groupName }: LogoProps) {
  const sizes = {
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
  };

  return (
    <div className={cn(
      "flex",
      "items-center",
      "space-x-2",
      className
    )}>
      <GiftIcon className={cn(
        sizes[size].icon,
        "text-primary"
      )} />
      <h1 className={cn(
        sizes[size].text,
        "font-extrabold",
        "tracking-tight",
        "leading-none",
        "text-foreground"
      )}>
        {groupName || "GiftHub"}
      </h1>
    </div>
  );
}
