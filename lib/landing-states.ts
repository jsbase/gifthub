/**
 * Which state of the landing page's storyboard the hero owns, and what the
 * states below it call themselves.
 *
 * The hero tips `HERO_STATE_INDEX` into the narrow column of the spread, dropped
 * 6rem so its top rule lands inside the claim's block, and
 * `landing-storyboard.tsx` renders everything from `FIRST_AFTER_THE_HERO` on.
 * The split is a property of the layout and both sides have to agree on it: if
 * the page hardcoded an index the storyboard did not know about, a state
 * inserted at the front of `preview.states` would render twice - once tipped
 * into the hero and once in the pair below - and the count arc would read as a
 * loop.
 *
 * So there is one literal in this module and everything else is counted from it.
 * The round that introduced this constant got it half right and shipped a
 * regression: the plates below the fold were numbered
 * `HERO_STATE_INDEX + offset + 1`, which is 1 and 2, so the pair emitted the
 * hero's own number a second time and the third plate was never reachable at
 * all. A `data-testid` is this repo's e2e selector contract, and a duplicated
 * one is not a cosmetic defect: an assertion on the hero's plate resolves to
 * two elements - a strict-mode failure today, and the wrong plate the moment a
 * spec reaches for `.first()`.
 *
 * Hence `FIRST_AFTER_THE_HERO` rather than a second `+ 1` inside the
 * storyboard's arithmetic, and `statePosition` rather than a hand-kept offset
 * for the ids: the two facts - where the pair begins, and what number a state
 * is read at - are both derived here, where they can be checked against
 * `HERO_STATE_INDEX` in one place, and neither half of the page keeps its own
 * copy to fall out of step.
 *
 * `statePosition` counts from 1 at the hero's state rather than from the
 * array's own zero, which is what makes the page's ids and this function agree
 * by construction: the hero's state is read as 1 because it is the first one
 * read, and it would still be read as 1 if the hero moved to another index.
 * The id strings themselves stay in the components, because that is where a
 * spec looks for them and where they are written out - this module knows how a
 * state is numbered, not what the numbers are called on the page.
 *
 * `0` is the first state and not a number the arithmetic needs: the reader has
 * to see the list before anything has been bought from it, and the check only
 * appears in the last one. Making some other state the hero's is a change to
 * the story this page tells, not a refactor.
 */
export const HERO_STATE_INDEX = 0;

/** The first state the storyboard renders: the one after the hero's. */
export const FIRST_AFTER_THE_HERO = HERO_STATE_INDEX + 1;

/**
 * The position a state is read at on the page, counting from 1 at the hero's.
 *
 * The hero's own state is 1, the state after it is 2 and the one after that 3,
 * whatever the dictionary holds - which is what keeps the plates below the fold
 * from landing on a number the hero's plate above already carries.
 */
export function statePosition(index: number): number {
  return index - HERO_STATE_INDEX + 1;
}
