import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import type { Translations } from '@/types';

/**
 * The landing page shows the contents page itself rather than describing it.
 *
 * This is a quotation, so it is framed the way a quotation is framed: square
 * corners, a printed rule around it, and the rows inside it drawn with the same
 * anatomy the dashboard uses. It used to render the count as a sentence, which
 * meant the marketing copy described one screen and then showed a different
 * one - the dashboard now answers "what is still needed" with a figure rather
 * than a sentence, so the figure is what gets quoted here.
 *
 * The sample members carry open counts only, which is why every cell in the
 * figure is open. That is honest rather than approximate: the copy is about what
 * still needs buying.
 */
const LandingPreview: React.FC<
  Pick<Translations, 'preview' | 'giftCount' | 'members'>
> = ({ preview, giftCount, members: membersHeading }) => (
  // The `pt-12` is the gap, and it is the whole mechanism by which this block
  // fills what used to be an empty lower third: there is no auto margin and no
  // flex growth behind it, just the content.
  <figure className={cn('pt-12')}>
    <figcaption
      className={cn(
        'max-w-[52ch]',
        'text-[0.9375rem]',
        'leading-relaxed',
        'text-caption'
      )}
    >
      {preview.lead}
    </figcaption>

    <div className={cn('mt-4', 'border', 'border-rule', 'bg-board')}>
      <div className={cn('px-4', 'py-4', 'sm:px-5', 'sm:py-5')}>
        <h2 className='label-print pt-1 text-caption'>{membersHeading}</h2>
        <ul className='mt-3'>
          {preview.members.map((member) => (
            <li
              key={member.name}
              className={cn(
                'flex',
                'items-center',
                'justify-between',
                'gap-4',
                'border-t',
                'border-rule',
                'py-3'
              )}
            >
              <span className='min-w-0'>
                <span
                  className={cn(
                    'font-serif',
                    'text-lg',
                    'font-semibold',
                    'leading-tight'
                  )}
                >
                  {member.name}
                </span>
              </span>

              <span aria-hidden='true' className='flex shrink-0 items-center gap-3'>
                <span className='flex flex-wrap justify-end gap-[3px]'>
                  {member.count === 0 ? (
                    <span className='block h-3.5 w-3.5 border border-dashed border-rule' />
                  ) : (
                    Array.from({ length: Math.min(member.count, 14) }).map(
                      (_, i) => (
                        <span
                          key={i}
                          className='block h-3.5 w-3.5 border border-rule bg-cell'
                        />
                      )
                    )
                  )}
                </span>
                <span
                  className={cn(
                    'font-label',
                    'min-w-[2ch]',
                    'text-right',
                    'text-[0.8125rem]',
                    'font-bold',
                    'tabular-nums',
                    'tracking-[0.06em]',
                    member.count > 0 ? 'text-ink' : 'text-caption'
                  )}
                >
                  {member.count}
                </span>
              </span>

              <span className='sr-only'>
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
