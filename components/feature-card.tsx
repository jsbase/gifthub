import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import type { FeatureCardProps } from '@/types';

/**
 * No box, no border, no shadow, no background: these three are sentences about
 * how the group works, not three objects to compare, so putting them in cards
 * would claim they are. Whitespace alone separates them.
 */
const FeatureCard: React.FC<FeatureCardProps> = ({ title, description }) => (
  <div className={cn('max-w-[36ch]')}>
    <h2
      className={cn(
        'text-lg',
        'font-semibold',
        'leading-snug',
        'text-balance'
      )}
    >
      {title}
    </h2>
    <p
      className={cn(
        'mt-2',
        'text-[0.9375rem]',
        'leading-relaxed',
        'text-muted-foreground'
      )}
    >
      {description}
    </p>
  </div>
);

export default memo(FeatureCard);
