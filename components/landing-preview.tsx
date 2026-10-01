import React, { memo } from 'react';
import { CropMarks } from '@/components/ui/dialog';
import { giftCountLabel } from '@/lib/gift-count';
import { memberInkStyle } from '@/lib/member-ink';
import SheetProgress from '@/components/sheet-progress';
import { cn } from '@/lib/utils';
import type { Translations } from '@/types';

/**
 * The contents page, quoted.
 *
 * This used to be a quotation in wording only. It drew its own rows - an 18px
 * name with no rule under it, on the board inside a hairline box - while the
 * screen it claims to quote answered "what is still needed" with something
 * quite different on a sheet of label stock. A visitor comparing the two would
 * have seen two products. So the quotation is now drawn with the same
 * machinery the dashboard draws it with: the same sheet at the same inset, the
 * same crop marks, the same section label above a ruled head, the same row
 * anatomy - the name in Source Serif 4 at 20px on the left, that member's own
 * ink as a rule on the right, and the open count in printed numerals - and the
 * same words behind it for anyone who cannot see the figure.
 *
 * `SheetProgress` in `components/sheet-progress.tsx` is the authority for the
 * figure, and is imported rather than copied: a second copy is a second thing to
 * forget. See the note at the top of that file.
 *
 * It has to be a faithful quotation, not a flattering one, which cuts both
 * ways here. Every sample member is fully un-collected, so `pct` is 0 for all
 * three and the member's ink is set on every row and painted on none of them:
 * the quotation shows no colour at all. That is what the dashboard draws for
 * those three members too. Giving the rows some ink would need a `collected`
 * figure in `preview.members`, and that is approved copy in three locales.
 * Mia's dashed rule does carry through, because the approved data has a zero
 * there and a zero means "no list yet", which is a state worth quoting.
 */
const LandingPreview: React.FC<
  Pick<Translations, 'preview' | 'giftCount' | 'members'>
> = ({ preview, giftCount, members: membersHeading }) => (
  <figure className={cn('mt-16')}>
    {/*
      The caption stays on the board, outside the sheet. It is the catalogue's
      own sentence about the plate below it; printed on the sheet it would be a
      line of interface chrome that the real screen does not have, and this is a
      quotation.
    */}
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

    <div
      data-testid='landingQuote'
      className={cn(
        'relative',
        'mt-6',
        'border',
        'border-rule',
        'bg-sheet',
        'px-5',
        'py-6',
        'sm:px-8',
        'sm:py-7'
      )}
    >
      <CropMarks />

      {/* `MemberListHeader` without its two buttons: a specimen of the contents
          page, not a working one, and a quotation that offered "Add member"
          would be offering to add a member to a group that does not exist. */}
      <div
        className={cn('flex', 'flex-col', 'border-b', 'border-rule', 'pb-4')}
      >
        <h2 className='label-print pt-1 text-caption'>{membersHeading}</h2>
      </div>

      <ul className='divide-y divide-rule'>
        {preview.members.map((member) => (
          <li
            key={member.name}
            style={memberInkStyle(member.name)}
            className={cn(
              'grid',
              'grid-cols-[1fr_auto]',
              'items-center',
              'gap-6',
              'py-5'
            )}
          >
            <div className='flex w-full min-w-0 flex-col items-start gap-2'>
              <span className='max-w-full break-words'>
                <span
                  className={cn(
                    'font-serif',
                    'text-xl',
                    'font-semibold',
                    'leading-tight'
                  )}
                >
                  {member.name}
                </span>
              </span>
              <span className='sr-only'>
                {/*
                  `giftCountLabel`, not a second ladder. The inline ternary this
                  replaces mapped a zero to `giftCount.zero` - "nothing left to
                  buy" - on the same row that draws the dashed placeholder, which
                  everywhere else in this app means the opposite: no ideas at all,
                  and the member who most needs a present. The figure and the
                  words behind it were telling a visitor two opposite things
                  about the same person.
                */}
                {giftCountLabel(
                  {
                    unbought: member.count,
                    total: member.count + member.collected,
                  },
                  { giftCount }
                )}
              </span>
            </div>

            <SheetProgress
              unbought={member.count}
              total={member.count + member.collected}
            />
          </li>
        ))}
      </ul>
    </div>
  </figure>
);


export default memo(LandingPreview);