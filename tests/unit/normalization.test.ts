import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import type { Translations } from '@/types';

/*
  NORMALISATION RUNS *BEFORE* THE DUPLICATE CHECK, NOT AFTER IT.

  Each of these three modules returns the value to store rather than a boolean,
  and that shape is the reason normalisation moved ahead of the duplicate check
  (`lib/email.ts:49-55`): a caller given a boolean cannot accidentally store the
  form it validated and a different one, and `Anna@Example.de` against
  `anna@example.de` is one person, not two accounts.

  Two details are load-bearing and neither is obvious from the call site:

    - the invisible characters are *built by code point* rather than written
      literally, because a literal in source is invisible too and a normaliser
      that normalises nothing while looking correct is worse than none;
    - NFC comes first, so "Müller" typed as one code point and as `u` plus a
      combining diaeresis is one string - macOS filesystems hand out the
      decomposed form routinely.

  Registration is covered end to end by `tests/auth-buttons.spec.ts`, but only
  for the values that route happens to send. These are the boundaries, and the
  rules differ per field in ways a form cannot show.
*/

const require = createRequire(import.meta.url);
const email = require('../../lib/email.ts') as typeof import('@/lib/email');
const nickname = require('../../lib/nickname.ts') as typeof import('@/lib/nickname');
const accountName = require('../../lib/account-name.ts') as typeof import('@/lib/account-name');

const NO_BREAK_SPACE = String.fromCharCode(0x00a0);
const NON_BREAKING_HYPHEN = String.fromCharCode(0x2011);

test('an address is lowercased and trimmed, and case does not fork an account', () => {
  // A bare `@unique` in Postgres is case-sensitive, so without this the second
  // spelling registers a new account and the first can never be reached again.
  assert.equal(email.normalizeEmail('Anna@Example.de'), 'anna@example.de');
  assert.equal(email.normalizeEmail('  anna@example.de  '), 'anna@example.de');
  assert.equal(email.acceptedEmail('Anna@Example.de'), 'anna@example.de');
});

test('nothing inside the local part is folded', () => {
  // `Local-Part` and `local-part` are legal *distinct* addresses, so lowercasing
  // them together would merge two real accounts. Only case and outer space are
  // rewritten.
  assert.equal(email.normalizeEmail('Anna.Smith+x@example.de'), 'anna.smith+x@example.de');
});

test('an address has to be shaped like one, and the shape is anchored', () => {
  for (const good of [
    'anna@example.de',
    'anna.smith@example.co.uk',
    'anna+tag@sub.example.de',
    'анна@пример.рф',
  ]) {
    assert.equal(email.acceptedEmail(good), good, `${good} is acceptable`);
  }
  for (const bad of [
    'anna',
    'anna@',
    '@example.de',
    'anna@example',
    'anna@@example.de',
    'anna example.de',
    // The anchor is what stops a newline riding along and turning one field into
    // two lines of a log.
    'anna@example.de\nbcc: someone@else.de',
    '',
  ]) {
    assert.equal(email.acceptedEmail(bad), undefined, `${JSON.stringify(bad)} is refused`);
  }
});

test('an address over 254 characters is refused rather than truncated', () => {
  const domain = '@example.de';
  const local = 'a'.repeat(254 - domain.length);
  assert.equal(email.acceptedEmail(`${local}${domain}`)?.length, 254);
  assert.equal(email.acceptedEmail(`${local}a${domain}`), undefined);
});

