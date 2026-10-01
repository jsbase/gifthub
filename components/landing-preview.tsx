import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import type { Translations } from '@/types';

/**
 * The landing page's lower third used to be ~170px of nothing, and the three
 * feature columns were doing all the explaining. This shows the thing instead:
 * a real member list, with the same row anatomy and the same count strings the
 * dashboard uses, so it cannot drift away from what a member actually sees.
 *
 * It is framed in a hairline with square corners rather than a rounded card,
 * because it is a quotation of a screen and not part of this one.
 */
const LandingPreview: React.FC<
  Pick<Translations, 'preview' | 'giftCount' | 'members'>
> = ({ preview, giftCount, members: membersHeading }) => (
  <figure className={cn('mt-auto', 'pt-12')}>
    <figcaption
      className={cn(
        'max-w-[52ch]',
        'text-[0.9375rem]',
        'leading-relaxed',
        'text-muted-foreground'
      )}
    >
      {preview.lead}
    </figcaption>

    <div className={cn('mt-4', 'border', 'border-border', 'bg-band')}>
      <div className={cn('px-4', 'py-4', 'sm:px-5', 'sm:py-5')}>
        <h2
          className={cn(
            'text-xl',
            'font-semibold',
            'leading-none',
            'tracking-[-0.01em]'
          )}
        >
          {membersHeading}
        </h2>
        <ul className={cn('mt-4')}>
          {preview.members.map((member) => (
            <li
              key={member.name}
              className={cn(
                'flex',
                'items-baseline',
                'justify-between',
                'gap-4',
                'border-t',
                'border-border',
                'py-2.5'
              )}
            >
              <span className={cn('font-serif', 'text-lg', 'font-semibold')}>
                {member.name}
              </span>
              <span
                className={cn(
                  'shrink-0',
                  'text-[0.8125rem]',
                  member.count > 0
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {member.count === 0
                  ? giftCount.zero
                  : member.count === 1
                  ? giftCount.one
                  : giftCount.many.replace('{{count}}', String(member.count))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </figure>
);

export default memo(LandingPreview);
