'use client';

import React, { memo } from 'react';
import { Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import type { GiftCardProps } from '@/types';

/**
 * One row of a list, not a card: no border box, no shadow, no radius - a hairline
 * above and the writing on the page.
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

  // The tick and the delete button are siblings of the link, not children of
  // it, so there is no nested-interactive default to suppress and no ancestor
  // click handler to stop: the row is a plain flex of three independent
  // controls.
  const handleDelete = () => {
    debouncedDelete(gift.id);
  };

  const handleTogglePurchased = () => {
    onTogglePurchased(gift.id);
  };

  const isPending = togglingId === gift.id;
  // The state is persistent - a bought gift idea stays struck and stays
  // receded - but the motion is one-shot, confined to the row that changed.
  const justChanged = changedId === gift.id;

  /*
    Shared by the linked and unlinked variants so the two cannot drift. The
    hover is `--color-accent`, the same 8% ink wash every other interactive
    surface in the app uses, so there is one hover value rather than three.
  */
  const interactiveClasses = cn(
    'min-w-0',
    'flex-1',
    'rounded-md',
    'transition-colors',
    'duration-150',
    'hover:bg-accent'
  );

  return (
    <li
      className={cn(
        'flex',
        'items-start',
        'gap-2',
        'border-b',
        'border-border',
        'last:border-b-0',
        'transition-colors',
        gift.isPurchased && 'bg-band',
        justChanged && gift.isPurchased && 'animate-settle-in'
      )}
    >
      {/*
        The tick is the whole toggle, and there is no second "mark as bought"
        button doing the same job: a square beside a line of a list is
        understood without a label, and the stroke it draws is the feedback.
      */}
      <button
        type='button'
        onClick={handleTogglePurchased}
        // `pointer-events-none` below only stops the mouse. Without `disabled`
        // the button stays keyboard-activatable, so Enter or Space during an
        // in-flight toggle fires a second request.
        disabled={isPending}
        aria-pressed={gift.isPurchased}
        aria-label={gift.isPurchased ? dict.markAsAvailable : dict.markAsPurchased}
        data-testid='giftStrikethrough'
        className={cn(
          'mt-4',
          'grid',
          'h-5',
          'w-5',
          'shrink-0',
          'place-items-center',
          'rounded-[5px]',
          'border-[1.5px]',
          'transition-colors',
          'duration-150',
          gift.isPurchased
            ? 'border-strike bg-strike text-surface'
            : 'border-border text-transparent hover:border-foreground/50',
          isPending && 'pointer-events-none opacity-60'
        )}
      >
        <Check className={cn('h-3.5', 'w-3.5')} strokeWidth={3} />
      </button>

      {gift.url ? (
        <a
          href={gift.url}
          target='_blank'
          rel='noopener noreferrer'
          className={interactiveClasses}
          data-testid='giftCard'
        >
          <GiftCardBody gift={gift} justChanged={justChanged} />
        </a>
      ) : (
        <div className={interactiveClasses} data-testid='giftCard'>
          <GiftCardBody gift={gift} justChanged={justChanged} />
        </div>
      )}

      <Button
        variant='ghost'
        size='icon'
        onClick={handleDelete}
        className={cn(
          'mt-2.5',
          'h-9',
          'w-9',
          'shrink-0',
          'text-muted-foreground',
          'transition-colors',
          'hover:text-destructive'
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
 * The text of a row, shared by the linked and unlinked variants so the two cannot
 * diverge.
 */
const GiftCardBody: React.FC<{
  gift: GiftCardProps['gift'];
  justChanged: boolean;
}> = ({ gift, justChanged }) => (
  <div
    className={cn('px-1', 'sm:px-1', 'pt-4', 'pb-3', 'pr-0')}
  >
    <h3
      data-testid='giftTitle'
      className={cn(
        'break-words',
        'text-[0.9375rem]',
        'font-medium',
        'leading-snug',
        // The strike. The only marigold in the interface and the only animation
        // worth spending on: someone in the group bought this, so one stroke
        // draws across the title while the row settles into the sheet. Bought
        // items recede, so the ones still needing a present carry the weight.
        gift.isPurchased
          ? 'text-muted-foreground line-through decoration-[1.5px] decoration-strike'
          : 'text-foreground',
        justChanged && gift.isPurchased && 'animate-strike-in'
      )}
    >
      {gift.title}
    </h3>
    {gift.description && (
      <p
        className={cn(
          'mt-0.5',
          'break-words',
          'text-[0.8125rem]',
          'leading-relaxed',
          'text-muted-foreground'
        )}
      >
        {gift.description}
      </p>
    )}
    {gift.url && (
      // Quiet meta, not an accent: the whole row is already the link.
      <span
        className={cn(
          'mt-1',
          'block',
          'truncate',
          'text-[0.8125rem]',
          'text-muted-foreground'
        )}
      >
        {gift.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
      </span>
    )}
  </div>
);

export default memo(GiftCard);
