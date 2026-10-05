import { NextResponse } from 'next/server';
import type { Refusal } from '@/lib/refusals';

/**
 * A refusal, as a response.
 *
 * Three groups, and the boundary between them is the product's rather than HTTP's:
 * a request refused before anything is looked up (400), a request about a list this
 * account has no relationship to (404), and a request about a list it can already
 * read but is not granted the action for (403). `lib/list-access.ts` decides which of
 * the three applies - see its header table - and this only spells it on the wire.
 *
 * This existed as a `Record<Refusal, ...>` written out in three route files. Each
 * copy was complete, which meant the closed union compile-checked all three and a
 * new refusal could not slip past; but three copies of the same eleven entries is
 * three places for the 404/403 line to move in one file only, and that line is the
 * one disclosure in this product that must not drift. One copy, typed against the
 * union, exhaustively.
 *
 * It lives here rather than in `lib/refusals.ts` because it imports `next/server`,
 * and `lib/refusals.ts` is imported by the client for `isRefusal`. That module is
 * deliberately free of server imports so it can cross the client boundary; the
 * reason is the same one that keeps `lib/account-name.ts` free of `next/headers`.
 * Splitting the two is what lets the vocabulary stay shared and the response stay
 * server-side.
 *
 * The `message` is a fallback in English. It exists so a response is never
 * bodyless, not because it is what a person should read: the client has the
 * `code`, and `lib/translations/*.json` has the sentence in their language. The
 * reason the `code` rides along at all is that `forbidden` and
 * `cannot_clear_purchase` are two different sentences to a person, and `message`
 * alone cannot separate them.
 */
const STATUS: Record<Refusal, number> = {
  invalid_email: 400,
  duplicate_email: 400,
  invalid_nickname: 400,
  duplicate_nickname: 400,
  weak_password: 400,
  invalid_display_name: 400,
  invalid_identifier: 400,
  nothing_to_change: 400,
  ambiguous_change: 400,
  invalid_visibility: 400,
  /*
    400 rather than 404 or 403 because the two lists in this request are both the
    caller's own and they are the same one: nothing is being hidden and no permission
    is being denied. It is the answer to a malformed request, which is what it is.
  */
  already_on_this_list: 400,
  already_shared: 400,
  cannot_share_with_owner: 400,
  not_shared_yet: 400,
  invalid_search_query: 400,
  duplicate_group_name: 400,
  no_such_account: 404,
  /*
    404 for the same reason `no_such_account` is one, and it is the group's owner who
    is refused: an account naming a group it does not own must not learn that the group
    exists, exactly as an account naming somebody else's list is told there is nothing
    there rather than that it is off limits.
  */
  no_such_group: 404,
  not_found: 404,
  forbidden: 403,
  cannot_join_own_group: 403,
  cannot_clear_purchase: 403,
};

const MESSAGE: Record<Refusal, string> = {
  invalid_email: 'That is not an email address',
  duplicate_email: 'An account already has this address',
  invalid_nickname: 'That nickname cannot be used',
  duplicate_nickname: 'That nickname is already taken',
  weak_password: 'Password must be at least 8 characters',
  invalid_display_name: 'That name cannot be used',
  invalid_identifier: 'That is not a nickname or an email address',
  nothing_to_change: 'Nothing was changed',
  ambiguous_change: 'Change either the name or the visibility, not both',
  invalid_visibility: 'That visibility does not exist',
  already_on_this_list: 'That wish is already on this list',
  already_shared: 'This list is already shared with them',
  cannot_share_with_owner: 'You already have this list',
  not_shared_yet: 'Make the list shared before sharing it',
  no_such_account: 'No account has this address',
  invalid_search_query: 'Type a few more characters to look somebody up',
  /*
  Said in terms of the account rather than of a name, because the routes address a
  group by id and a fallback sentence that offers a name would be answering a question
  nobody asked.
*/
  no_such_group: 'There is no group of yours here',
  duplicate_group_name: 'You already have a group with that name',
  cannot_join_own_group: 'You cannot be a member of your own group',
  not_found: 'There is nothing here for you',
  forbidden: 'This list does not grant that',
  cannot_clear_purchase: 'Somebody else marked this idea bought',
};

export const statusForRefusal = (refusal: Refusal): number => STATUS[refusal];

export const refusalResponse = (refusal: Refusal): NextResponse =>
  NextResponse.json(
    { message: MESSAGE[refusal], code: refusal },
    { status: STATUS[refusal] }
  );