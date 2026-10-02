import React, { memo } from 'react';
import { CropMarks } from '@/components/ui/dialog';
import { giftCountLabel } from '@/lib/gift-count';
import { memberInkStyle } from '@/lib/member-ink';
import SheetProgress from '@/components/sheet-progress';
import { cn } from '@/lib/utils';
import type { Translations } from '@/types';

/**
 * One page of the album, reproduced as a plate tipped in beside the claim.
 *
 * It has to be a faithful reproduction, not a flattering one. Every sample member
 * is fully un-collected, so `pct` is 0 for all three and the member's ink is set
 * on every row and painted on none of them: the plate shows no colour at all.
 * That is what the dashboard draws for those three members too. Giving the rows
 * some ink would need a `collected` figure in `preview.members` that the approved
 * data does not carry. Mia's dashed rule does come through, because the approved
 * data has a zero there and a zero means "no list yet", which is a state worth
 * quoting.
 *
 * **The plate is titled, and the caption is below it.** Both are catalogue
 * furniture. The title is a real group's name in the serif, which is the same
 * line the dashboard's header puts in place of the product's own - the plate is
 * about one group's list, not about the software. The caption sits underneath,
 * where a caption sits, so the plate can be tipped high against the claim beside
 * it instead of being pushed down by a paragraph.
 *
 * The plate is no longer the same size as the dashboard's sheet, and the old
 * caption's claim that it was "the whole screen" went with that. What still makes
 * it the same product is the material and the anatomy - the same stock, the same
 * printed rule, the same crop marks, the same ruled head, the same name in Source
 * Serif 4, the same member ink on the progress rule and the same printed numeral
 * at the right. That is what a reader compares; the pixel width is not.
 *
 * `SheetProgress` in `components/sheet-progress.tsx` is the authority for the
 * figure and is imported rather than copied: a second copy is a second thing to
 * forget.
 */
const LandingPreview: React.FC<
  Pick<Translations, 'preview' | 'giftCount' | 'members'>
> = ({ preview, giftCount, members: membersHeading }) => (
  <figure className={cn('flex', 'flex-col')}>
    <div
      data-testid='landingQuote'
      className={cn(
        'relative',
        'border',
        'border-rule',
        'bg-sheet',
        'px-5',
        'py-6',
        'sm:px-7',
        'sm:py-7'
      )}
    >
      <CropMarks />

      {/*
        The plate's title. The dashboard puts the group's name in the app header
        rather than on the sheet, so this is a plate title and not a quotation of
        the sheet's own first line - which is why it sits above the ruled head
        instead of inside it.
      */}
      <p
        className={cn(
          'max-w-full',
          'break-words',
          'pr-10',
          'font-serif',
          'font-semibold',
          'text-ink',
          'text-[1.375rem]',
          'leading-tight'
        )}
      >
        {preview.group}
      </p>

      {/* `MemberListHeader` without its two buttons: a specimen of the contents
          page, not a working one, and a quotation that offered "Add member"
          would be offering to add a member to a group that does not exist. */}
      <div
        className={cn(
          'flex',
          'flex-col',
          'mt-5',
          'border-b',
          'border-rule',
          'pb-4'
        )}
      >
        <h2 className='label-print pt-1 text-caption'>{membersHeading}</h2>
      </div>

      <ul className='divide-y divide-rule'>
        {preview.members.map((member) => {
          /*
            Derived once, then read twice - by the words under the name and by
            the rule beneath it. It was summed twice inline, which is only a
            problem the first time one of the two is edited.
          */
          const sheet = {
            unbought: member.count,
            total: member.count + member.collected,
          };

          return (
            <li
            key={member.name}
            style={memberInkStyle(member.name)}
            className={cn(
              'grid',
              'grid-cols-[1fr_auto]',
              'items-center',
              'gap-x-5',
              'gap-y-2',
              'py-4'
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
                {giftCountLabel(sheet, { giftCount })}
              </span>
            </div>

            <SheetProgress unbought={sheet.unbought} total={sheet.total} />
          </li>
          );
        })}
      </ul>
    </div>

    {/*
      Below the plate, where a caption belongs, and in caption ink on the board:
      it is the catalogue's own sentence about the plate, and printed on the stock
      it would be a line of interface chrome that the real screen does not have.
      Narrower than the claim above it and wider than an index entry, so the three
      measures on this page stay three.
    */}
    <figcaption
      className={cn(
        'mt-5',
        'max-w-[44ch]',
        'text-[0.9375rem]',
        'leading-relaxed',
        'text-pretty',
        'text-caption'
      )}
    >
      {preview.lead}
    </figcaption>
  </figure>
);

export default memo(LandingPreview);
