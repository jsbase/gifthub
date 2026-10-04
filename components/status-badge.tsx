import React from 'react';
import { cn } from '@/lib/utils';
import type { StatusBadgeProps } from '@/types';

/**
 * One state, printed on a chip.
 *
 * "Private" and "Geteilt" were set in the same 11px caption label as the audience
 * count beside them and the section head above them, so the two words that decide
 * who can read a list were the quietest thing in their own row - a reader had to
 * already know the app to tell which of the four grey marks on a row was the
 * privacy setting. A chip gives the state an enclosure of its own at the same
 * type size, which is what "enclosure reads before colour" means in practice: the
 * eye lands on a shape and then reads it.
 *
 * **No hue, and that is the decision rather than the absence of one.** `DESIGN.md`
 * reserves green for one meaning - nothing left to buy - and spends the rest of
 * the palette on paper, ink and the owner's own ink. A red or amber "shared" chip
 * would either collide with that or add a second status colour the world does not
 * have. So the two states are separated by *enclosure and ink weight* instead:
 * `shared` is a filled chip in full ink, `private` is an outlined chip in caption
 * ink. Two channels - a ground and a weight - which is the same reason the
 * collected cell inverts rather than turning green.
 *
 * `sharedWithCount` beside it used to open with the same word ("Geteilt mit: 3"),
 * so the chip would have said "Geteilt" and the line next to it would have said
 * it again; the count on the row is now a bare figure and the chip carries the
 * state once.
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ variant, label }) => (
  <span
    data-testid={`statusBadge-${variant}`}
    className={cn(
      // The label face at label size, because this is a label - a state printed
      // on the page rather than a word set in it. `leading-none` because the
      // uppercase tracking of `label-print` needs the line box to come down to
      // the glyphs or the chip carries 3px of air above and below for 11px of ink.
      'label-print',
      'inline-flex shrink-0 items-center leading-none',
      // Cut, not moulded: the same 2px the sheet's own controls use, so a chip
      // reads as something trimmed rather than stamped.
      'rounded-sm',
      'border',
      'px-1.5 py-1',
      variant === 'shared'
        ? 'border-rule bg-wash-strong text-ink'
        : 'border-rule text-caption'
    )}
  >
    {label}
  </span>
);

export { StatusBadge };
export default StatusBadge;