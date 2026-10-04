import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import type { Gift, MemberGiftCounts } from '@/types';

/*
  FOUR STATES, NOT TWO - AND ZERO IS NOT "NONE".

  A sheet with no ideas at all and a sheet whose every idea has been bought are
  different situations, and the row has to be able to say which: the first needs
  a present, the second is done. An inline ternary once mapped a zero to `zero`
  on the same row that draws the dashed placeholder, which everywhere else means
  the opposite (`lib/gift-count.ts:18-21`). Four distinct branches, and the two
  zeroes are the two most likely to be swapped.

  The counts are derived from the sheet's rows, so a wrong `unbought` here
  disagrees with the sheet it is labelling. The four were previously derived at
  five call sites and worded at two, which is how that happened.
*/

const require = createRequire(import.meta.url);
const { sheetCounts, splitSheet, giftCountLabel } =
  require('../../lib/gift-count.ts') as typeof import('@/lib/gift-count');

/*
  A stub dictionary, never `lib/translations/*.json`.

  The dictionary is a *parameter* of `giftCountLabel` for exactly this reason: a
  test that imported `en.json` would assert that the shipped English says
  something, and would keep passing if the branch that produced it were swapped
  for another branch whose English also happened to be non-empty. Four distinct
  marker strings make the branch visible in the failure message instead.
*/
const dict = {
  giftCount: {
    none: 'STATE:none',
    zero: 'STATE:zero',
    one: 'STATE:one {count}',
    many: 'STATE:many {count}',
  },
};

const label = (total: number, unbought: number): string =>
  giftCountLabel({ total, unbought } as MemberGiftCounts, dict);

test('a sheet with no ideas says none, not zero', () => {
  // The bug this file exists for: `total === 0` and `unbought === 0` are both
  // zero, and only one of them means "this list is finished".
  assert.equal(label(0, 0), 'STATE:none');
});

test('a sheet whose every idea is bought says zero', () => {
  assert.equal(label(3, 0), 'STATE:zero');
});

test('one idea left is singular in every language', () => {
  // A language with a plural rule for one has to be told this is the singular
  // branch, which is what the `{count}` substitution exists for.
  assert.equal(label(4, 1), 'STATE:one 1');
});

test('more than one left is plural, carrying the number', () => {
  assert.equal(label(5, 2), 'STATE:many 2');
  assert.equal(label(2, 2), 'STATE:many 2');
});

test('no counts at all is treated as no ideas rather than crashing', () => {
  // The counts arrive from an optional field on a list row, so `undefined` is a
  // state the function is reachable in, not a type error.
  assert.equal(giftCountLabel(undefined, dict), 'STATE:none');
});

test('the plural carries the unbought figure and not the total', () => {
  /*
    A sheet of five with two left must say two. Asserting the number separately
    from the branch catches the mistake where `total` is read in the `many` arm
    - which produces a plausible sentence about the wrong figure, and passes any
    assertion that only checks for a plural.
  */
  assert.equal(label(5, 2), 'STATE:many 2');
  assert.notEqual(label(5, 2), 'STATE:many 5');
});

test('the counts are derived from the mark, and total counts every row', () => {
  const open = { isPurchased: false };
  const bought = { isPurchased: true };

  assert.deepEqual(sheetCounts([]), { unbought: 0, total: 0 });
  assert.deepEqual(sheetCounts([open]), { unbought: 1, total: 1 });
  assert.deepEqual(sheetCounts([open, bought, open]), {
    unbought: 2,
    total: 3,
  });
  assert.deepEqual(sheetCounts([bought, bought]), { unbought: 0, total: 2 });
});

test('the sheet splits into what is needed and what is handled', () => {
  /*
    The sheet draws two sections rather than one undifferentiated list, because a
    single list answers neither "what is still needed" nor "what is done". Order
    is preserved within each section, since it is the order the reader wrote them
    in.
  */
  const gift = (id: string, isPurchased: boolean): Gift => ({
    id,
    title: id,
    isPurchased,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    listId: 'list-under-test',
    canClear: true,
  });
  const split = splitSheet([
    gift('a', false),
    gift('b', true),
    gift('c', false),
  ]);

  assert.deepEqual(
    split.open.map((g) => g.id),
    ['a', 'c']
  );
  assert.deepEqual(
    split.collected.map((g) => g.id),
    ['b']
  );
  assert.equal(splitSheet([]).open.length, 0);
  assert.equal(splitSheet([]).collected.length, 0);
});

test('the two zero states are told apart by the counts they are given', () => {
  /*
    Read together on purpose: the same `unbought: 0` is `none` at total 0 and
    `zero` at any total above it. Asserted as one loop so a change that makes
    the first branch reachable from the second shows up here.
  */
  for (const total of [1, 2, 17]) {
    assert.equal(label(total, 0), 'STATE:zero', `total ${total}, unbought 0`);
  }
});