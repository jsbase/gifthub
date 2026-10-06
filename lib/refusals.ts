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
  | 'invalid_nickname'
  | 'duplicate_nickname'
  | 'weak_password'
  | 'invalid_display_name'
  // Sign-in.
  | 'invalid_identifier'
  // Request shape: the body named neither or both of the fields it may name.
  | 'nothing_to_change'
  | 'ambiguous_change'
  | 'invalid_visibility'
  /*
    A transfer whose destination is the list it started from. It is a request-shape
    refusal rather than a permission one - there is nothing here being hidden and
    nothing the caller is not allowed to do - so it is 400 and not 403 or 404, and it
    is answered by comparing two ids rather than by looking anything up.
  */
  | 'already_on_this_list'
  /*
    A transfer naming more wishes than one request may carry. Request-shape like the
    code above - it is decided from the body alone, before any list is looked at - so
    it is 400, and it is its own code rather than a reuse of `nothing_to_change`
    because the instruction it earns is different: not "name something" but "name
    fewer, and go again".
  */
  | 'too_many_gifts'
  // Sharing.
  | 'no_such_account'
  | 'already_shared'
  | 'cannot_share_with_owner'
  | 'not_shared_yet'
  // The account lookup behind the sharing dialog.
  //
  // Its own sentence rather than a reuse of `no_such_account`, and the distinction is
  // the useful one: that code says "that exact address belongs to nobody", this one
  // says "that was not enough to look anybody up", and telling somebody to retype a
  // whole address they already typed in full is the wrong instruction.
  | 'invalid_search_query'
  // Groups.
  | 'no_such_group'
  | 'duplicate_group_name'
  // A group's owner may not also be in it. Its own code rather than a reuse of
  // `forbidden`, because that sentence is about a *list* - "this list does not grant
  // that" - and it would be read in a dialog that is not about a list at all. The
  // closed vocabulary is where that mismatch is meant to be impossible.
  | 'cannot_join_own_group'
  // Authorization.
  | 'not_found'
  | 'forbidden'
  | 'cannot_clear_purchase';

export const REFUSALS: Refusal[] = [
  'invalid_email',
  'duplicate_email',
  'invalid_nickname',
  'duplicate_nickname',
  'weak_password',
  'invalid_display_name',
  'invalid_identifier',
  'nothing_to_change',
  'ambiguous_change',
  'invalid_visibility',
  'already_on_this_list',
  'too_many_gifts',
  'no_such_account',
  'already_shared',
  'cannot_share_with_owner',
  'not_shared_yet',
  'invalid_search_query',
  'no_such_group',
  'duplicate_group_name',
  'cannot_join_own_group',
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

