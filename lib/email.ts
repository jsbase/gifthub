/**
 * What an account's address may be, and why the server refused one.
 *
 * Deliberately not an RFC implementation. There is no verification mail and no
 * domain check, because neither would change what the product can do with an
 * address: it is a lookup key and a way for one person to name another. What it
 * *does* have to do is be a stable key, which is why `normalizeEmail` exists at
 * all and why it runs before every comparison rather than inside the form.
 *
 * The form is not the security boundary. A regex in a client component is a
 * suggestion to a person holding a keyboard; the same rules run again on the way
 * in, in `lib/list-access.ts` and in the register route, against whatever the
 * request actually contained.
 */

// A pragmatic shape rather than an accurate one: something, an `@`, something
// with at least one dot after it, nothing exotic. Anchored, so a newline cannot
// ride along at the end and turn one field into two lines of a log.
const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/u;

/**
 * Pasted addresses arrive with capital letters and stray space, and both have to
 * collapse to the same key or the account splits in two.
 *
 * `Anna@Example.de` and `anna@example.de` are one person, and a bare
 * `@unique` in Postgres is case-sensitive: without this, the second address
 * registers as a new account, the person gets "taken" for an address they do not
 * own, and neither account can ever be reached by the address the other one used.
 *
 * Only case and outer space are rewritten. Nothing inside the local part is
 * touched, because `Local-Part` and `local-part` are legal *distinct* addresses
 * and folding them together would merge two real accounts.
 */
export const normalizeEmail = (email: string): string =>
  email.normalize('NFC').trim().toLowerCase();

/**
 * A length ceiling, and why it exists at all.
 *
 * 254 is the longest address that survives every hop, and an unbounded column is a
 * place for a paste to go wrong quietly. It is folded into `acceptedEmail` rather
 * than left as a separate check for the caller to remember: a limit exported
 * separately is a limit that is applied nowhere, and it existed here as two unused
 * exports until the first route that could enforce it needed one.
 */
const MAX_EMAIL_LENGTH = 254;

/**
 * The normalised form, if it is an address this product can hold.
 *
 * Returns the value to store rather than a boolean, for the same reason
 * `acceptedDisplayName` does: the caller cannot then store the form it validated
 * and a different one, which was the reason normalisation was moved ahead of the
 * duplicate check rather than left after it.
 */
export const acceptedEmail = (email: unknown): string | undefined => {
  if (typeof email !== 'string') return undefined;
  const normalized = normalizeEmail(email);
  if (normalized.length > MAX_EMAIL_LENGTH) return undefined;
  return EMAIL_REGEX.test(normalized) ? normalized : undefined;
};