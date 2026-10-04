import prisma from '@/lib/prisma';
import type { Outcome } from '@/lib/list-access';
import type { Refusal } from '@/lib/refusals';
import type { AccountSearchResult } from '@/types';

/**
 * Naming an account, by nickname or by address, for the sharing dialog.
 *
 * This is the one place in the product that answers "who is this?" with a *set*. Every
 * other cross-account lookup resolves exactly one row or fails: `grantAccess` finds an
 * account by an address it was handed, and the sign-in route resolves a nickname or an
 * address to one account because both are `@unique`. So this module is where the
 * product's central claim - that there is no directory, no search, no public face for
 * anybody - is either kept or quietly given up, and the answer is decided by what it
 * refuses rather than by what it returns.
 *
 *   rule                         why
 *   ----------------------------------------------------------------------------
 *   authenticated, always        there is no anonymous way to learn who exists.
 *   and the caller owns a list   the requirement scopes this to "when sharing a
 *                                wishlist", so the endpoint inherits that scope: an
 *                                account with zero lists cannot enumerate anybody,
 *                                and the cheapest account to create is one with no
 *                                lists.
 *   3 characters minimum         one or two characters turn the field into a
 *                                alphabet probe: `a` says how many accounts are
 *                                called Anna.
 *   8 results maximum            enough to choose from, few enough that the response
 *                                cannot be paged into a full list.
 *   no total, ever               "more exist" is visible as a full page of results;
 *                                a count is not, and a count is what turns a lookup
 *                                into an instrument.
 *   the caller excluded          you are not somebody you are looking for.
 *
 * What survives all of that is a real widening of what an owner can learn, and it is
 * recorded here rather than argued away: before this, an owner could only discover that
 * an address belonged to an account by supplying the **whole** address
 * (`no_such_account`). Typing `ann` now returns `anna` together with
 * `anna@example.test`. The rules above bound it; none of them un-widens it. That trade
 * is the owner's decision and the reasoning is in the design spec §2.1.
 *
 * There is no rate limiting here, and the omission is deliberate and recorded in spec
 * §6.2. The repo has none anywhere, and adding it is a new subsystem touching every
 * route. `app/api/auth/login/route.ts:127-129` cites the absence of a rate limit as
 * one reason *not* to hand out a distinct answer there, so this is the one honest gap
 * the search opens, and it is written down rather than left to be discovered.
 */

/** Below this, no query runs at all and nothing is disclosed about matches. */
const MIN_QUERY_LENGTH = 3;

/**
 * Long enough that "somebody typed a whole sentence by mistake" is refused before it
 * reaches the database, short enough that no legitimate handle is longer.
 */
const MAX_QUERY_LENGTH = 64;

/**
 * The page size.
 *
 * Eight is enough that two similar handles can be told apart - which is the whole
 * reason this endpoint exists - and small enough that four requests cannot walk the
 * account table. It is deliberately not configurable: a limit that could be raised is
 * a limit nobody has agreed on.
 */
const MAX_RESULTS = 8;

/**
 * Backslash, by code point rather than as a literal.
 *
 * A `\` written as `\\` in a JS string is already a backslash, and a `'\_'` in source is
 * simply `_` - so a literal here would silently be the character it is meant to escape.
 * `lib/account-name.ts` builds its invisible characters the same way, for the same
 * reason: these characters are invisible by definition, so a literal in source is
 * invisible too.
 */
const BACKSLASH = String.fromCharCode(0x005c);

/**
 * Escape the LIKE metacharacters in a prefix query.
 *
 * **Prisma does not do this for us, and that is not a maybe.** Its
 * `query-engine/query-builders/sql-query-builder` builds
 * `ScalarCondition::StartsWith(value)` into `comparable.like(format!("{value}%"))` -
 * plain interpolation, no escaping function anywhere on the path, and no `ESCAPE`
 * clause emitted for Postgres. The value reaches the database as a bound parameter, so
 * the only question is whether the *string* was escaped before it was bound, and it is
 * not. A Prisma maintainer states the same on prisma/prisma#19506: "We didn't do
 * anything intentional to escape the wildcard characters of target strings that are
 * transformed into SQL LIKE queries, and as of today this is the intended behavior."
 *
 * It matters here because both columns admit these characters:
 * `NICKNAME_REGEX` (`lib/nickname.ts:32`) permits `_`, and `EMAIL_REGEX`
 * (`lib/email.ts:19`) is a negated class over `@`, `.` and whitespace, so `%` passes in
 * the local part. Unescaped, `a_b` matches `axb` and `a%b` matches `axxxb` - and since
 * the query is matched as a *prefix*, a query of just `_` would match every nickname
 * and every address in the database, which is the entire account table.
 *
 * Backslash is Postgres's default `LIKE` escape character, so no `ESCAPE` clause is
 * needed and Prisma has no way to add one. Escape order matters: the backslash itself
 * has to be escaped first, or the backslashes this function adds would themselves be
 * escaped and stop working.
 */
