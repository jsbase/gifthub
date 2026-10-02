/**
 * What a member may be called, and why the server refused one.
 *
 * The rule was written out twice: once as the regex and the normaliser in
 * `app/api/members/route.ts`, and once as the two refusal strings in
 * `components/add-member-dialog.tsx`, keyed by two bare literals that nothing tied
 * to the server that mints them. A rename on either side would have compiled.
 *
 * This module is the one place both halves come from. It is deliberately free of
 * I/O and of `next/headers`, so the client can import the type and the narrowing
 * predicate without pulling a server module into the browser bundle.
 */

// Unicode-aware on purpose: de/en/ru are equally first-class per PRODUCT.md and
// de is the default locale, so `\p{L}\p{M}` is what real names are made of. Do not
// "simplify" this back to ASCII. Anchoring the class is also what rejects
// zero-width and other invisible characters: they are neither letters nor marks.
const MEMBER_NAME_REGEX = /^(?=[^\p{L}]*\p{L})[\p{L}\p{M}\p{N} .\-'’]{1,100}$/u;

/**
 * Pasted text arrives with the wrong space and the wrong hyphen. Rewriting them
 * is the point, not accepting them: a name carrying `U+00A0` and the same name
 * typed plainly have to be the same member, or the duplicate check stops
 * recognising them and the list grows a second row that looks identical.
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
 * different members. Composing first makes the comparison - and the stored value
 * - the same either way.
 */
export const normalizeMemberName = (name: string): string =>
  name.normalize('NFC').replace(/\u00A0/g, ' ').replace(/\u2011/g, '-');

/**
 * The normalised form, if it is a name this product can hold.
 *
 * Returns the value to store rather than a boolean, so the caller cannot
 * accidentally store the form it validated and a different one - which was the
 * whole reason normalisation runs before validation and before the duplicate
 * check rather than after.
 */
export const acceptedMemberName = (
  name: unknown
): string | undefined => {
  if (typeof name !== 'string') return undefined;
  const normalized = normalizeMemberName(name);
  return MEMBER_NAME_REGEX.test(normalized) ? normalized : undefined;
};

/**
 * Why a name was refused. Two reasons, not one, and the client has to be able to
 * tell them apart: "that is not a name" and "that name is taken" are different
 * sentences in the user's language, and the second is the more common of the two
 * by some distance.
 */
export type MemberNameRefusal = 'invalid_name_format' | 'duplicate_name';

export const MEMBER_NAME_REFUSALS: MemberNameRefusal[] = [
  'invalid_name_format',
  'duplicate_name',
];

/**
 * Narrow an unknown `code` from a response body to a refusal reason.
 *
 * Written as two comparisons against literals rather than as a lookup, and that
 * is the security property: `code` is attacker-reachable JSON, so a bare
 * `table[data.code]` finds `Object.prototype.constructor` when someone posts
 * `{"code":"constructor"}` and renders a function as a name error. Comparing
 * against literals cannot reach the prototype at all, so this replaces the
 * `hasOwnProperty` call that used to guard that table.
 */
export const isMemberNameRefusal = (
  code: unknown
): code is MemberNameRefusal =>
  code === 'invalid_name_format' || code === 'duplicate_name';