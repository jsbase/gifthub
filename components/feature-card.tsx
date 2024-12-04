import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import type { FeatureCardProps } from '@/types';

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
}) => (
  <div className={cn(
    "block",
    "mb-4",
    "p-6",
    "bg-background",
    "border",
    "rounded-lg",
    "shadow",
    "dark:bg-card-background",
    "dark:border-gray-700"
  )}>
    <h5 className={cn(
      "mb-2",
      "text-2xl",
      "font-bold",
      "tracking-tight",
      "text-foreground"
    )}>
      {title}
    </h5>
    <p className={cn(
      "font-normal",
      "text-muted-foreground"
    )}>
      {description}
    </p>
  </div>
);

export default memo(FeatureCard);
