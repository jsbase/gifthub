'use client';

import React, { memo, useCallback, useEffect, useRef } from 'react';
import { IconBadgeAd, IconExternalLink, IconShoppingCart, IconShoppingCartMinus, IconShoppingCartPlus, IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { affiliateFor } from '@/lib/affiliate';
import { cn } from '@/lib/utils';
import type { GiftCardProps } from '@/types';

/**
 * How long a finger has to rest on a cell before it counts as a selection.
 *
 * Named rather than inlined because the same number appears in a comment three
 * times and a comment that quotes a different number than the code is worse than no
 * comment. Long enough that a thumb settling onto a cell while scrolling does not
 * fire it, short enough that twelve wishes do not become twelve deliberate holds.
 */
const LONG_PRESS_MS = 500;

/**
 * How far the pointer may travel before a press stops being a press.
 *
 * Ten pixels, and the reason it exists is the one interaction this cell has that
 * the others do not: the sheet scrolls under the finger. A long press that survived
 * a scroll would select wishes the reader was trying to scroll past, silently and in
 * bulk - which on a phone is the difference between filing twelve wishes wrongly and
 * filing twelve wishes rightly.
 *
 * Cancelling rather than committing on movement is the safe direction. A reader who
 * meant to select and moved a little can press again; a reader who meant to scroll
 * and got a selection would have to find the bar and clear it.
 */
const LONG_PRESS_SLOP_PX = 10;

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
 * The row is a flex of four siblings - the selection box, the tick, the link, the
 * delete button. They cannot be nested: interactive content inside an `<a>` is
 * invalid HTML, it is axe-core's `nested-interactive`, and it makes the link's
 * accessible name recurse into the tick's label, so the link would announce as
 * "Mark as bought, <title>, <url>". Tab also reached the tick from inside the link,
 * and Enter navigated away instead of ticking.
 *
 * Three of the four are conditional, and *how* they are conditional is the whole
 * point of this component having been rewritten for individual accounts:
 *
 *   - The delete button is absent for a reader who may not delete, not disabled.
 *     A greyed-out bin asks whether the app is broken or the rule is deliberate,
 *     and those two need different words - which is why the sheet shows an
 *     invited account none of the owner-only surface and then says so in a
 *     sentence above it.
 *   - The selection box is absent until the sheet is in a transfer mode,
 *     and absent for a reader who may not transfer, for exactly that
 *     reason: the transfer is owner-only (`lib/list-access.ts`), and a
 *     buyer - or an owner merely browsing - looking at a column of boxes
 *     they may not use would be reading an invitation the server refuses.
 *     The boxes appear the moment a mode is entered, because that is the
 *     moment selecting a wish becomes something the sheet can do with one.
 *   - The mark is a **stamp rather than a button** when this reader may not clear
 *     this particular mark: the owner, on an idea somebody has already marked.
 *     The column keeps its place, its 44px measure and its rule, and the cart
 *     keeps the owner's ink - so the state still reads on all three channels
 *     (inverted cell, inked mark, `aria-pressed` on the live marks) and the cell
 *     does not reflow because of who is looking at it. Only the ability to press
 *     it is gone.
 */
const GiftCard: React.FC<GiftCardProps> = ({
  gift,
  dict,
  onDelete,
  onTogglePurchased,
  onToggleSelected,
  isSelected,
  transferringIds,
  canSelect,
  togglingId,
  changedId,
  canDelete,
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

  /*
    The long-press timer, and the point it was started from.

    A `useRef` rather than state because it is touched on pointer events at a rate
    that would re-render the cell on every move, and because a press that starts on
    this cell has to stay attached to this cell even if the sheet re-renders under
    the finger. The origin is stored beside it because the 10px rule needs to
    compare against where the finger *landed*, not against wherever it has got to.
  */
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);

  /*
    Whether the press that is ending has already been spent on a selection.

    A hold that selects a wish is a whole gesture, and what the browser does when the
    finger lifts is not up to it: many touch browsers still deliver a `click` to
    whatever is under the finger, and some open their own context menu while it is
    held. Both are wrong here and the first is worse than it sounds. The cell has a
    mark button and a delete button of its own and only the checkbox opts out of the
    press (`data-no-longpress`), so holding a thumb on the cart would select the wish
    *and* then mark it bought - a change to a shared mark, made by a gesture that was
    meant to do something else.

    So the cell remembers that the timer fired, swallows the one click that can follow
    it (in the capture phase, before a child's own handler sees it) and refuses the
    context menu. It is cleared by the next press, not by the click: some browsers
    send no click after a long press at all, and a flag that waited for one would eat
    the next real tap instead.
  */
  const longPressFired = useRef(false);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pressOrigin.current = null;
  }, []);

  /*
    Cleared on unmount, which is the case that would otherwise leak: the pointer can
    be released over a *different* element - the sheet scrolled, or a dialog opened -
    so this cell never sees the `pointerup` that would have cancelled the timer, and
    a wish would be selected by a press the reader abandoned.
  */
  useEffect(() => cancelLongPress, [cancelLongPress]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      // A new press starts clean, whatever kind of pointer it is: the flag belongs to
      // the previous gesture, and a mouse click after a touch hold is not part of it.
      longPressFired.current = false;

      /*
        Only a primary pointer, and never for the reader who is already using
        the keyboard or the checkbox: a long press on a cell is a *second* way to
        reach the same selection - both paths exist only inside a transfer mode -
        so it must not fire while the pointer is on the
        control that already does it - otherwise one press on the checkbox would both
        check it and toggle it back.
      */
      if (!canSelect || event.pointerType === 'mouse' || event.button !== 0) {
        return;
      }
      if ((event.target as HTMLElement).closest('[data-no-longpress]')) return;

      pressOrigin.current = { x: event.clientX, y: event.clientY };
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        pressOrigin.current = null;
        longPressFired.current = true;
        onToggleSelected(gift.id);
      }, LONG_PRESS_MS);
    },
    [canSelect, gift.id, onToggleSelected]
  );

  const handleClickCapture = useCallback((event: React.MouseEvent) => {
    if (!longPressFired.current) return;
    longPressFired.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  /*
    Refused while a press is in progress or has just selected, and only then. A mouse
    never starts the timer, so a right-click keeps its menu; it is the touch hold -
    which some browsers answer with a menu of their own just as the timer fires - that
    would otherwise open over the selection it has just made.
  */
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    if (longPressFired.current || longPressTimer.current !== null) {
      event.preventDefault();
    }
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (longPressTimer.current === null || !pressOrigin.current) return;
      const moved = Math.hypot(
        event.clientX - pressOrigin.current.x,
        event.clientY - pressOrigin.current.y
      );
      if (moved > LONG_PRESS_SLOP_PX) cancelLongPress();
    },
    [cancelLongPress]
  );

  const handleDelete = () => {
    debouncedDelete(gift.id);
  };

  const handleTogglePurchased = () => {
    onTogglePurchased(gift.id);
  };

  const handleToggleSelected = () => {
    onToggleSelected(gift.id);
  };

  const isPending = togglingId === gift.id;
  /*
    This row is part of a batch whose transfer is in flight. It is dimmed rather
    than locked on its own, and the whole cell is inert below - because a row the
    reader can still uncheck mid-transfer would be a selection that changed after the
    request was built.
  */
  const isTransferring = transferringIds.includes(gift.id);
  // The state is persistent - a collected idea stays inverted and stays in the
  // album - but the motion is one-shot, confined to the cell that changed.
  const justChanged = changedId === gift.id;
  const isCollected = gift.isPurchased;

  // Once, because the link and the mark that says it is an advertisement have to
  // come from the same answer. The printed address below keeps `gift.url`: only
  // the `href` is rewritten, so the sheet never shows our tracking under a wish.
  const link = gift.url ? affiliateFor(gift.url) : null;

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
    !isCollected && '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-wash'
  );

  return (
    <li
      data-testid='giftCard'
      data-selected={isSelected ? 'true' : undefined}
      onPointerDown={canSelect ? handlePointerDown : undefined}
      onPointerMove={canSelect ? handlePointerMove : undefined}
      onPointerUp={canSelect ? cancelLongPress : undefined}
      onPointerCancel={canSelect ? cancelLongPress : undefined}
      onPointerLeave={canSelect ? cancelLongPress : undefined}
      onClickCapture={canSelect ? handleClickCapture : undefined}
      onContextMenu={canSelect ? handleContextMenu : undefined}
      className={cn(
        'group/cell',
        'flex',
        'items-stretch',
        'gap-0',
        /*
          Three sides, not four.

          The cell used to draw `border` - a box - *and* sit in a `<ul>` with
          `divide-y`. Three mechanisms drawing the same 1px line in the same
          place: adjacent cells put cell 1's bottom stroke directly on top of cell
          2's top stroke and the divider between them, and the run's first cell put
          its own top stroke 16px under the section head's rule. A sheet with two
          sections and three ideas ended up with seven horizontal lines in 350px,
          all the same weight, and a reader could not assign any of them to
          anything - which is the whole complaint, expressed as a picture.

          So the cell draws what only it can draw: the two verticals that close its
          sides, and the bottom rule that separates it from the idea below. Its top
          edge belongs to the block, and the block's boundary is drawn once, above
          the section label. One line, one job, one owner.
        */
        /*
          All four sides, which is what it was. The run of cells was changed to three
          sides so that a block boundary and a cell edge would not be the same line
          sixteen pixels apart - and in doing that the cells stopped reading as cells,
          which is a worse loss than the doubled line was. The block's own boundary
          now sits under the section head, on the other side of the label, so the two
          lines are far enough apart to be about different things.
        */
        'border',
        'border-rule',
        'transition-colors',
        'duration-200',
        isCollected ? 'bg-collected text-collected-foreground' : 'bg-cell text-ink',
        // The sheet takes a press as the mark lands on it.
        justChanged && isCollected && 'animate-collect-settle',
        /*
          Selection is an OUTLINE and nothing else, and the reason is that the
          inverted cell is already spent. A bought idea is read on three channels -
          the inverted field, the owner's ink in the margin, and `aria-pressed` on
          the live marks - and `PRODUCT.md:112` requires all three to stay intact.
          An inverted or filled selection state would put a second meaning on the
          one channel the bought state is already using, which is how this sheet has
          produced a bug once already: two states competing for one signal.

          A ring draws *outside* the border and so cannot be confused with the cell's
          own edge, and it is the one treatment that reads on a collected cell
          without either state hiding the other.
        */
        isSelected &&
          'outline-2 outline-offset-[-2px] outline-ink',
        /*
          The whole cell goes inert while its row is in a batch being transferred.
          `pointer-events-none` rather than `disabled` on the two controls, because
          they are a button and a checkbox and a disabled checkbox is announced as
          unavailable rather than as busy - and the reason it is here at all is that
          unchecking a row mid-flight would change the selection after the request
          was built.
        */
        isTransferring && 'pointer-events-none opacity-60'
      )}
    >
      {/*
         The selection checkbox, in a 44px column before the mark - and
         only while the sheet is in a transfer mode, because that is the
         only time a selection is a thing the sheet can do with a wish.

         A real `<input type="checkbox">` with a visible label rather than a `<div>`
         with a click handler, and that is not a detail: this is the accessible path
         to the whole feature. A div would be reachable by mouse and by nothing else -
         not by Tab, not announced as a checkbox, not toggled by Space - and the
         feature's alternative is a 500ms press, which no keyboard can produce at all.

        `data-no-longpress` is on the input so that the long-press on the cell does
        not also fire when the reader's thumb lands on the box: one press must not
        select and deselect.

         The column is identical in width, measure and rule to the mark column
         opposite, so a cell does not reflow depending on who owns it - the same
         property that keeps the mark's stamp from reflowing the cell for an owner.

         The name announced for the box is `selectGiftNamed`, the plain
         `selectGift` with the wish's title in it, because every box on the
         sheet would otherwise carry the same name: a reader working through a
         transfer mode hears what the control is but never which wish it
         belongs to, and the title is the fact the cell's text gives a sighted
         owner.
       */}
      {canSelect && (
        <div className='grid min-h-11 w-11 shrink-0 place-items-center border-r border-rule'>
          <input
            type='checkbox'
            checked={isSelected}
            onChange={handleToggleSelected}
            disabled={isTransferring}
            aria-label={dict.selectGiftNamed.replace('{title}', gift.title)}
            data-no-longpress
            data-testid='giftSelect'
            className='h-4 w-4 cursor-pointer accent-ink'
          />
        </div>
      )}
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

        The stamp branch below is the same column with the control taken off it.

        `gift.canClear` rather than anything derived here, because this component
        cannot derive it: the answer follows from `purchasedById`, which must never
        reach the browser, so the server sends the permission instead of the fact it
        came from. See `mayClearMark` in `lib/list-access.ts`.
      */}
      {gift.canClear ? (
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
            : 'text-caption [@media(hover:hover)_and_(pointer:fine)]:hover:bg-wash [@media(hover:hover)_and_(pointer:fine)]:hover:text-ink',
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
      ) : (
        /*
          The same column with the control taken off it.

          This is the owner's view of a mark somebody else set: the mark is a fact
          about the sheet, not an invitation, and `lib/list-access.ts` refuses the
          owner for clearing it. It is drawn rather than hidden because the ink is
          one of the three channels the collected state is read on - inverted
          cell, owner's ink, rule fill - and dropping the mark would take one of
          them away while leaving the other two to do the work alone. `aria-hidden`
          because a shape is not an announcement and there is no action to name;
          the sentence that says why it cannot be pressed is printed once at the
          head of the collected section.

          Keeping the column identical in width, measure and rule is what stops the
          cell from reflowing for a reader who happens to own it. Nothing about
          the two cells would be different if the span were not here.
        */
        <span
          aria-hidden='true'
          data-testid='giftMark'
          className={cn(
            'grid',
            'min-h-11',
            'w-11',
            'shrink-0',
            'place-items-center',
            'border-r',
            'border-rule',
            isCollected
              ? 'text-[var(--member-ink-on-collected)]'
              : 'text-caption'
          )}
        >
          <IconShoppingCart className='h-5 w-5' />
        </span>
      )}

      {link ? (
        <a
          href={link.href}
          target='_blank'
          rel='noopener noreferrer'
          className={interactiveClasses}
        >
          <GiftCardBody
            gift={gift}
            affiliateNotice={link.earns ? dict.affiliateNotice : undefined}
          />
        </a>
      ) : (
        <div className={interactiveClasses}>
          <GiftCardBody gift={gift} />
        </div>
      )}

      {canDelete && (
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
              ? 'text-collected-foreground/70 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-collected-foreground/12 [@media(hover:hover)_and_(pointer:fine)]:hover:text-collected-foreground'
              : 'text-caption [@media(hover:hover)_and_(pointer:fine)]:hover:bg-wash [@media(hover:hover)_and_(pointer:fine)]:hover:text-destructive'
          )}
          data-testid='giftDelete'
          aria-label={dict.deleteGift}
        >
          <IconTrash className='h-4 w-4' aria-hidden='true' />
        </Button>
      )}
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
  /**
   * Present exactly when the link out of this cell is one we tag and earn from.
   * The text and the decision both come from the parent, so the body draws a mark
   * and never works out for itself whether a mark is owed.
   */
  affiliateNotice?: string;
}> = ({ gift, affiliateNotice }) => (
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
    <div className='flex items-start gap-2'>
      {affiliateNotice && (
        <>
          {/*
            The mark's name for assistive technology, first because the icon is first.
            The icon below is decorative and its tooltip is a pointer's, so without
            this the link would announce as an ordinary one while the page shows it
            is an advertisement - a disclosure for sighted readers only. It is inside
            the link on purpose: the cell is one link, and a second control for the
            mark would be the nested-interactive problem this file already spent a
            finding on.
          */}
          <span className='sr-only'>{affiliateNotice}</span>
          {/*
            The advertisement mark, in front of the title where it reads as part of
            what the cell offers and not as a footnote to its address. It is not a
            control: the cell is the link and this is a label on it, so hover is all
            a pointer gets. That is deliberately not the only way to know - the icon
            is on the cell at all times, which is what makes it recognisable as an
            advertisement on a phone where nothing hovers.

            Drawn at full strength even on a collected cell, where the title around it
            changes: the mark is a disclosure, and one that fades with the wish's
            state is hardest to read exactly when the cell has been dealt with and the
            link is still live.

            The tooltip opens to the right and upward because the mark is at the
            cell's leading edge; the width it needs is the cell's.
          */}
          <span
            aria-hidden='true'
            className={cn(
              'group/ad',
              'relative',
              'mt-px',
              'flex',
              'shrink-0',
              'transition-colors',
              gift.isPurchased
                ? 'text-collected-foreground'
                : 'text-caption hover:text-ink'
            )}
          >
            <IconBadgeAd className='h-[1.125rem] w-[1.125rem]' stroke={1.75} />
            <span
              className={cn(
                'pointer-events-none',
                'invisible',
                'absolute',
                'bottom-full',
                'left-0',
                'z-20',
                'mb-1.5',
                'w-max',
                'max-w-[16rem]',
                'rounded-sm',
                'bg-ink',
                'px-2.5',
                'py-1.5',
                'font-sans',
                'text-[0.75rem]',
                'font-normal',
                'normal-case',
                'leading-snug',
                'tracking-normal',
                'text-ink-foreground',
                'group-hover/ad:visible'
              )}
            >
              {affiliateNotice}
            </span>
          </span>
        </>
      )}
      <h3
        data-testid='giftTitle'
        className={cn(
          'min-w-0',
          'break-words',
          /*
            Two lines, then an ellipsis. The wish title is the largest object in the
            cell and the thing a buyer reads from across the room, so it is never
            truncated to one line - but it is clamped, because a wish written before the
            field had a limit is still in the database and will otherwise fill the
            viewport and push the rest of the sheet off the page.

            `line-clamp` rather than `truncate` because `truncate` is one line and a
            two-word German compound does not fit in one line at 390px. Both leave a
            horizontal scrollbar out of the cell: the clamp adds an ellipsis inside the
            box and keeps the content width inside the cell's own border, which is the
            property that matters on a phone.

            `min-w-0` because the title is now a flex item beside the mark, and a flex
            item will not shrink below its content without it: the clamp would never
            get a narrower box to clamp to.
          */
          'line-clamp-2',
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
    </div>

    {gift.description && (
      <p
        className={cn(
          'mt-1.5',
          'max-w-[54ch]',
          'break-words',
          /*
            Six lines. The note is the other unbounded text in the cell and it was the
            other half of the problem: a 600-character note at `text-[0.8125rem]`
            with `leading-relaxed` is a wall about eleven lines tall, and a cell with
            three of them is a page. Six is enough for a sentence and a link, which is
            what a note is for.
          */
          'line-clamp-6',
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
