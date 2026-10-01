'use client';

import React, { memo } from 'react';
import { IconExternalLink, IconShoppingCart, IconShoppingCartMinus, IconShoppingCartPlus, IconTrash } from '@tabler/icons-react';
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
        // The sheet takes a press as the mark lands on it.
        justChanged && isCollected && 'animate-collect-settle'
      )}
    >
      {/*
        The tick is the whole toggle, and there is no second "mark as bought"
        button doing the same job. It sits in the left margin of the cell with a
        44px target, because that target was 20x20 in the previous system and it
        is the control the whole product exists for.

        `group/buy` is the hover group for the mark only. The cell already has a
        group (`group/cell`) for its own wash, and that group covers the whole
        row - so a mark that filled on it would fill while the pointer was
        anywhere in the cell, including on the body text a good 200px away from
        the mark itself.
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
          'group/buy',
          'grid',
          // `min-h-11`, not `h-11`. An explicit height beats the row's
          // `items-stretch`, so a fixed height left this column 44px tall and
          // pinned to the top: on a two-line row its `border-r` stopped short of
          // the cell's bottom edge, and on a one-line row the leftover below the
          // text read as a gap - most visibly on hover, when the wash filled
          // only the button's own box and stopped where the cell did not.
          //
          // `min-h-11` keeps the 44px floor on a one-line row and lets the column
          // stretch to whatever the row needs, so the rule and the hover wash
          // both run the full height. The width stays fixed: this is a margin
          // column, not a content one.
          'min-h-11',
          'w-11',
          'shrink-0',
          'place-items-center',
          'border-r',
          'border-rule',
          'transition-colors',
          'duration-150',
          isCollected
            ? 'text-[var(--member-ink-on-collected)]'
            : 'text-caption hover:bg-wash hover:text-ink',
          isPending && 'pointer-events-none opacity-60'
        )}
      >
        {/*
          The cart, in four states. The glyph never changes - it is a cart in
          every state - and the STATE is carried by colour, not by a different
          icon. That is the whole point: a mark that swaps its own shape when you
          hover it cannot be read at rest, and the resting state is the one the
          whole group sees all day.

              open                a plain cart, receded
              open  + pointer     the same cart with a plus    (click: buy it)
              bought              the same cart, in the member's ink
              bought + pointer    the same cart with a minus   (click: undo)

          So hover shows the ACTION, and the colour shows the STATE. An earlier
          version swapped x for plus on hover, which inverted the meaning of
          hover: it showed the mark's state instead of the action, and the user
          could not tell what a click would do.

          Tabler ships no filled cart either, so the bought state cannot be a
          fill. Ink is the channel, and it is one the cell already uses.
        */}
        <>
          <IconShoppingCart
            aria-hidden='true'
            className={cn(
              'col-start-1',
              'row-start-1',
              'h-5',
              'w-5',
              '[@media(hover:hover)_and_(pointer:fine)]:group-hover/buy:hidden'
            )}
          />
          {isCollected ? (
            <IconShoppingCartMinus
              aria-hidden='true'
              className={cn(
                'col-start-1',
                'row-start-1',
                'h-5',
                'w-5',
                'hidden',
                '[@media(hover:hover)_and_(pointer:fine)]:group-hover/buy:block'
              )}
            />
          ) : (
            <IconShoppingCartPlus
              aria-hidden='true'
              className={cn(
                'col-start-1',
                'row-start-1',
                'h-5',
                'w-5',
                'hidden',
                '[@media(hover:hover)_and_(pointer:fine)]:group-hover/buy:block'
              )}
            />
          )}
        </>
      </button>

      {gift.url ? (
        <a
          href={gift.url}
          target='_blank'
          rel='noopener noreferrer'
          className={interactiveClasses}
        >
          <GiftCardBody gift={gift} />
        </a>
      ) : (
        <div className={interactiveClasses}>
          <GiftCardBody gift={gift} />
        </div>
      )}

      <Button
        variant='ghost'
        size='icon'
        onClick={handleDelete}
        className={cn(
          // Same correction as the tick column, for the same reason: `self-start`
          // plus the primitive's `h-11` pinned this control to the top, so its
          // hover wash filled 44px and stopped while the cell kept going. On a
          // one-line row that left the gap the left column had just been fixed
          // for, mirrored on the right.
          //
          // `h-auto` beats the primitive's `h-11` through twMerge, so the row's
          // `items-stretch` takes effect; `min-h-11` holds the 44px floor on a
          // one-line row. `my-0.5` and `mr-1` both had to go: a margin is a
          // fixed offset, and the first defeated the stretch while the second
          // left a 4px gap at the cell's right edge that read as unfinished once
          // the wash began spanning the column. The control now fills the cell's
          // content box on all three sides, square with the tick column opposite.
          'h-auto',
          'min-h-11',
          'self-stretch',
          'shrink-0',
          isCollected
            ? 'text-collected-foreground/70 hover:bg-collected-foreground/12 hover:text-collected-foreground'
            : 'text-caption hover:bg-wash hover:text-destructive'
        )}
        data-testid='giftDelete'
        aria-label={dict.deleteGift}
      >
        <IconTrash className='h-4 w-4' />
      </Button>
    </li>
  );
};