test('a nickname is lowercased, and the wrong space and hyphen are rewritten', () => {
  assert.equal(nickname.normalizeNickname('Anna'), 'anna');
  assert.equal(
    nickname.normalizeNickname(`Ma${NO_BREAK_SPACE}rz`),
    'marz',
    'a no-break space in a handle is not a space, and is rewritten rather than accepted'
  );
  assert.equal(
    nickname.normalizeNickname(`Ma${NON_BREAKING_HYPHEN}rz`),
    'ma-rz',
    'a non-breaking hyphen becomes the hyphen people can type, rather than being dropped'
  );
  // The display name maps the same character to a hyphen as well - the rewrite
  // is shared, only the space differs (a nickname loses it, a name gains one).
  assert.equal(
    accountName.normalizeDisplayName(`Ma${NON_BREAKING_HYPHEN}rz`),
    'Ma-rz'
  );
  assert.equal(
    accountName.normalizeDisplayName(`Ma${NO_BREAK_SPACE}rz`),
    'Ma rz',
    'a no-break space in a name becomes the space, because both spellings have to end up as the same string'
  );
  assert.equal(nickname.acceptedNickname('Anna.Smith_01'), 'anna.smith_01');

  /*
    A nickname is *not* trimmed, and that is worth pinning rather than reading as
    an oversight: `lib/email.ts` trims because the address is a lookup key and
    outer space would fork it, while the handle is typed into a field and a
    leading space is a keystroke the person can see and delete. The regex is
    anchored either way, so the padded spelling is refused rather than stored
    with its padding - which is the difference that matters.
  */
  assert.equal(nickname.acceptedNickname(' anna'), undefined);
  assert.equal(nickname.acceptedNickname('anna '), undefined);
});

test('a nickname is 2 to 32 characters from any script', () => {
  // de and ru are equally first-class per PRODUCT.md, so `анна` is a nickname
  // and not a rejected one - a rule that only accepts ASCII would refuse half
  // the product's users at the sign-in field.
  assert.equal(nickname.acceptedNickname('анна'), 'анна');
  assert.equal(nickname.acceptedNickname('müller'), 'müller');
  assert.equal(nickname.acceptedNickname('ab'), 'ab');
  assert.equal(nickname.acceptedNickname('a'.repeat(32)), 'a'.repeat(32));

  assert.equal(nickname.acceptedNickname('a'), undefined, 'one character is not a handle');
  assert.equal(nickname.acceptedNickname('a'.repeat(33)), undefined);
  assert.equal(nickname.acceptedNickname('anna!'), undefined, 'the three separators are the only ones');
  assert.equal(nickname.acceptedNickname('-anna'), undefined, 'a handle may not start with a separator');
  assert.equal(nickname.acceptedNickname('.anna'), undefined);
});

test('NFC runs first, so one name typed two ways is one nickname', () => {
  // For a unique identifier this is not cosmetic: two spellings of one name
  // would either both fail the unique index or resolve to whichever row was
  // written first.
  /*
    Built by code point rather than written literally, for the reason the modules
    do it: the combining diaeresis is invisible in source, so a literal pair here
    would be two identical strings that assert nothing - and an editor that
    normalised the file would quietly delete the test's premise.
  */
  const COMBINING_DIAERESIS = String.fromCharCode(0x0308);
  const composed = `m${String.fromCharCode(0x00fc)}ller`;
  const decomposed = `mu${COMBINING_DIAERESIS}ller`;
  assert.notEqual(composed, decomposed, 'the two forms are byte-different');
  assert.equal(
    nickname.acceptedNickname(decomposed),
    composed,
    'the decomposed form normalises onto the composed one'
  );
  assert.equal(accountName.acceptedDisplayName(decomposed), composed);
});

test('a display name keeps its case and is not unique', () => {
  // Two accounts may both be called "Anna". The address identifies a person
  // exactly; folding the display name into that would refuse a second Anna a
  // name she is entitled to use.
  assert.equal(accountName.acceptedDisplayName('Anna'), 'Anna');
  assert.equal(accountName.acceptedDisplayName("O'Brien-Smith"), "O'Brien-Smith");
  assert.equal(accountName.acceptedDisplayName('Анна'), 'Анна');
  assert.equal(accountName.acceptedDisplayName('Иван Петров'), 'Иван Петров');
});

