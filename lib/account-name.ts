/**
 * What a person may be called in this app, and why the server refused it.
 *
 * This used to be `lib/member-name.ts` and it asked what a *member of a group*
 * could be called. The rule did not change when the model changed; the subject
 * did. The name is now a person's own display name, shown in the header in place
 * of the wordmark, and it is chosen by the person rather than written down by
 * somebody else on a list that is about them.
 *
 * That last difference has one visible consequence: the name is now something a
 * person can get wrong about *themselves*, so the duplicate check no longer
 * applies. Two accounts may both be called "Anna". The display name identifies a
 * person loosely; the address identifies them exactly, and folding the two
 * together would refuse a second Anna a name she is entitled to use.
 *
 * The Unicode reasoning below is carried over from the version this replaces,
 * unshortened, because it is about German, Russian and macOS input rather than
 * about members.
 */

// Unicode-aware on purpose: de/en/ru are equally first-class per PRODUCT.md and
// de is the default locale, so `\p{L}\p{M}` is what real names are made of. Do not
// "simplify" this back to ASCII. Anchoring the class is also what rejects
// zero-width and other invisible characters: they are neither letters nor marks.
const DISPLAY_NAME_REGEX = /^(?=[^\p{L}]*\p{L})[\p{L}\p{M}\p{N} .\-'’]{1,100}$/u;

/*
 * The two characters that get rewritten, built by code point rather than written
 * literally.
 *
 * This is not obfuscation and it is not a workaround for looking unusual: the
 * characters are invisible by definition, so a literal in source is invisible too,
 * and a source file whose behaviour depends on a byte you cannot see is a file
 * that will eventually be reflowed by an editor and quietly stop rewriting
 * anything. `fromCharCode` says what it does and stays true when pasted.
 */
const NO_BREAK_SPACE = String.fromCharCode(0x00a0);
const NON_BREAKING_HYPHEN = String.fromCharCode(0x2011);

/**
 * Pasted text arrives with the wrong space and the wrong hyphen. Rewriting them
 * is the point, not accepting them: a name carrying a no-break space and the same
 * name typed plainly have to end up as the same string, or the header says one
 * thing and the share dialog says another.
 *
 * Only these two are rewritten. The genuinely invisible characters - `U+200B`,
 * `U+200D`, `U+FEFF`, `U+2028`, `U+2029` - stay rejected: they make two
 * *different* names render identically, which is a support problem rather than
 * a formatting one, and no amount of normalising recovers what was typed.
 *
 * NFC comes first, and it is not optional. The two normal forms of "Müller" are
 * byte-different and identical on screen: `ü` as one code point, or `u` plus a
 * combining diaeresis. macOS filesystems hand out the decomposed form routinely,
 * so the same person can be typed twice and pass the regex both times as two
 * different names. Composing first makes the stored value the same either way.
 */
export const normalizeDisplayName = (name: string): string =>
  name
    .normalize('NFC')
    .split(NO_BREAK_SPACE)
    .join(' ')
    .split(NON_BREAKING_HYPHEN)
    .join('-');

/**
 * The normalised form, if it is a name this product can hold.
 *
 * Returns the value to store rather than a boolean, so the caller cannot
 * accidentally store the form it validated and a different one.
 */
export const acceptedDisplayName = (name: unknown): string | undefined => {
  if (typeof name !== 'string') return undefined;
  const normalized = normalizeDisplayName(name);
  return DISPLAY_NAME_REGEX.test(normalized) ? normalized : undefined;
};

/**
 * A password's only rule, and the reason it is the only one.
 *
 * A minimum of eight characters, with no composition requirement. Requiring a
 * digit and a symbol measurably pushes people towards `Passwort1!` and away from
 * `correct horse battery staple`, and this product's users are explicitly not
 * technical - a rule they cannot act on is a rule they work around by writing the
 * same thing in every account. Eight characters of anything they will remember is
 * worth more than twelve characters of something they have to look up.
 *
 * There is no reset, so this is also the only thing standing between a lost
 * password and a lost account. That is a deliberate accepted loss recorded in the
 * spec rather than an oversight.
 */
export const MIN_PASSWORD_LENGTH = 8;

export const isPasswordLongEnough = (password: unknown): boolean =>
  typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;

/**
 * bcrypt cost 10, unchanged from the group and member hashes this replaces. It is
 * not the strongest available cost, and raising it is a one-line change with no
 * data migration - so it is recorded as a deliberate choice rather than an
 * oversight. Cost 10 is roughly 60ms on the hardware this deploys to, which is the
 * ceiling a phone that is also running a camera can absorb without the tap feeling
 * ignored.
 */
export const BCRYPT_COST = 10;