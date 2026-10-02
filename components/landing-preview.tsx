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
 * It has to be a faithful reproduction, not a flattering one, and it takes its
 * anatomy from the real contents page rather than describing it: one row per list,
 * the list's name in the serif, `SheetProgress` at the right, and the count words
 * behind the figure from `giftCountLabel` - the same function, not a second
 * ladder. The three sample rows carry 3/2, 1/2 and 0/4 open/collected, so the plate
 * shows all four count states the dashboard shows: two rows with a part-filled
 * rule, one row nearly full, and the zero row where the figure is replaced by a
 * check. The zero row is the reason `collected` exists as a separate figure - with
 * open counts alone the rule could never leave zero, which reads as an empty bar
 * rather than as progress.
 *
 * **One ink for the whole plate, set once.** The rows are all one person's lists -
 * the plate's title line is the one that stands in for the name the header would
 * put where the wordmark goes, which is what makes the product that person's list
 * rather than a tool. So the ink is hashed from that one line and inherited by
 * every row, instead of being hashed per row name. Hashing the rows separately
 * would give one plate three unrelated colours and read as three people, which is
 * the confusion this page exists to end. The tray is written for one id and one
 * person; `lib/member-ink.ts` is being re-keyed to the owner account id, and this
 * is the call site that will follow it.
 *
 * `SheetProgress` in `components/sheet-progress.tsx` is the authority for the
 * figure and is imported rather than copied: a second copy is a second thing to
 * forget.
 */
const LandingPreview: React.FC<
  Pick<Translations, 'preview' | 'giftCount' | 'yourLists'>
> = ({ preview, giftCount, yourLists }) => (
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
        The plate's title, in the serif, above the ruled head. The real contents
        page puts the signed-in person's name in the app header rather than on the
        sheet, so this is a plate title rather than a quotation of the sheet's own
        first line - which is why it sits above the rule instead of inside it. It is
        the one line that says the plate is about one person's lists and not about
        the software, so it is the line the plate must not be missing.
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
        {preview.list}
      </p>

      {/* The contents page's own section head and nothing else: a specimen of that
          page, not a working one, and a quotation that offered "Create list" would
          be offering to create a list on an account that does not exist. */}
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
        <h2 className='label-print pt-1 text-caption'>{yourLists}</h2>
      </div>

      <ul style={memberInkStyle(preview.list)} className='divide-y divide-rule'>
        {preview.items.map((item) => {
          /*
            Derived once, then read twice - by the words behind the name and by
            the rule beneath it. It was summed twice inline, which is only a
            problem the first time one of the two is edited.
          */
          const sheet = {
            unbought: item.count,
            total: item.count + item.collected,
          };

          return (
            <li
              key={item.name}
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
                    {item.name}
                  </span>
                </span>
                {/*
                  `giftCountLabel`, not a second ladder, and not the count itself:
                  the figure is a numeral in printed type and means nothing read
                  aloud, so the same fact arrives here as the words the dashboard
                  uses. The inline ternary this replaces mapped a zero to
                  `giftCount.zero` - "nothing left to buy" - on the same row that
                  draws the dashed placeholder, which everywhere else in this app
                  means the opposite: no ideas at all. The figure and the words
                  behind it were telling a visitor two opposite things about the
                  same list.
                */}
                <span className='sr-only'>
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

      Its own measure is the one number on this page worth stating: the German
      caption is 117 characters and lands at four lines inside `44ch` on a 390px
      phone, which is a caption and not a paragraph. It was written against this
      cap.
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