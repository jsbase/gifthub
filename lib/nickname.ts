/**
 * What a nickname may be, and why the server refused it.
 *
 * A nickname is the handle a person signs in with, and it is **unique**. That is
 * the whole reason it exists as a separate thing from the display name:
 *
 *   nickname    unique, lowercased, what you type to get in
 *   displayName not unique, keeps its case, what other people see
 *
 * They were conflated until sign-in accepted either one, and the conflation had to
 * be broken: two accounts are both called "Anna", so a display name cannot
 * identify anybody. Two things can - the address, which is unique but tedious to
 * type on a phone - and the nickname, which is unique and short. Hence a third
 * field rather than a choice between two bad ones.
 *
 * Uniqueness is enforced by a database constraint, not by this module. A validator
 * that checks "is this taken" and a unique index that enforces it will disagree
 * under concurrency, and the constraint is the one that cannot be raced. This
 * module decides what is *well-formed*; `Account.nickname` being `@unique` decides
 * what is *taken*.
 *
 * Free of I/O and of `next/headers` so the register form can import it for live
 * validation, exactly as `lib/email.ts` and `lib/account-name.ts` do. One rule, one
 * module, imported by both halves - which is the point of the arrangement, since a
 * form that validated differently from the route would refuse inputs the server
 * accepts.
 */

// Letters from any script, digits, and the three separators people expect in a
// handle. Unicode-aware for the same reason the display name is: de and ru are
// equally first-class, so `анна` is a nickname and not a rejected one.
const NICKNAME_REGEX = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}._-]{1,31}$/u;

/**
 * Pasted text arrives with the wrong hyphen and the wrong space.
 *
 * Only these two are rewritten. The genuinely invisible characters stay rejected:
 * they make two *different* nicknames render identically, which is worse for a
 * login handle than for a display name, because the person then cannot tell which
 * one they typed - and the handle is what gets them in.
 *
 * NFC first, so "Müller" typed two ways is one nickname rather than two, which for
 * a unique identifier is not cosmetic: two spellings of one name would either both
 * fail the unique index or resolve to whichever row was written first.
 */
/*
 * Built by code point rather than written literally, for the reason the display
 * name does the same: these characters are invisible by definition, so a literal in
 * source is invisible too, and a normaliser that normalises nothing while looking
 * correct is worse than none.
 */
const NO_BREAK_SPACE = String.fromCharCode(0x00a0);
const NON_BREAKING_HYPHEN = String.fromCharCode(0x2011);

export const normalizeNickname = (nickname: string): string =>
  nickname
    .normalize('NFC')
    .split(NO_BREAK_SPACE)
    .join('')
    .split(NON_BREAKING_HYPHEN)
    .join('-')
    .toLowerCase();

/**
 * The normalised form, if it is a nickname this product can hold.
 *
 * Returns the value to store rather than a boolean, so the caller cannot store the
 * form it validated and a different one.
 */
export const acceptedNickname = (nickname: unknown): string | undefined => {
  if (typeof nickname !== 'string') return undefined;
  const normalized = normalizeNickname(nickname);
  return NICKNAME_REGEX.test(normalized) ? normalized : undefined;
};

/*
 * There is deliberately no nickname-specific refusal union here.

 * A first version exported `NicknameRefusal` and `isNicknameRefusal`, narrowing
 * `invalid_nickname` and `duplicate_nickname` on their own. It was the second
 * vocabulary in the product, which is the thing `lib/refusals.ts` exists to prevent:
 * a client narrowing against the small one would reject the codes it had not heard
 * of and fall through to a generic sentence, and adding a refusal would mean
 * remembering two lists. The two codes are in the closed union, mapped to statuses
 * in `lib/api-refusal.ts` and worded in `lib/translations/*.json` like every other.

 * `duplicate_nickname` is a separate code from `duplicate_email` rather than a
 * shared one, and that is the only reason this paragraph exists rather than the
 * file simply not mentioning refusals: they are different fields, shown under
 * different inputs, and the sentence a person needs for "that nickname is taken" is
 * not the one for "that address is taken".
 */