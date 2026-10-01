'use client';

import { IconCheck } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/**
 * How far along one member's sheet is.
 *
 * Two parts answering two different questions. The figure is how many ideas are
 * still OPEN - the actionable number, and the one the row's count sentence says
 * in words. The rule is how much of the sheet has been dealt with, filled in the
 * member's own ink.
 *
 * The earlier version drew one miniature cell per idea, on the theory that a
 * count you can see beats a count you have to read. It does not survive real
 * data: a member with a hundred ideas produced a hundred cells, so the miniature
 * was capped and the cap printed a "+N" that only admitted the figure did not
 * fit. The number scales and the rule scales, and neither needs a cap.
 *
 * **When nothing is left, the figure is replaced by a check** and turns green.
 * That is the one place in the app where a number becomes a picture, and it is
 * deliberate: "zero left" is a conclusion, not a quantity. It is also the only
 * semantic colour in the system - every other hue is an identity, one of the six
 * member inks - so it reads as a different kind of statement rather than as
 * another member's colour. It is deliberately not one of the six: a member whose
 * ink hashed to green would collide with it.
 *
 * Empty is not done, and the two must not look alike. A member with no ideas at
 * all gets a DASHED rule, not a filled one, so "nothing written yet" is visibly
 * different from "written and all collected" - and the empty one has no check,
 * because there is nothing to have completed.
 *
 * The figure is `aria-hidden`: the row carries the same fact as real text in its
 * count sentence, and a shape is not an announcement.
 */
export interface SheetProgressProps {
  /** How many ideas are still open. */
  unbought: number;
  /** How many ideas exist in total, open and collected. */
  total: number;
}

const SheetProgress: React.FC<SheetProgressProps> = ({ unbought, total }) => {
  const collected = total - unbought;
  const pct = total === 0 ? 0 : Math.round((collected / total) * 100);
  const nothingLeft = total > 0 && collected === total;

  return (
    <span aria-hidden='true' className='flex shrink-0 items-center gap-3'>
      <span className='relative block h-[3px] w-14 bg-wash-strong'>
        {total === 0 ? (
          <span className='absolute inset-0 border-t border-dashed border-rule' />
        ) : (
          <span
            className={cn(
              'absolute inset-y-0 left-0',
              nothingLeft ? 'bg-done' : 'bg-[var(--member-ink)]'
            )}
            style={{ width: `${pct}%` }}
          />
        )}
      </span>
      {nothingLeft ? (
        <IconCheck className='h-4 w-4 text-done' stroke={2.5} />
      ) : (
        <span
          className={cn(
            'font-label',
            'min-w-[2ch]',
            'text-right',
            'text-[0.8125rem]',
            'font-bold',
            'tabular-nums',
            'tracking-[0.06em]',
            unbought > 0 ? 'text-ink' : 'text-caption'
          )}
        >
          {unbought}
        </span>
      )}
    </span>
  );
};

export default SheetProgress;