const escapeLikePrefix = (query: string): string =>
  query
    .split(BACKSLASH)
    .join(BACKSLASH + BACKSLASH)
    .split('%')
    .join(BACKSLASH + '%')
    .split('_')
    .join(BACKSLASH + '_');

const done = <T>(value: T): Outcome<T> => ({ ok: true, value });
const refused = <T>(refusal: Refusal): Outcome<T> => ({ ok: false, refusal });

/**
 * The query as this module will use it: NFC-composed, lowercased, trimmed.
 *
 * Lowercased because both columns are stored lowercased - `schema.prisma` says so on
 * `Account.email` ("Stored trimmed and lowercased, never as typed") and on
 * `Account.nickname` ("Lowercased on the way in") - which is also what lets the search
 * be a prefix match on the existing unique indexes instead of a case-insensitive scan.
 * `app/api/auth/login/route.ts:46-48` makes the same point: nicknames are stored
 * lowercased, so an exact comparison would fail every capitalised attempt.
 *
 * NFC because "Müller" typed two ways is two strings to Postgres and one handle to the
 * person holding it, which for a prefix means half the matches a person expects. Both
 * halves come from the normalisers this product already trusts -
 * `lib/nickname.ts` and `lib/email.ts` - rather than from a rule written here.
 */
const normalizedQuery = (query: string): string =>
  query.trim().normalize('NFC').toLowerCase();

/**
 * Whether this account may look anybody up at all.
 *
 * The "owns at least one list" half of the rule in the header, and it is a question
 * about the caller's *other* data rather than about the query, so it is answered before
 * the query is even read. An account with no lists has nothing to share and therefore no
 * reason to be in the sharing dialog, and refusing it costs the feature nothing: the
 * owner of the first list they create can search immediately.
 *
 * `count` rather than `findFirst` because the question is whether any row exists and
 * the answer is never displayed - taking one row would put a list id in memory for no
 * reason and imply to a reader of this code that the id is used.
 */
const ownsAList = async (accountId: string): Promise<boolean> =>
  (await prisma.list.count({ where: { ownerId: accountId } })) > 0;

/**
 * Accounts whose nickname or email begins with the query.
 *
 * `matched` is decided per row rather than per query, because one query can match both
 * columns - typing `anna` finds the nickname `anna` *and* the address
 * `anna@example.test` - and telling the owner which one is why a row is in the list is
 * what lets them pick between two similar handles without comparing addresses by eye.
 * An account matching both answers `nickname`, because that is the field a person
 * thinks of as the handle.
 *
 * The two `startsWith` filters are in one `OR` rather than run as two queries, so a
 * single account cannot appear twice when both columns match.
 */
export const searchAccounts = async (
  query: unknown,
  accountId: string
): Promise<Outcome<AccountSearchResult[]>> => {
  if (typeof query !== 'string') return refused('invalid_search_query');

  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH || trimmed.length > MAX_QUERY_LENGTH) {
    return refused('invalid_search_query');
  }

  if (!(await ownsAList(accountId))) return refused('not_found');

  /*
    Two forms of the same query, and conflating them is a bug: `normalized` is what a
    stored value looks like, `needle` is what goes into the `LIKE` pattern with its
    metacharacters escaped. Comparing a row against `needle` would ask whether
    `anna` starts with `anna`, and for a query containing `_` it would ask whether
    `anna` starts with `a\_b` - never true, so every such row would be reported as
    having matched its address regardless of which column actually hit.
  */
  const normalized = normalizedQuery(trimmed);
  const needle = escapeLikePrefix(normalized);

  const rows = await prisma.account.findMany({
    where: {
      id: { not: accountId },
      OR: [{ nickname: { startsWith: needle } }, { email: { startsWith: needle } }],
    },
    select: { id: true, nickname: true, displayName: true, email: true },
    orderBy: { nickname: 'asc' },
    take: MAX_RESULTS,
  });

  /*
    Ordered by nickname rather than by relevance, deliberately. There is no relevance:
    a prefix match has no ranking, and a client that scored by "how much of the handle
    was typed" would be inventing an ordering the person did not ask for. Nickname
    order at least puts the results in a stable, predictable sequence, which matters
    because the cap means the list is truncated - an unstable order would make the
    eight people shown depend on the query engine's mood.
  */
  return done(
    rows.map((row) => ({
      id: row.id,
      nickname: row.nickname,
      displayName: row.displayName,
      email: row.email,
      matched: row.nickname.startsWith(normalized)
        ? ('nickname' as const)
        : ('email' as const),
    }))
  );
};