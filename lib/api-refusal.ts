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
  weak_password: 400,
  invalid_display_name: 400,
  already_shared: 400,
  cannot_share_with_owner: 400,
  not_shared_yet: 400,
  no_such_account: 404,
  not_found: 404,
  forbidden: 403,
  cannot_clear_purchase: 403,
};

const MESSAGE: Record<Refusal, string> = {
  invalid_email: 'That is not an email address',
  duplicate_email: 'An account already has this address',
  weak_password: 'Password must be at least 8 characters',
  invalid_display_name: 'That name cannot be used',
  already_shared: 'This list is already shared with them',
  cannot_share_with_owner: 'You already have this list',
  not_shared_yet: 'Make the list shared before sharing it',
  no_such_account: 'No account has this address',
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