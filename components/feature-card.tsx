import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import type { FeatureCardProps } from '@/types';

/**
 * No box, no border, no shadow, no background: these three are sentences about
 * how the group works, not three objects to compare, so putting them in cards
 * would claim they are. Whitespace and a short printed rule separate them.
 *
 * The rule is the album's tell rather than the layout's: a catalogue marks the
 * start of an entry with a short line of ink, and three such lines in a row read
 * as three entries in one page rather than as three floating blocks.
 */
const FeatureCard: React.FC<FeatureCardProps> = ({ title, description }) => (
  <div className={cn('max-w-[36ch]')}>
    <span
      aria-hidden='true'
      className='mb-4 block h-px w-8 bg-furniture'
    />
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
        'text-caption'
      )}
    >
      {description}
    </p>
  </div>
);

export default memo(FeatureCard);
