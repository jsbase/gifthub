import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import type { FeatureCardProps } from '@/types';

/**
 * One claim about how a list works, set as one line of an index.
 *
 * There are no boxes, borders, shadows or backgrounds: a claim is a sentence, and
 * putting three sentences in cards would claim they were three objects to
 * compare. What separates them instead is the type itself - title in a narrow
 * column, description beside it - and the hairline the caller draws between
 * entries. Hierarchy does the work a grid used to.
 *
 * This once had two registers, because the bought mark is the one claim a
 * neighbouring product cannot copy without changing what it is, and setting the
 * other two beneath it said so without a word. The three claims are entries of
 * equal weight now, and a lead set above them would read as a headline of its own
 * rather than as one of three.
 *
 * The version this replaced was a `sm:grid-cols-3` row: three equal columns, one
 * short rule at the same height above each, a title at the same size in each.
 * Three claims in three identical boxes is a category default, and the page's own
 * vocabulary - tone and hairline - was doing all the work anyway.
 */
const FeatureCard: React.FC<FeatureCardProps> = ({ title, description }) => {
  /*
    `text-balance` is deliberately absent on the title: it is set in a fixed
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
