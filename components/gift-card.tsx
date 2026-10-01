'use client';

import React, { memo } from 'react';
import { Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import type { GiftCardProps } from '@/types';

/**
 * One cell of the album page.
 *
 * A cell is a sheet of label stock with a printed rule around it. Two things
 * live in it, in the order a collector reads them: the thing itself, and the
 * note about the thing.
 *
 * This is the replacement for a checklist row, and every decision below is the
 * opposite of the one a checklist would make:
 *
 *   - The cell has an EDGE. A row of a scrolling list has only a rule between it
 *     and its neighbour, which is why the old list read as an undifferentiated
 *     stack. A cell is a place, and a place has a border.
 *   - The title is CAPS. On a printed label the name of the specimen is the
 *     loudest thing in the cell, and it is not competing with a description two
 *     pixels below it any more.
 *   - Collecting INVERTS the cell rather than colouring a checkbox. The previous
 *     system's marigold tick spent its one warm colour on a 20px square, which
 *     meant the most meaningful state in the product was the least visible thing
 *     on it. An inverted cell is a black field in a white grid, legible at a
 *     glance from across a room and identical in greyscale.
 *
 * The row is a flex of three siblings - the tick, the link, the delete button.
 * They cannot be nested: interactive content inside an `<a>` is invalid HTML, it
 * is axe-core's `nested-interactive`, and it makes the link's accessible name
 * recurse into the tick's label, so the link would announce as "Mark as bought,
 * <title>, <url>". Tab also reached the tick from inside the link, and Enter
 * navigated away instead of ticking.
 */
const GiftCard: React.FC<GiftCardProps> = ({
  gift,
  dict,
  onDelete,
  onTogglePurchased,
  togglingId,
  changedId,
}) => {
  const debouncedDelete = useDebounce(
    (id: string) => {
      onDelete(id);
    },
    300,
    {
      leading: true,
      trailing: false,
    }
  );

  const handleDelete = () => {
    debouncedDelete(gift.id);
  };

  const handleTogglePurchased = () => {
    onTogglePurchased(gift.id);
  };

  const isPending = togglingId === gift.id;
  // The state is persistent - a collected idea stays inverted and stays in the
  // album - but the motion is one-shot, confined to the cell that changed.
  const justChanged = changedId === gift.id;
  const isCollected = gift.isPurchased;

  /*
    Shared by the linked and unlinked variants so the two cannot drift. The hover
    is `--color-wash`, the same 7% ink wash every other interactive surface in
    the app uses, so there is one hover value rather than three. It is suppressed
    on a collected cell, because an inverted field has no hover state: the sheet
    has already been stamped and the only thing left to do is read it.
  */
  const interactiveClasses = cn(
    'min-w-0',
    'flex-1',
    'transition-colors',
    'duration-150',
    !isCollected && 'hover:bg-wash'
  );

  return (
    <li
      data-testid='giftCard'
      className={cn(
        'group/cell',
        'flex',
        'items-stretch',
        'gap-0',
        'border',
        'border-rule',
        'transition-colors',
        'duration-200',
        isCollected ? 'bg-collected text-collected-foreground' : 'bg-cell text-ink',
        // The sheet takes a press as the ring lands on it.
        justChanged && isCollected && 'animate-cancel-settle'
      )}
    >
      {/*
        The tick is the whole toggle, and there is no second "mark as bought"
        button doing the same job. It sits in the left margin of the cell with a
        44px target, because that target was 20x20 in the previous system and it
        is the control the whole product exists for.
      */}
      <button
        type='button'
        onClick={handleTogglePurchased}
        // `pointer-events-none` below only stops the mouse. Without `disabled`
        // the button stays keyboard-activatable, so Enter or Space during an
        // in-flight toggle fires a second request.
        disabled={isPending}
        aria-pressed={isCollected}
        aria-label={isCollected ? dict.markAsAvailable : dict.markAsPurchased}
        data-testid='giftStrikethrough'
        className={cn(
          'grid',
          'h-11',
          'w-11',
          'shrink-0',
          'place-items-center',
          'border-r',
          'border-rule',
          'transition-colors',
          'duration-150',
          isCollected
            ? 'text-collected-foreground'
            : 'text-caption hover:bg-wash hover:text-ink',
          isPending && 'pointer-events-none opacity-60'
        )}
      >
        {/* An empty square drawn in the margin: the cell is waiting. */}
        <span
          aria-hidden='true'
          className={cn(
            'block',
            'h-3.5',
            'w-3.5',
            'border',
            isCollected
              ? 'border-collected-foreground/60 bg-collected-foreground'
              : 'border-rule bg-transparent group-hover/cell:border-ink'
          )}
        />
      </button>

      {gift.url ? (
        <a
          href={gift.url}
          target='_blank'
          rel='noopener noreferrer'
          className={interactiveClasses}
        >
          <GiftCardBody gift={gift} justChanged={justChanged} />
        </a>
      ) : (
        <div className={interactiveClasses}>
          <GiftCardBody gift={gift} justChanged={justChanged} />
        </div>
      )}

      <Button
        variant='ghost'
        size='icon'
        onClick={handleDelete}
        className={cn(
          'self-start',
          'my-0.5',
          'mr-1',
          'shrink-0',
          isCollected
            ? 'text-collected-foreground/70 hover:bg-collected-foreground/12 hover:text-collected-foreground'
            : 'text-caption hover:text-destructive'
        )}
        data-testid='giftDelete'
        aria-label={dict.deleteGift}
      >
        <Trash2 className='h-4 w-4' />
      </Button>
    </li>
  );
};

/**
 * The printed content of a cell, shared by the linked and unlinked variants so
 * the two cannot diverge.
 *
 * The cancellation is the signature moment of the whole app, so it lives here:
 * the member's own ink, a ring that comes down askew and settles square, over a
 * cell that has already gone to ink. One-shot, gated on `justChanged`, so
 * opening a list of five collected ideas stamps nothing.
 */
const GiftCardBody: React.FC<{
  gift: GiftCardProps['gift'];
  justChanged: boolean;
}> = ({ gift, justChanged }) => (
  <div
    className={cn(
      'relative',
      'min-w-0',
      'flex-1',
      'px-4',
      'py-3'
    )}
  >
    <h3
      data-testid='giftTitle'
      className={cn(
        /*
          The right-hand lane, kept clear for the cell's own corner furniture.

          This used to be documented as room for a numeral that never rendered,
          which is why it looked like dead space: 36px of a cell's measure that
          bought nothing. It does buy something. The trash button sits in the top
          right corner of every cell at `right-3`, 44px wide, so it reaches 56px
          in from the right edge - over the first line of the title. On a
          collected cell the cancellation ring sits further left still (`right-6`,
          44px, so 68px in) and vertically centred, which puts it beside the last
          line as readily as the first. Together with `px-4` this reservation is
          what keeps the title out of both.

          Measured rather than assumed: at 390px, without it, the two collected
          titles in the fixture run under the ring by 24x14px and 9x10px, and the
          ring's stroke crosses the glyphs - on the cells the design says should
          be the loudest thing on the sheet. With it, no line of any cell in the
          fixture touches either piece of furniture.
        */
        'pr-9',
        'break-words',
        'font-label',
        'text-[0.9375rem]',
        'font-bold',
        'uppercase',
        'leading-[1.35]',
        'tracking-[0.055em]',
        gift.isPurchased ? 'text-collected-foreground' : 'text-ink'
      )}
    >
      {gift.title}
    </h3>

    {gift.description && (
      <p
        className={cn(
          'mt-1.5',
          'max-w-[54ch]',
          'break-words',
          'text-[0.8125rem]',
          'leading-relaxed',
          gift.isPurchased ? 'text-collected-foreground/70' : 'text-caption'
        )}
      >
        {gift.description}
      </p>
    )}

    {gift.url && (
      /*
        The address of the thing, printed under the note the way a catalogue
        prints its reference. It is deliberately quiet and deliberately not a
        second link: the whole cell already navigates, and two controls doing one
        job is how a row starts lying about what it does. The mark in front of
        it says "this cell goes somewhere", and the whole cell is the target.
      */
      <span
        aria-hidden='true'
        className={cn(
          'mt-2',
          'flex',
          'items-center',
          'gap-1.5',
          'truncate',
          'font-label',
          'text-[0.6875rem]',
          'font-bold',
          'tracking-[0.06em]',
          'uppercase',
          'transition-colors',
          gift.isPurchased
            ? 'text-collected-foreground/50'
            : 'text-caption group-hover/cell:text-ink'
        )}
      >
        <ExternalLink className='h-3 w-3 shrink-0' strokeWidth={2.5} />
        {gift.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
      </span>
    )}

    {gift.isPurchased && (
      <span
        aria-hidden='true'
        className={cn(
          'pointer-events-none',
          'absolute',
          'right-5',
          'bottom-4',
          'block',
          'h-8',
          'w-8',
          'rounded-full',
          'border-[1.5px]',
          /*
            The member's own ink, resolved for THIS ground.

            A collected cell is the one surface in the app that is near-black in
            the light theme, and the tray under a name on the contents page is
            tuned for light paper: the same six values measure 2.06-3.78:1 here
            and read as faint outlines rather than stamps. So the ring reads
            `--member-ink-on-collected` - the same six hues lightened, which is
            what `--member-ink` already resolves to in the dark theme, so nothing
            about the dark ring changes. Measured after the change on the
            collected ground: 5.41-9.16:1 in light, and 5.88-9.97:1 in dark both
            before and after. The ring is `aria-hidden` (the tick carries
            `aria-pressed`), so this is legibility, not a contrast requirement -
            but redundancy still has to be legible.
          */
          'border-[var(--member-ink-on-collected)]',
          justChanged && 'animate-cancel-stamp'
        )}
      />
    )}
  </div>
);

export default memo(GiftCard);
