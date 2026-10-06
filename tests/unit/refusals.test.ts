import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import type { Refusal } from '@/lib/refusals';

/*
  UNION-VS-ARRAY DRIFT: THE ONE PLACE THE VOCABULARY CAN DISAGREE WITH ITSELF.

  `lib/refusals.ts` holds the same vocabulary twice. The `Refusal` union is what
  the routes type against and what the client narrows to; `REFUSALS` is a
  hand-written array that `isRefusal` actually reads. TypeScript checks the array
  against the union - `Refusal[]` means a missing or misspelled entry is an
  error - but it cannot check the *other* direction. A code added to the union
  and forgotten in the array compiles clean, and then `isRefusal` rejects a
  refusal the server can produce: the response arrives, the client's `switch`
  falls through, and a person is shown a generic sentence for a specific
  problem. A duplicate entry typechecks just as cleanly.

  So the array is compared against a literal copy written out here. That copy is
  deliberately *not* derived from the union - deriving it would compare the array
  with itself and pass forever. It is 23 strings, and changing one is a
  deliberate act in two files.
*/

const require = createRequire(import.meta.url);
const { REFUSALS, isRefusal } =
  require('../../lib/refusals.ts') as typeof import('@/lib/refusals');

/** The closed vocabulary, written out by hand rather than imported. */
const EXPECTED: Refusal[] = [
  // Credentials and fields.
  'invalid_email',
  'duplicate_email',
  'invalid_nickname',
  'duplicate_nickname',
  'weak_password',
  'invalid_display_name',
  // Sign-in.
  'invalid_identifier',
  // Request shape.
  'nothing_to_change',
  'ambiguous_change',
  'invalid_visibility',
  'already_on_this_list',
  'too_many_gifts',
  // Sharing.
  'no_such_account',
  'already_shared',
  'cannot_share_with_owner',
  'not_shared_yet',
  'invalid_search_query',
  // Groups.
  'no_such_group',
  'duplicate_group_name',
  'cannot_join_own_group',
  // Authorization.
  'not_found',
  'forbidden',
  'cannot_clear_purchase',
];

test('the array holds exactly the codes the union declares, in order', () => {
  // Length first, then contents: a dropped code and an added one can cancel out
  // in a set comparison, and the count is what makes that visible.
  assert.equal(
    REFUSALS.length,
    EXPECTED.length,
    `the array holds ${REFUSALS.length} codes; the union holds ${EXPECTED.length}`
  );
  assert.deepEqual([...REFUSALS], EXPECTED);
});

test('the array has no duplicates', () => {
  /*
    A duplicate is invisible to `isRefusal` - `includes` still finds the code -
    so nothing else would ever notice one. It matters because the array is the
    thing a future reader counts to learn how large the vocabulary is, and
    because `lib/api-refusal.ts` maps statuses by key.
  */
  const seen = new Set<string>();
  const duplicates = REFUSALS.filter((code) => {
    if (seen.has(code)) return true;
    seen.add(code);
    return false;
  });
  assert.deepEqual(duplicates, []);
});

test('isRefusal accepts every code in the array', () => {
  // Every entry, rather than a sample: the whole point is that no entry is
  // unreachable, and a sampled assertion cannot tell you which one is not.
  for (const code of EXPECTED) {
    assert.equal(isRefusal(code), true, `${code} must narrow to a Refusal`);
  }
});

test('isRefusal rejects an Object.prototype key as attacker-supplied JSON', () => {
  /*
    The security property, and the reason `isRefusal` is comparisons against
    literals rather than a lookup (`lib/refusals.ts:84-89`). `code` arrives from
    a response body, so `table[code]` for a plain object finds
    `Object.prototype.constructor` when somebody posts `{"code":"constructor"}`
    and the client renders a function as a name error. Every one of these is a
    key that exists on every object in the language.
  */
  for (const code of [
    'constructor',
    '__proto__',
    'toString',
    'valueOf',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString',
  ]) {
    assert.equal(
      isRefusal(code),
      false,
      `${code} is on Object.prototype and is not a refusal`
    );
  }
});

test('isRefusal rejects a case variant of a real code', () => {
  // The codes are lower_snake_case and the comparison is exact. A client that
  // narrowed case-insensitively would accept a code the server never sends, and
  // the sentence attached to it would be a guess.
  assert.equal(isRefusal('not_found'), true);
  for (const variant of ['NOT_FOUND', 'Not_Found', 'notFound', ' not_found']) {
    assert.equal(isRefusal(variant), false, `${variant} is not a refusal`);
  }
});

test('isRefusal rejects everything that is not a string at all', () => {
  // `code` is `unknown` on purpose: a body that parsed to null, a number or an
  // object is not a refusal, and none of these may reach a table lookup.
  for (const value of [undefined, null, 0, 42, true, {}, [], ['not_found']]) {
    assert.equal(isRefusal(value), false, `${JSON.stringify(value)} is not a code`);
  }
});

test('a code that was never in the vocabulary is refused', () => {
  // What a stale client narrowing against an older union would see. The union is
  // closed on purpose, so an unknown string is not a refusal - it is a sentence
  // the product does not have.
  for (const code of ['', 'invalid_gift', 'forbidden ', 'unknown', 'undefined']) {
    assert.equal(isRefusal(code), false, `${code} is not in the vocabulary`);
  }
});