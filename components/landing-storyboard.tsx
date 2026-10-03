import React, { memo } from 'react';
import LandingPreview from '@/components/landing-preview';
import {
  FIRST_AFTER_THE_HERO,
  statePosition,
} from '@/lib/landing-states';
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
 * Where this pair starts and what it calls itself are declared once, in
 * `lib/landing-states.ts`, and read by both halves of the page. The hero tips
 * `HERO_STATE_INDEX` into the narrow column and drops it 6rem, which a component
 * below the hero cannot apply to itself without knowing it sits in a grid row, so
 * that one state belongs to the page and this renders everything from
 * `FIRST_AFTER_THE_HERO` on. A fourth state therefore appears as a third plate here
 * rather than as a fourth page row - and each plate numbers itself through
 * `statePosition`, so the ids come from the page's one declaration counted rather
 * than from a second offset kept in step here by hand.
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
  const after = states.slice(FIRST_AFTER_THE_HERO);

  if (after.length === 0) return null;

  return (
    <div
      data-testid='landingStory'
      className={cn('grid', 'gap-x-8', 'gap-y-8', 'xl:grid-cols-2')}
    >
      {after.map((state, offset) => {
        /*
          What this state is called on the page: both test ids and the React key
          come from it, so the pair numbers itself 2 and 3 - the third state is
          `landingState3` whatever the dictionary holds - and cannot land on the
          number the hero's plate above already carries. The offset counts into the
          slice, so it is turned back into an index before it is numbered; keying on
          the list name instead would collide on the first pair of plates, all three
          states showing the same list.
        */
        const position = statePosition(FIRST_AFTER_THE_HERO + offset);

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