/**
 * The printed content of a cell, shared by the linked and unlinked variants so
 * the two cannot diverge.
 *
 * It carries no state of its own any more. The one thing that used to live here
 * - the cancellation ring - moved into the left margin, where the control it
 * belonged to already was, so the signature moment is now a 2px settle on the
 * cell (`animate-collect-settle`, above) rather than something drawn in here.
 */
const GiftCardBody: React.FC<{
  gift: GiftCardProps['gift'];
}> = ({ gift }) => (
  <div
    className={cn(
      'min-w-0',
      'flex-1',
      /*
        The measure, and nothing more.

        This box used to reserve a 52px lane at its trailing edge, sized so the
        text stopped exactly on the left stroke of the cancellation ring in the
        corner. Measured at 390px, the last line of the longest description in
        the fixture reached 52.16px from this edge - 0.16px of clearance, a
        coincidence that becomes an intersection on any machine whose font
        metrics differ by a hundredth of a pixel. Two repairs on this branch have
        already been spent on that class of coupling.

        The ring is gone, so the lane is re-cut from what actually occupies the
        cell's right end: the delete button, and nothing else. The collected mark
        is in the left margin, so it is not in this lane at all. The button is
        this box's own flex sibling, so its left edge IS this box's right edge,
        and the widest thing in the lane is the 16px `px-4` on the other side of
        the cell.

        Which makes the answer the simple one: `px-4` on both sides, 16px of
        clearance to the delete button against a required minimum of 4, and a
        cell that is finally symmetric. It is unconditional, so collecting an idea
        does not reflow the cell - the failure mode that a lane on collected
        cells only would have had. Re-measure before widening or narrowing it.
      */
      'px-4',
      'py-3'
    )}
  >
    <h3
      data-testid='giftTitle'
      className={cn(
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
        <IconExternalLink className='h-3 w-3 shrink-0' stroke={2.5} />
        {/*
          `truncate` lives here and not on the flex row above, and the reason is
          the whole of Finding 6. `text-overflow: ellipsis` needs a block box to
          act on a text node, and on the row itself the address is an anonymous
          flex item - so the row's own `truncate` never reached it and a long URL
          was cut off mid-glyph with no ellipsis and nothing to say there was
          more. As its own flex item the address still refuses to shrink, because
          a flex item's `min-width: auto` floors it at its min-content width and
          `nowrap` makes that the whole string. `min-w-0` is what releases that
          floor, and with it `truncate` works: the address now visibly runs out.
        */}
        <span className='min-w-0 truncate'>
          {gift.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </span>
      </span>
    )}
  </div>
);

export default memo(GiftCard);
