import React, { memo } from 'react';
import { CropMarks } from '@/components/ui/dialog';
import { giftCountLabel } from '@/lib/gift-count';
import { memberInkStyle } from '@/lib/member-ink';
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
 * `SheetProgress` in `member-list.tsx` is the authority for the figure and is
 * reimplemented here rather than imported, because the two live on opposite
 * sides of a login and pulling a dashboard row onto a public page to draw three
 * sample lines would be worse coupling than the duplication. The geometry below
 * is therefore a copy, and it has to be edited when that component is edited.
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
                  { unbought: member.count, total: member.count },
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

/**
 * How far along this member's sheet is: the numeral is how many ideas are still
 * open, the rule is how much of the sheet has been dealt with, filled in that
 * member's own ink. `aria-hidden` throughout, because the row already carries
 * the same fact as real text in the count sentence and a shape is not an
 * announcement.
 *
 * A copy of `SheetProgress` in `member-list.tsx`. See the note at the top of
 * this file. The one thing it cannot copy is the height of the row it sits in:
 * the dashboard's row is 113px because the row is a 72px button, and padding a
 * decorative line of text out to match a tap target would be copying the
 * control rather than the screen.
 */
const SheetProgress: React.FC<{ unbought: number; total: number }> = ({
  unbought,
  total,
}) => {
  const collected = total - unbought;
  const pct = total === 0 ? 0 : Math.round((collected / total) * 100);

  return (
    <span aria-hidden='true' className='flex shrink-0 items-center gap-3'>
      <span className='relative block h-[3px] w-14 bg-wash-strong'>
        {total === 0 ? (
          <span className='absolute inset-0 border-t border-dashed border-rule' />
        ) : (
          <span
            className='absolute inset-y-0 left-0 bg-[var(--member-ink)]'
            style={{ width: `${pct}%` }}
          />
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
          unbought > 0 ? 'text-ink' : 'text-caption'
        )}
      >
        {unbought}
      </span>
    </span>
  );
};

export default memo(LandingPreview);