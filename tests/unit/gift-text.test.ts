import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import type { GiftField } from '@/lib/gift-text';

/*
  THE TWO LIMITS ON A WISH, AND WHY EACH ONE EXISTS.

  The ceiling is here because a wish with a thousand characters in its title was
  accepted, stored, returned and rendered, and the cell grew to fill the viewport
  and pushed the rest of the sheet off the page - one wish had become a page
  (`lib/gift-text.ts:4-7`). The floor is here because a cell called "A" is not a
  wish, it is a keypress that got in before the reader thought about what they
  meant, and `MIN_TITLE_LENGTH` was declared and then enforced nowhere until
  commit 6f60428 wired it in and silently broke two end-to-end tests, where the
  only guard was the 4.6-minute CI gate.

  Nothing pinned either bound. `checkGiftField` is the one place that knows all
  three fields' numbers, so a change to `MAX_TITLE_LENGTH` or `MIN_TITLE_LENGTH`
  reached production on the strength of a test suite that never calls it.
*/

const require = createRequire(import.meta.url);
const { checkGiftField, MAX_TITLE_LENGTH, MIN_TITLE_LENGTH } =
  require('../../lib/gift-text.ts') as typeof import('@/lib/gift-text');

/*
  The messages are built here rather than imported so that an assertion can be
  about the branch that was taken and not about a translation. `checkGiftField`
  takes them as parameters precisely so that this file can tell "too long" from
  "too short" by which sentence came back.
*/
const tooLong = (max: number) => `too long: ${max}`;
const tooShort = (min: number) => `too short: ${min}`;

test('the ceiling is 120 characters, and 121 is refused', () => {
  assert.equal(MAX_TITLE_LENGTH, 120);
  assert.equal(checkGiftField('title', 'a'.repeat(120), { tooLong }), undefined);
  assert.equal(
    checkGiftField('title', 'a'.repeat(121), { tooLong }),
    'too long: 120'
  );
});

test('the floor is 2 characters, and 1 is refused', () => {
  assert.equal(MIN_TITLE_LENGTH, 2);
  assert.equal(checkGiftField('title', 'ab', { tooLong }), undefined);
  assert.equal(
    checkGiftField('title', 'a', { tooLong, tooShort }),
    'too short: 2'
  );
});

test('a title is measured trimmed, so surrounding space cannot buy allowance', () => {
  // The stored title is trimmed on the way in, so a title of 120 characters plus
  // the whitespace a paste brings with it is still a 120-character title.
  assert.equal(
    checkGiftField('title', `  ${'a'.repeat(120)}  `, { tooLong }),
    undefined
  );
  // And the reverse: padding does not push an over-long title under the bound
  // either, because the measurement happens after the trim.
  assert.equal(
    checkGiftField('title', `  ${'a'.repeat(121)}  `, { tooLong }),
    'too long: 120'
  );
});

test('length is counted in code points, so an emoji costs one character', () => {
  /*
    Two UTF-16 units per emoji is the whole reason `[...value]` is spread rather
    than read as `value.length`. Counting units would silently halve the
    allowance of anybody writing in a script outside the Basic Multilingual
    Plane, which is a limit that is wrong for them rather than merely strict.
  */
  const emoji = '\u{1F600}';
  assert.equal(emoji.length, 2, 'the emoji is two UTF-16 units');
  assert.equal(
    [...`${'a'.repeat(MAX_TITLE_LENGTH - 1)}${emoji}`].length,
    MAX_TITLE_LENGTH
  );
  assert.equal(
    checkGiftField('title', `${'a'.repeat(MAX_TITLE_LENGTH - 1)}${emoji}`, {
      tooLong,
    }),
    undefined
  );
  assert.equal(
    checkGiftField('title', `${'a'.repeat(MAX_TITLE_LENGTH)}${emoji}`, {
      tooLong,
    }),
    'too long: 120'
  );
});

test('a field with no floor is not given one by an absent tooShort', () => {
  /*
    `tooShort` is optional because two of the three fields have no floor, and a
    caller that leaves it out is saying there is nothing to say. A field below a
    floor with no sentence for it returns `undefined` rather than a wrong
    sentence - which is why the floor is checked against `messages.tooShort`
    existing rather than against a default.
  */
  assert.equal(checkGiftField('description', '', { tooLong }), undefined);
  assert.equal(checkGiftField('url', '', { tooLong }), undefined);
  assert.equal(
    checkGiftField('description', 'a'.repeat(601), { tooLong }),
    'too long: 600'
  );
  assert.equal(
    checkGiftField('url', 'a'.repeat(2001), { tooLong }),
    'too long: 2000'
  );
});

test('the three fields keep three different bounds', () => {
  // One shared number for all three would either truncate a wish title to a
  // paragraph or let a link run to a kilobyte (`lib/gift-text.ts:9-14`).
  const bounds: [GiftField, number, number | undefined][] = [
    ['title', MAX_TITLE_LENGTH, MIN_TITLE_LENGTH],
    ['description', 600, undefined],
    ['url', 2000, undefined],
  ];
  for (const [field, max, min] of bounds) {
    assert.equal(
      checkGiftField(field, 'a'.repeat(max), { tooLong }),
      undefined,
      `${field} accepts exactly ${max} characters`
    );
    assert.equal(
      checkGiftField(field, 'a'.repeat(max + 1), { tooLong }),
      `too long: ${max}`,
      `${field} refuses ${max + 1} characters`
    );
    if (min !== undefined) {
      assert.equal(
        checkGiftField(field, 'a'.repeat(min - 1), { tooLong, tooShort }),
        `too short: ${min}`,
        `${field} refuses ${min - 1} characters`
      );
    }
  }
});
/*
  The link's scheme. `isWebAddress` decides both whether a link is stored and whether
  a stored one is drawn as a link, so a scheme it lets through is a scheme a buyer can
  be sent to.
*/
const { isWebAddress } =
  require('../../lib/gift-text.ts') as typeof import('@/lib/gift-text');

test('a web address is http or https, whatever its case and spacing', () => {
  for (const url of [
    'https://www.amazon.de/dp/B08N5WRWNW',
    'http://example.com',
    'HTTPS://EXAMPLE.COM/a?b=c',
    '  https://example.com/  ',
  ]) {
    assert.equal(isWebAddress(url), true, url);
  }
});

test('anything else is not a web address', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,<p>hi</p>',
    'file:///etc/passwd',
    'mailto:anna@example.test',
    'ftp://example.com/file',
    'intent://scan/#Intent;scheme=zxing;end',
    // No scheme: a browser would resolve these against wishy itself.
    'www.amazon.de/dp/B08N5WRWNW',
    '/de/dashboard',
    '',
  ]) {
    assert.equal(isWebAddress(url), false, url);
  }
});
