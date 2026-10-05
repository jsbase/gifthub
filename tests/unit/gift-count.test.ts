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
const { sheetCounts, splitSheet, giftCountLabel, selectedCountLabel } =
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
    `zero` at any total above it. Asserted as one loop so a change that makes the
    first branch reachable from the second shows up here.
  */
  for (const total of [1, 2, 17]) {
    assert.equal(label(total, 0), 'STATE:zero', `total ${total}, unbought 0`);
  }
});

/*
  HOW MANY WISHES ARE SELECTED, WHICH IS A DIFFERENT COUNT.

  Not a reuse of `giftCountLabel` and not a second copy of it. That function's four
  states are two zeroes and two numbers - a sheet can be empty and a sheet can be
  finished, and the row has to say which - and a selection has neither state: the
  bar it belongs to is only rendered when something is selected. Carrying `none` and
  `zero` here would be two branches that cannot be reached, and the first of them
  would be actively wrong, because "no wishes selected" on a bar that exists
  precisely because some are is a contradiction.

  What is left is the part that does vary, and it varies by more than one/plural:
  Russian has three forms (1 пожелание, 2-4 пожелания, 5+ пожеланий) and a
  one-form plural template cannot produce them. Four states is the honest ladder for
  that - and they are the four CLDR plural *categories*, which is why they are
  exactly those four: `two` is a real category in Irish, Welsh and Breton, and a
  locale that needs it must be able to name it rather than have the function decide.

  The wordings are stubbed for the reason the states above are: four distinct
  markers make the branch visible in a failure message instead of hiding behind four
  non-empty strings that all look right.
*/
const selectionDict = {
  selectedCount: {
    one: 'SELECTED:one {count}',
    two: 'SELECTED:two {count}',
    few: 'SELECTED:few {count}',
    many: 'SELECTED:many {count}',
  },
};

const selected = (count: number, locale = 'ru'): string =>
  selectedCountLabel(count, locale, selectionDict);

test('one selected wish is singular, in every shipped language', () => {
  assert.equal(selected(1), 'SELECTED:one 1');
  assert.equal(selected(1, 'de'), 'SELECTED:one 1');
  assert.equal(selected(1, 'en'), 'SELECTED:one 1');
});

test('two to four take the second form in Russian, which has no separate two', () => {
  // `two` is an empty band for Russian and German. It is still a key: a locale that
  // fills it in gets it, and one that does not is not made to pretend.
  assert.equal(selected(2), 'SELECTED:few 2');
  assert.equal(selected(3), 'SELECTED:few 3');
  assert.equal(selected(4), 'SELECTED:few 4');
});

test('five and above take the plural band', () => {
  assert.equal(selected(5), 'SELECTED:many 5');
  assert.equal(selected(12), 'SELECTED:many 12');
});

/*
  THE CASE THAT KILLED THE FIRST VERSION.

  An earlier version compared the number against a ladder - 1, 2, 3-4, 5+ - which is
  right for every number a reader sees on a phone and wrong for the rest. Russian 21
  is one (21 желание) and 22 is two (22 желания); the ladder put both in the `many`
  band and printed "21 желаний", which is a sentence about a number that exists on
  any sheet somebody reaches a dozen wishes on.

  These four numbers are the whole reason the function asks `Intl.PluralRules`
  rather than counting, and they are here to stop a future reader from "simplifying"
  the platform call back into comparisons - a simplification that looks strictly
  cheaper and passes every test above it.
*/
test('Russian is decided by the number, not by its last digit', () => {
  assert.equal(selected(21), 'SELECTED:one 21', '21 желание, not 21 желаний');
  assert.equal(selected(22), 'SELECTED:few 22', '22 желания, not 22 желаний');
  assert.equal(selected(25), 'SELECTED:many 25');
  assert.equal(selected(11), 'SELECTED:many 11', 'the teens take the plural too');
});

test('German has one plural band and everything else lands in it', () => {
  // `other` has no key and falls through to `many`. That is not a gap: German's
  // plural *is* the band `many` names, so the two languages disagree about the
  // category's name and not about the sentence.
  for (const count of [0, 2, 5, 21, 100]) {
    assert.equal(selected(count, 'de'), `SELECTED:many ${count}`, `de ${count}`);
  }
});

test('a zero selection is still a grammatical sentence', () => {
  /*
    Zero is unreachable rather than worded: the bar is rendered on
    `selectedIds.length > 0`, so the function is never called with it. Pinned
    because it is the one value where a clamp or an exception would be most
    tempting, and because all three locales put zero in the plural band - so the
    accidental answer would have been a correct one, which is the worst way for it
    to go unnoticed.
  */
  assert.equal(selected(0), 'SELECTED:many 0');
});

test('the selection count is never the sheet count', () => {
  /*
    The trap this exists beside: a selection is a subset of a sheet, so a sheet that
    says "3 wishes still needed" while the bar says "2 selected" is correct, and a
    function that read the wrong figure would produce a plausible sentence about the
    wrong number. Asserted with the two figures deliberately different.
  */
  assert.equal(selected(2), 'SELECTED:few 2');
  assert.notEqual(selected(2), 'SELECTED:few 3');
});