import React, { memo } from 'react';
import { CropMarks } from '@/components/ui/dialog';
import { giftCountLabel } from '@/lib/gift-count';
import { memberInkStyle } from '@/lib/member-ink';
import SheetProgress from '@/components/sheet-progress';
import { cn } from '@/lib/utils';
import type { LandingPreviewProps } from '@/types';

/**
 * One ink for the plate, seeded from a constant rather than from a name.
 *
 * The plate has no title of its own any more - the `yourLists` label is the only
 * line of type above the rows - so there is nothing here to hash, and this is
 * where the tray index comes from. It is a module constant and not a dictionary
 * key on purpose: a key would be translatable, and the same page would print a
 * different ink in German than in Russian for what is one and the same person.
 * That person is the reader, whose ink on the real contents page is keyed on their
 * own account id - a value nobody has here, and a seed borrowed from any name in
 * the plate would print a second person's colour on the reader's list.
 */
const OWNER_INK_SEED = 'wishy:landing:owner';

/**
 * One list of the reader's own, drawn as a plate on the board.
 *
 * This is the reader's contents page rather than an illustration of it, which is
 * why the plate carries no title of its own: the title named somebody else's
 * lists and made the plate a specimen of a character who is not on this page,
 * while the section head the real contents page prints - `yourLists`, set as the
 * label it is and not as a heading - says the same thing about the reader without
 * naming anyone. The action line under the plate is the caption in the only sense
 * this page needs: it says what has happened to this list, in the reader's own
 * person.
 *
 * There is one plate, and that is the whole point of the current design rather
 * than a leftover. It was three once - the same list three times over, its open
 * count falling 3 -> 1 -> 0 until the figure became a check - and the rendered
 * page was rejected: three plates with the same head, the same list name and the
 * same single row read as repetition rather than as a story, the plate in the
 * hero's right column and the pair below it broke the one asymmetric spread into
 * three scattered rectangles, and the plate carrying the check read as a different
 * list rather than as a later state of this one. The check is still what
 * `SheetProgress` draws at zero, and this page stands at three open precisely so
 * that a reader is looking at a list somebody can still be surprised by.
 *
 * The anatomy is imported rather than described, so it cannot drift from what the
 * app shows: the same stock, the same printed rule, the same crop marks, the same
 * ruled head, the same name in Source Serif 4, the same count words behind the
 * figure. `SheetProgress` is the authority for the figure itself.
 */
const LandingPreview: React.FC<LandingPreviewProps> = ({
  preview,
  yourLists,
  giftCount,
  testId,
  actionTestId,
}) => (
  <figure className={cn('flex', 'flex-col')}>
    <div
      data-testid={testId}
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
        The contents page's own section head and nothing else: a specimen of that
        page, not a working one, and a quotation that offered "Create list" would
        be offering to create a list on an account that does not exist.

        Printed as a label and not as a heading. The page has no section of its own
        for this head to open - what the plate prints is a quotation of the
        contents page's own section line - so an `<h2>` here would claim a document
        section where there is a specimen, which is an outline defect on a page
        whose whole argument is hierarchy. The `label-print` classes are untouched,
        so the specimen is optically identical to the screen it quotes and a
        sighted reader cannot tell; the real contents page keeps its `<h2>`, where
        it heads a real section of a real page.

        The title that stood above it left with the sample lists, and its `mt-5`
        with it, because a gap sized for a line that is no longer there reads as the
        title having been cut out of the plate.
      */}
      <div className={cn('border-b', 'border-rule', 'pb-4')}>
        <p className='label-print pt-1 text-caption'>{yourLists}</p>
      </div>

      <ul style={memberInkStyle(OWNER_INK_SEED)} className='divide-y divide-rule'>
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
                  same list. It is also what lets the number on the plate be read
                  aloud by somebody who cannot see the figure at all.
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
      The action, on the board, in caption ink, under the thing it describes: a
      catalogue prints the caption below the plate and never above it. It is the
      only prose this component writes, and it is written in the reader's own
      person and names nobody who bought - the product never names a buyer, so an
      action line that did would claim an attribution the app does not deliver.

      The cap keeps this page's third measure, the narrowest of the three. The
      plate stands in the hero's narrow column, 443px at 1280 where the cap does
      take effect and pulls the caption in to 44ch, short of its column: the
      sentence under the plate must not run as wide as the claim beside it. It was
      a second question to answer while there were three plates, because the
      storyboard pair was 294px each and narrower than the cap, so there the
      plate's own width was the measure. There is one plate and one width again.
    */}
    <figcaption
      data-testid={actionTestId}
      className={cn(
        'mt-5',
        'max-w-[44ch]',
        'text-[0.9375rem]',
        'leading-relaxed',
        'text-pretty',
        'text-caption'
      )}
    >
      {preview.action}
    </figcaption>
  </figure>
);

export default memo(LandingPreview);
