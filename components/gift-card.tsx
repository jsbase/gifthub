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
 */
const GiftCard: React.FC<GiftCardProps> = ({
  gift,
  dict,
  onDelete,
  onTogglePurchased,
  animatedGiftId,
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

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    debouncedDelete(gift.id);
  };

  const handleTogglePurchased = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTogglePurchased(gift.id);
  };

  const isPending = animatedGiftId === gift.id;

  const content = (
    <div
      className={cn(
        'flex',
        'items-start',
        'gap-3',
        'px-2',
        'sm:px-3',
        'pt-4',
        'pb-3'
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
        aria-pressed={gift.isPurchased}
        aria-label={gift.isPurchased ? dict.markAsAvailable : dict.markAsPurchased}
        data-testid='giftStrikethrough'
        className={cn(
          'mt-0.5',
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

      <div className='min-w-0 flex-1'>
        <h3
          data-testid='giftTitle'
          className={cn(
            'break-words',
            'text-[0.9375rem]',
            'font-medium',
            'leading-snug',
            // The strike. The only marigold in the interface and the only
            // animation worth spending on: someone in the group bought this, so
            // one stroke draws across the title while the row settles back into
            // the sheet. Bought items recede, so the ones still needing a present
            // are the ones that carry the weight.
            gift.isPurchased
              ? 'animate-strike-in text-muted-foreground line-through decoration-[1.5px] decoration-strike'
              : 'text-foreground'
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
    </div>
  );

  const interactiveClasses = cn(
    'min-w-0',
    'flex-1',
    'rounded-md',
    'transition-colors',
    'duration-150',
    'hover:bg-foreground/[0.04]'
  );

  return (
    <li
      className={cn(
        'flex',
        'items-start',
        'gap-1',
        'border-b',
        'border-border',
        'last:border-b-0',
        'transition-colors',
        gift.isPurchased && 'animate-settle-in bg-bought'
      )}
    >
      {gift.url ? (
        <a
          href={gift.url}
          target='_blank'
          rel='noopener noreferrer'
          className={interactiveClasses}
          data-testid='giftCard'
        >
          {content}
        </a>
      ) : (
        <div className={interactiveClasses} data-testid='giftCard'>
          {content}
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

export default memo(GiftCard);
