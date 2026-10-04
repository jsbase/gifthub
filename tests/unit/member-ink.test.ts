import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

/*
  THE INDEX LOCK BETWEEN THE TWO RESOLUTIONS OF THE INK TRAY.

  `MEMBER_INKS` is tuned for light ground and `MEMBER_INKS_ON_COLLECTED` is the
  same six slots resolved for the inverted collected cell - same length, same
  order, index-locked, and `lib/member-ink.ts:76-78` says so in as many words:
  *neither may be reordered alone*.

  Nothing checks that. The two arrays are separately typed, so swapping two
  entries in one of them compiles clean and no test fails - and the consequence
  is a contrast ratio, not a crash: each value was measured against a specific
  ground, so pairing slot 3's light-theme ink with slot 3's *neighbour's*
  collected-theme ink puts a colour that clears 4.5:1 next to one that was never
  measured there. The collected mark is `aria-hidden` redundancy, and
  redundancy still has to be legible.

  Slot 1 is the one that moved most recently (off oxblood at hue 354 to mulberry
  at 336, twelve degrees from the destructive red), which is why the tray is
  asserted against a literal copy here rather than only against its own length.
*/

const require = createRequire(import.meta.url);
const { MEMBER_INKS, MEMBER_INKS_ON_COLLECTED, memberInkStyle } =
  require('../../lib/member-ink.ts') as typeof import('@/lib/member-ink');

/** The tray as it stands, written out so a reorder cannot pass unnoticed. */
const EXPECTED_TRAY = [
  'var(--color-ink-1)',
  'var(--color-ink-2)',
  'var(--color-ink-3)',
  'var(--color-ink-4)',
  'var(--color-ink-5)',
  'var(--color-ink-6)',
];

/**
 * The collected resolution, with the hue named in the comment beside each entry.
 *
 * Written as literals rather than as a copy of the array so that a change to a
 * hue has to be made here too - which is the point of the index lock. The names
 * are the ones `app/globals.css` declares for `.dark`.
 */
const EXPECTED_ON_COLLECTED = [
  'hsl(336 56% 66%)', // mulberry
  'hsl(232 58% 72%)', // indigo
  'hsl(174 46% 58%)', // verdigris
  'hsl(38 74% 62%)', // ochre
  'hsl(276 34% 72%)', // violet
  'hsl(196 58% 62%)', // teal ink
];

test('the two arrays are the same length', () => {
  assert.equal(MEMBER_INKS.length, EXPECTED_TRAY.length);
  assert.equal(MEMBER_INKS_ON_COLLECTED.length, EXPECTED_ON_COLLECTED.length);
  assert.equal(
    MEMBER_INKS.length,
    MEMBER_INKS_ON_COLLECTED.length,
    'one tray, two resolutions: a slot that exists in only one of them is unpaired'
  );
});

test('the light-ground tray is the six declared inks, in order', () => {
  assert.deepEqual([...MEMBER_INKS], EXPECTED_TRAY);
});

test('the collected resolution is index-locked to the tray', () => {
  assert.deepEqual([...MEMBER_INKS_ON_COLLECTED], EXPECTED_ON_COLLECTED);
});

test('an empty id is slot 0 in both resolutions at once', () => {
  /*
    `trayIndex` short-circuits on an empty id rather than hashing it. The pair
    matters as much as the slot: an id that resolved to slot 0 in one array and
    slot 3 in the other is the exact failure this module's header forbids, and
    asserting only `--member-ink` would not see it.
  */
  assert.deepEqual(memberInkStyle(''), {
    '--member-ink': EXPECTED_TRAY[0],
    '--member-ink-on-collected': EXPECTED_ON_COLLECTED[0],
  });
});

test('one id resolves to one slot, and both arrays answer from it', () => {
  for (const id of ['a', 'account-1', 'clh3k9x0000abc', 'Ω-owner']) {
    const style = memberInkStyle(id);
    const slot = EXPECTED_TRAY.indexOf(style['--member-ink']);
    assert.notEqual(slot, -1, `${id} resolved to an ink that is not in the tray`);
    assert.equal(
      style['--member-ink-on-collected'],
      EXPECTED_ON_COLLECTED[slot],
      `${id} takes slot ${slot} in both resolutions`
    );
  }
});

test('an ink is stable across calls, because a changed ink reads as another person', () => {
  // The whole reason the key is a hash of the account id rather than a counter
  // or a position: an account whose ink changed on refresh would look like a
  // different account on the contents page.
  for (const id of ['account-1', 'account-2', 'account-3']) {
    assert.deepEqual(memberInkStyle(id), memberInkStyle(id));
  }
});

test('sequential ids spread across the tray instead of filling it in order', () => {
  /*
    FNV-1a rather than `id % 6`, and this is the assertion for that choice
    (`lib/member-ink.ts:91-93`): the database hands out sequential ids, so a
    modulo hash would give the first four members of a new group the first four
    inks and read as four deliberately different people. A spread is the point;
    the modulo is a deliberate consequence, because duplicating a colour beats
    running out of them.
  */
  const slots = Array.from({ length: 12 }, (_, i) =>
    EXPECTED_TRAY.indexOf(memberInkStyle(`account-${i}`)['--member-ink'])
  );
  assert.ok(
    slots.every((slot) => slot >= 0 && slot < EXPECTED_TRAY.length),
    `every id lands in the tray: ${slots.join(',')}`
  );

  const firstFour = slots.slice(0, 4);
  assert.equal(
    new Set(firstFour).size,
    4,
    `the first four sequential ids must not all be distinct-and-in-order, got ${firstFour.join(',')}`
  );
  assert.notDeepEqual(
    firstFour,
    [0, 1, 2, 3],
    'the tray must not be filled in order, which is what a plain modulo gives'
  );

  // And over a larger sample it reaches the whole tray rather than three slots.
  const used = new Set(slots);
  assert.ok(used.size >= 5, `the tray is used across its width, got ${[...used].join(',')}`);
});

test('more accounts than inks means two accounts share an ink, not an error', () => {
  /*
    Deliberate, and asserted so it is not "fixed" later: the ink identifies a
    person loosely and the name identifies them exactly, so a collision is the
    right failure mode. Twenty accounts over six inks cannot produce twenty
    distinct values, and a change that made it try would be the regression.
  */
  const twenty = Array.from(
    { length: 20 },
    (_, i) => memberInkStyle(`account-${i}`)['--member-ink']
  );
  assert.equal(new Set(twenty).size <= EXPECTED_TRAY.length, true);
  assert.equal(new Set(twenty).size > 1, true);
});