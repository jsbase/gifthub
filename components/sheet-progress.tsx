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
  /**
   * Lets a caller place the pair inside a declared grid track.
   *
   * Two callers need it and they need opposite things. A contents-page row
   * declares a 5rem column for the figure so the number lands in the same place on
   * an owned row and on a shared one, which means justifying it to the end of that
   * column. The landing plate's row is one column below `sm` and two above it, so
   * there the pair is right-aligned on its own line on a phone and left on the
   * name's baseline from `sm` up. The rule-plus-figure pair is 80px wide whichever
   * way it is aligned; what changes is which edge it is pinned to, and that is the
   * caller's decision rather than this component's.
   */
  className?: string;
}

const SheetProgress: React.FC<SheetProgressProps> = ({
  unbought,
  total,
  className,
}) => {
  const collected = total - unbought;
  const pct = total === 0 ? 0 : Math.round((collected / total) * 100);
  const nothingLeft = total > 0 && collected === total;

  return (
    <span
      aria-hidden='true'
      className={cn('flex shrink-0 items-center gap-3', className)}
    >
      <span className='relative block h-[3px] w-14 bg-wash-strong'>
        {/*
          Always drawn. A second, absolutely-positioned span used to be laid over the
          track for a list with no wishes on it - a dashed rule, which is what a
          broken progress bar looks like rather than what an empty one looks like,
          and it appeared on the contents page of every new list in the product.

          At zero collected the fill is zero pixels wide and the track underneath it
          is the whole story. The figure beside it already prints 0, and
          `giftCount.none` is the sentence that says "no wishes written yet" where
          somebody reads sentences.
        */}
        <span
          className={cn(
            'absolute inset-y-0 left-0',
            nothingLeft ? 'bg-done' : 'bg-[var(--member-ink)]'
          )}
          style={{ width: `${pct}%` }}
        />
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