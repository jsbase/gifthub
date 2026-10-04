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
 * The reader's own lists, drawn as one plate on the board.
 *
 * This is the reader's contents page rather than an illustration of it, which is
 * why the plate carries no title of its own: the title named somebody else's
 * lists and made the plate a specimen of a character who is not on this page,
 * while the section head the real contents page prints - `yourLists`, set as the
 * label it is and not as a heading - says the same thing about the reader without
 * naming anyone.
 *
 * Three rows, and that is what makes the plate worth reading. One row said
 * nothing: a single name, a rule and a numeral is a fragment, and the rendered
 * page was rejected for exactly that. Three rows carry the product's whole
 * vocabulary at a glance - a list nobody has bought from yet, one nearly done,
 * and one finished, where `SheetProgress` replaces the numeral with the check and
 * the rule fills to the end in green. The four count words the dashboard uses sit
 * behind every row, so the whole arc arrives as language too.
 *
 * The row names are occasions rather than people, and that is load-bearing. Names
 * like "Ben and Mia" were tried here and read as random: nobody on this page has
 * been introduced, so a caption naming them asserted a cast the page never set up.
 * "Geburtstagswünsche", "Weihnachten" and "Valentinstag" need no introduction and
 * no cast, which is what an occasion is for.
 *
 * There is no caption under the plate, and there was one for most of this
 * branch's life. It has to earn its place: the last version named two people the
 * reader had never heard of, in order to say who may see the list - a rule the
 * standfirst and the index already carry. A caption that repeats what the page
 * says elsewhere is the plate's caption explaining the plate, which is the habit
 * this page was rewritten to break. The rows speak for themselves.
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
                /*
                  Two columns at `sm` and one below it, and that is the fix for a
                  reported break rather than a preference.

                  Measured in Chromium: "Geburtstagswünsche" is 213px of Source
                  Serif 4 at 20px, and the name column on this row had 213px at
                  390px - it just fitted - but 186px at 360px and 146px at 320px.
                  `overflow-wrap: break-word` on the name made it break inside the
                  token at both of those, which is the "Geburtstagswünsc-he" that
                  was reported. A 390px screenshot hides it, which is why it
                  survived review.

                  Stacking below `sm` gives the name the row's whole content
                  measure - 254px at 320px, 294px at 360px - so the longest German
                  compound the seed can produce fits without breaking at all. The
                  figure keeps its place on the name's own baseline from `sm` up,
                  which is the whole point of the plate: it is the contents page
                  reproduced at a smaller size, and a smaller reproduction is
                  entitled to wrap.
                */
                'grid-cols-1',
                'gap-x-5',
                'gap-y-2',
                'py-4',
                'sm:grid-cols-[1fr_auto]',
                'sm:items-center'
              )}
            >
              <div className='flex w-full min-w-0 flex-col items-start gap-2'>
                <span
                  className={cn(
                    'max-w-full',
                    /*
                      `hyphens-auto`, not `break-words`. The name is a proper noun
                      and German does not put hyphens in them, but a language that
                      does - and this app ships German, English and Russian from
                      one string table - should break at a morpheme boundary rather
                      than mid-syllable if a name ever does not fit. `<html lang>`
                      is already correct, which is the other half of it.
                    */
                    'hyphens-auto'
                  )}
                >
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

              {/* Right-aligned under the name below `sm`, where the row is one
                  column and the figure is a line of its own; on the name's own
                  baseline from `sm` up, which is the arrangement the contents
                  page itself uses. */}
              <SheetProgress
                unbought={sheet.unbought}
                total={sheet.total}
                className='justify-self-end sm:justify-self-auto'
              />
            </li>
          );
        })}
      </ul>
    </div>
  </figure>
);

export default memo(LandingPreview);
