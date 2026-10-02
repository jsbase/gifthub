/**
 * Every refusal the API can return, as one vocabulary.
 *
 * This existed in pieces. A name refusal lived in `lib/member-name.ts` as a
 * two-value union that the client narrowed with a literal comparison, and it was
 * correct to keep that narrow - two codes were genuinely all it produced. But the
 * refusal surface grew: an address can be malformed, taken, or unowned; a share
 * can be a stranger, a duplicate, or aimed at the owner; a mark can be one the
 * reader is not allowed to clear. Scattering those unions means a route inventing
 * a code as a bare string, and a client with a `switch` that silently falls through
 * on the ones it forgot.
 *
 * So the vocabulary lives here, once, and both halves import it: routes produce a
 * `Refusal`, and the client narrows an unknown `code` back into one. The union is
 * closed on purpose - adding a refusal is a deliberate act in this file, which is
 * the point.
 */
export type Refusal =
  // Credentials and fields.
  | 'invalid_email'
  | 'duplicate_email'
  | 'weak_password'
  | 'invalid_display_name'
  // Sharing.
  | 'no_such_account'
  | 'already_shared'
  | 'cannot_share_with_owner'
  | 'not_shared_yet'
  // Authorization.
  | 'not_found'
  | 'forbidden'
  | 'cannot_clear_purchase';

export const REFUSALS: Refusal[] = [
  'invalid_email',
  'duplicate_email',
  'weak_password',
  'invalid_display_name',
  'no_such_account',
  'already_shared',
  'cannot_share_with_owner',
  'not_shared_yet',
  'not_found',
  'forbidden',
  'cannot_clear_purchase',
];

/**
 * Narrow an unknown `code` from a response body to a refusal.
 *
 * Written as comparisons against literals rather than as a lookup, and that is the
 * security property: `code` is attacker-reachable JSON, so a bare
 * `REFUSALS.includes(code)` is safe but `table[code]` finds
 * `Object.prototype.constructor` when someone posts `{"code":"constructor"}` and
 * renders a function as a name error. This is carried over unchanged from the
 * narrower version it replaces, and it remains the reason this is not a map.
 */
export const isRefusal = (code: unknown): code is Refusal =>
  typeof code === 'string' &&
  (REFUSALS as string[]).includes(code) &&
  !Object.prototype.hasOwnProperty.call(Object.prototype, code);

/**
 * Whether the reader could not have been told the thing exists.
 *
 * The distinction the whole authorization design turns on. `not_found` says "there
 * is nothing here for you", which is what an account with no relationship to a list
 * must be told so that another person's list is never confirmed to exist.
 * `forbidden` and `cannot_clear_purchase` say "yes, and you may not", which is only
 * safe to say to somebody who can already read the list.
 */
export const HIDES_EXISTENCE = (refusal: Refusal): boolean =>
  refusal === 'not_found';