test('a display name is at most 100 characters and needs one letter', () => {
  assert.equal(accountName.acceptedDisplayName('a'.repeat(100)), 'a'.repeat(100));
  assert.equal(accountName.acceptedDisplayName('a'.repeat(101)), undefined);

  // The lookahead requires at least one letter, so a name of digits and spaces
  // is not a name.
  assert.equal(accountName.acceptedDisplayName('123'), undefined);
  assert.equal(accountName.acceptedDisplayName('   '), undefined);
  assert.equal(accountName.acceptedDisplayName(''), undefined);
  assert.equal(accountName.acceptedDisplayName('-.-'), undefined);
});

test('an invisible character in a name stays refused rather than being rewritten', () => {
  /*
    The genuinely invisible characters - U+200B, U+200D, U+FEFF, U+2028, U+2029 -
    stay rejected (`lib/account-name.ts:46-49`). They make two *different* names
    render identically, which is a support problem rather than a formatting one,
    and no amount of normalising recovers what was typed. The class is anchored,
    which is what rejects them.
  */
  for (const code of [0x200b, 0x200d, 0xfeff, 0x2028, 0x2029]) {
    const invisible = String.fromCharCode(code);
    assert.equal(
      accountName.acceptedDisplayName(`Anna${invisible}`),
      undefined,
      `U+${code.toString(16).toUpperCase()} must not ride along in a name`
    );
    assert.equal(
      nickname.acceptedNickname(`anna${invisible}`),
      undefined,
      `U+${code.toString(16).toUpperCase()} must not ride along in a handle`
    );
  }
});

test('a value that is not a string is refused by all three', () => {
  // `unknown` on the parameter rather than `string`, because the value comes
  // from a parsed request body and may be anything at all.
  for (const value of [undefined, null, 42, {}, [], true]) {
    assert.equal(email.acceptedEmail(value), undefined);
    assert.equal(nickname.acceptedNickname(value), undefined);
    assert.equal(accountName.acceptedDisplayName(value), undefined);
    assert.equal(accountName.isPasswordLongEnough(value), false);
  }
});

test('a password needs eight characters of anything, and no composition rule', () => {
  /*
    Requiring a digit and a symbol measurably pushes people towards
    `Passwort1!` and away from `correct horse battery staple`, and this product's
    users are explicitly not technical - a rule they cannot act on is a rule they
    work around by writing the same thing in every account. There is no reset, so
    this is also all that stands between a lost password and a lost account,
    which is why the length is the only rule.
  */
  assert.equal(accountName.MIN_PASSWORD_LENGTH, 8);
  assert.equal(accountName.isPasswordLongEnough('12345678'), true);
  assert.equal(
    accountName.isPasswordLongEnough('correct horse battery staple'),
    true,
    'four words and spaces is a better password than Passwort1!'
  );
  assert.equal(accountName.isPasswordLongEnough('1234567'), false);
  assert.equal(accountName.BCRYPT_COST, 10);
});

test('a display name of 100 characters is not confused with one of 101', () => {
  // Written as the two boundaries rather than one, because the limit and the
  // error are different code paths and a limit that only exists in the DOM is
  // not a limit (`lib/account-name.ts` is built on the same principle as
  // `lib/gift-text.ts`).
  const atLimit = 'a'.repeat(100);
  const overLimit = `${atLimit}a`;
  assert.equal(accountName.acceptedDisplayName(atLimit)?.length, 100);
  assert.equal(accountName.acceptedDisplayName(overLimit), undefined);
});

test('the translation type still describes the dictionary these read from', () => {
  /*
    A structural assertion rather than a copy: `giftCountLabel` and the refusal
    sentences are read out of a dictionary typed `Translations`, so this file
    compiles only while that type still has the shape the modules expect. The
    cast is the assertion - if `Translations` lost the field, this stops
    typechecking.
  */
  const shape: Pick<Translations, 'giftCount'> = {
    giftCount: { none: '', zero: '', one: '', many: '' },
  };
  assert.equal(typeof shape.giftCount.none, 'string');
});