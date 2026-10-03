import React, { memo } from 'react';
import { CropMarks } from '@/components/ui/dialog';
import { giftCountLabel } from '@/lib/gift-count';
import { memberInkStyle } from '@/lib/member-ink';
import SheetProgress from '@/components/sheet-progress';
import { cn } from '@/lib/utils';
import type { LandingPreviewProps } from '@/types';

/**
 * One ink for all three plates, seeded from a constant rather than from a name.
 *
 * The plate has no title any more - `yourLists` is the only heading on it - so
 * there is no line left to hash, and this is where the tray index comes from. It
 * is a module constant and not a dictionary key on purpose: a key would be
 * translatable, and the same page would print a different ink in German than in
 * Russian for what is one and the same person. The three plates are three states
 * of one list, so they are one ink - hashing them apart would read as three
 * people, which is the confusion this page exists to end.
 */
const OWNER_INK_SEED = 'wishy:landing:owner';

/**
 * One state of one list, drawn as a plate on the board.
 *
 * This is the reader's own contents page rather than an illustration of it, which
 * is why the plate no longer carries a title of its own: the title named somebody
 * else's lists and made the plate a specimen of a character who is not on this
 * page, while the section head the real contents page prints - `yourLists` - says
 * the same thing about the reader without naming anyone. The action line under the
 * plate is the caption in the only sense this page still needs: it says what has
 * happened to this list, in the reader's own person.
 *
 * The anatomy is imported rather than described, so it cannot drift from what the
 * app shows: the same stock, the same printed rule, the same crop marks, the same
 * ruled head, the same name in Source Serif 4, the same count words behind the
 * figure. `SheetProgress` is the authority for the figure itself - at
 * `count: 0` it replaces the numeral with a check in `--done`, which is the whole
 * point of the third state and the reason that state exists at all.
 */
const LandingPreview: React.FC<LandingPreviewProps> = ({
  state,
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

      {/* The contents page's own section head and nothing else: a specimen of that
          page, not a working one, and a quotation that offered "Create list" would
          be offering to create a list on an account that does not exist. It is the
          plate's only heading - the title that stood above it left with the sample
          lists, and its `mt-5` with it, because a gap sized for a line that is no
          longer there reads as the title having been cut out of the plate. */}
      <div className={cn('border-b', 'border-rule', 'pb-4')}>
        <h2 className='label-print pt-1 text-caption'>{yourLists}</h2>
      </div>

      <ul style={memberInkStyle(OWNER_INK_SEED)} className='divide-y divide-rule'>
        {state.items.map((item) => {
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
                  same list. It is also what makes the 3 -> 1 -> 0 arc readable
                  without sight of it.
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

      The cap keeps this page's third measure. It binds where the plate is narrower
      than it and nowhere else: in the storyboard pair each plate is 294px at 1280,
      so the longest German action (75 characters, the second state) is two lines
      there, while in the hero's narrow column - 442px at the same width - the
      column itself is the measure and the cap never takes effect.
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
      {state.action}
    </figcaption>
  </figure>
);

export default memo(LandingPreview);
