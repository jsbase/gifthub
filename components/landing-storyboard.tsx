import React, { memo } from 'react';
import LandingPreview from '@/components/landing-preview';
import { cn } from '@/lib/utils';
import type { LandingStoryboardProps } from '@/types';

/**
 * Where the storyboard starts, in the list of states.
 *
 * The first state belongs to the hero: the page tips it into the narrow column and
 * drops it 6rem so its top rule lands inside the claim's block, and a component
 * below the hero cannot apply that offset to itself without knowing it sits in a
 * grid row. So the hero takes state one and this renders the rest.
 *
 * It is a `slice` rather than a hard-coded pair on purpose. A fourth state has to
 * appear as a third plate here, not as a fourth page row, and the numbering below
 * follows from the slice rather than from a list of two.
 */
const FIRST_AFTER_THE_HERO = 1;

/**
 * The states after the first, as an equally sized pair.
 *
 * One list, watched three times: its open count falls 3 → 1 → 0, and only the
 * third state carries the check, because `SheetProgress` replaces the figure with
 * one at zero. That is the whole argument of the page, and it is why state one
 * cannot be here as well - a check visible in the first plate would spend the
 * moment before the reader has seen the count move.
 *
 * **Equal sizes, deliberately.** A descending series was rejected: the narrowest
 * state is the one with the check, and shrinking it would claim it matters least.
 * Two plates of the same width say two moments of one list, which is what they
 * are, and the pair is the one place on this page that is allowed to repeat a
 * shape - `DESIGN.md` forbade a same-size pair of plates on the theory that a
 * second rectangle is a category default, and this pair is two states rather than
 * two alternatives.
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
 * No heading. One printed head exists on this page - `yourLists`, inside the plate
 * - and a `label-print` line above this block would claim that a picture, a pair of
 * roles and an index of mechanisms are three sections of one kind, which two of
 * them are not.
 */
const LandingStoryboard: React.FC<LandingStoryboardProps> = ({
  states,
  yourLists,
  giftCount,
}) => {
  const after = states.slice(FIRST_AFTER_THE_HERO);

  if (after.length === 0) return null;

  return (
    <div
      data-testid='landingStory'
      className={cn('grid', 'gap-x-8', 'gap-y-8', 'xl:grid-cols-2')}
    >
      {after.map((state, offset) => {
        /*
          Numbered in reading order from 1, and the hero owns 1, so the third state
          is `landingState3` whatever the dictionary holds. Keyed on the same number
          rather than on the list name: all three states show the same list, and a
          name key would collide on the first pair of plates.
        */
        const position = FIRST_AFTER_THE_HERO + offset + 1;

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
