/**
 * Which state of the landing page's storyboard the hero owns.
 *
 * The hero tips that state into the narrow column of the spread, dropped 6rem so
 * its top rule lands inside the claim's block, and `landing-storyboard.tsx` renders
 * everything after it. The split is a property of the layout and both sides have to
 * agree on it: if the page hardcoded an index the storyboard did not know about, a
 * state inserted at the front of `preview.states` would render twice - once tipped
 * into the hero and once in the pair below - and the count arc would read as a
 * loop.
 *
 * So it is declared once, here, and read by both:
 * `states[HERO_STATE_INDEX]` in the page, `slice(HERO_STATE_INDEX + 1)` in the
 * storyboard. Those two cannot drift apart, and the storyboard's test-id numbering
 * falls out of the same constant instead of being counted by hand.
 *
 * `0` is the first state and not a constant arithmetic needs: the reader has to see
 * the list before anything has been bought from it, and the check only appears in
 * the last one. Reordering the dictionary to make some other state the hero's is a
 * change to the story this page tells, not a refactor.
 */
export const HERO_STATE_INDEX = 0;
