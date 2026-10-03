import React, { memo } from 'react';
import LandingPreview from '@/components/landing-preview';
import { HERO_STATE_INDEX } from '@/lib/landing-states';
import { cn } from '@/lib/utils';
import type { LandingStoryboardProps } from '@/types';

/**
 * The states after the first, as an equally sized pair.
 *
 * One list, watched three times: its open count falls 3 → 1 → 0, and only the
 * third state carries the check, because `SheetProgress` replaces the figure with
 * one at zero. That is the whole argument of the page, and it is why state one
 * cannot be here as well - a check visible in the first plate would spend the
 * moment before the reader has seen the count move.
 *
 * `HERO_STATE_INDEX` is not repeated here. The hero tips that state into the narrow
 * column and drops it 6rem, which a component below the hero cannot apply to itself
 * without knowing it sits in a grid row, so the two sides share one declaration
 * rather than two assumptions: `slice(HERO_STATE_INDEX + 1)` here, and the same
 * constant read by the page. A fourth state appears as a third plate here rather
 * than as a fourth page row, and the numbering below falls out of the same
 * constant.
 *
 * **Equal sizes, deliberately.** A descending series was rejected: the narrowest
 * state is the one with the check, and shrinking it would claim it matters least.
 * Two plates of the same width are two moments of one list rather than two
 * alternatives to choose between, and equal size is what says so - a pair of
 * identical rectangles reads as a sequence, a narrowing run reads as a ranking.
 *
 * The pair only forms where a plate can still carry its own row. Below `xl` the
 * two stack, because at 1024 the wide column is 498px and a pair would leave the
 * name column of each plate about 75px - too narrow for "Geburtstag" at 20px in
 * Source Serif 4, which the plate's own `break-words` would then break mid-word.
 * At 1280 the wide column is 620px, each plate 294px and the name column 136px,
 * where the longest name in the three dictionaries (22 Cyrillic characters) takes
 * two lines. That width is also the `container` utility's own 80rem step, so the
 * pair forms exactly where this page's ladder stops narrowing - and stacked, the
 * two plates are still the same width as each other.
 *
 * No heading above this block. What the page stacks under the hero is a picture, a
 * frame and an index, and a printed head over each would say the three are
 * sections of one kind, which two of them are not. Nothing is lost by leaving them
 * unheaded either: the `yourLists` line every plate carries belongs to the
 * illustration rather than to the document, which is why it is printed as a label
 * and not as a heading - a reader who navigates by heading reaches the roles and
 * the mechanisms and sees this block as the evidence it is.
 */
const LandingStoryboard: React.FC<LandingStoryboardProps> = ({
  states,
  yourLists,
  giftCount,
}) => {
  const after = states.slice(HERO_STATE_INDEX + 1);

  if (after.length === 0) return null;

  return (
    <div
      data-testid='landingStory'
      className={cn('grid', 'gap-x-8', 'gap-y-8', 'xl:grid-cols-2')}
    >
      {after.map((state, offset) => {
        /*
          Numbered in reading order from 1, and the hero owns the state before this
          slice, so the third state is `landingState3` whatever the dictionary holds.
          Keyed on the same number rather than on the list name: all three states
          show the same list, and a name key would collide on the first pair of
          plates.
        */
        const position = HERO_STATE_INDEX + offset + 1;

        return (
          <LandingPreview
            key={position}
            state={state}
            yourLists={yourLists}
            giftCount={giftCount}
            testId={`landingState${position}`}
            actionTestId={`landingAction${position}`}
          />
        );
      })}
    </div>
  );
};

export default memo(LandingStoryboard);
