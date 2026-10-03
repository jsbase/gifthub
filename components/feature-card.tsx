import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import type { FeatureCardProps } from '@/types';

/**
 * One claim about how a list works, in one of two registers.
 *
 * There are no boxes, borders, shadows or backgrounds: a claim is a sentence, and
 * putting three sentences in cards would claim they were three objects to
 * compare. What separates them instead is the type itself - one claim set large
 * and the others set as the index of a catalogue, title in a narrow column and
 * description beside it. Hierarchy does the work a grid used to.
 *
 * The version this replaced was a `sm:grid-cols-3` row: three equal columns, one
 * short rule at the same height above each, a title at the same size in each.
 * Three claims in three identical boxes is a category default, and the page's own
 * vocabulary - tone and hairline - was doing all the work anyway.
 */
const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  variant = 'entry',
}) => {
  if (variant === 'lead') {
    return (
      <div className={cn('max-w-[54ch]')}>
        <span aria-hidden='true' className='mb-5 block h-px w-16 bg-furniture' />
        <h2
          className={cn(
            'font-semibold',
            'text-balance',
            'text-ink',
            'text-[1.375rem]',
            'leading-[1.22]'
          )}
        >
          {title}
        </h2>
        <p
          className={cn(
            'mt-3',
            'text-[1rem]',
            'leading-[1.6]',
            'text-pretty',
            'text-caption'
          )}
        >
          {description}
        </p>
      </div>
    );
  }

  /*
    `text-balance` is deliberately absent on the entry title: it is set in a fixed
    narrow column, where balancing two or three lines of a German or Russian claim
    would stretch one word per line to make them even.
  */
  return (
    <div
      className={cn(
        'grid',
        'gap-x-8',
        'gap-y-1.5',
        'sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]'
      )}
    >
      <h2 className={cn('font-semibold', 'text-[0.9375rem]', 'text-ink')}>
        {title}
      </h2>
      <p
        className={cn(
          'max-w-[46ch]',
          'text-[0.9375rem]',
          'leading-[1.65]',
          'text-pretty',
          'text-caption'
        )}
      >
        {description}
      </p>
    </div>
  );
};

export default memo(FeatureCard);
