import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { searchAccounts } from '@/lib/account-search';
import { refusalResponse } from '@/lib/api-refusal';

/*
  The one endpoint that answers "who is this?" with a set.

  It is a `GET` and the account is found by the cookie rather than passed in,
  because there is no version of this route that is about somebody else's account:
  `lib/account-search.ts` scopes the whole capability to "this account owns at least
  one list", and that question can only be asked about the caller.
*/

export const GET: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  try {
    /*
      Before the query is read. The first rule in `lib/account-search.ts`'s header is
      that this is authenticated always, and there is no anonymous way to learn who
      exists - so a route that read `q` first and answered `invalid_search_query`
      would have told an unauthenticated caller that its two characters were too
      short, which is a disclosure about the rules before it is a refusal.
    */
    const accountId = await requireAccountId();
    if (!accountId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    /*
      `null` when the parameter is absent, and it is passed on as it is.
      `searchAccounts` takes `unknown` and refuses `invalid_search_query` for a
      missing query as well as a short or a very long one
      (`lib/account-search.ts:163-172`), which is why this route does not measure
      the string: a copy of the three-to-sixty-four rule here would be a second
      place to keep it, one that speaks in its own numbers rather than the
      module's, and the day one of them moves the other keeps answering with the
      old limit. The rule is worth stating near the code that enforces it, which is
      the module.
    */
    const q = request.nextUrl.searchParams.get('q');

    /*
      Two refusals, both mapped through `lib/api-refusal.ts` and neither collapsed
      into an empty array. `invalid_search_query` says "type a few more characters"
      and `not_found` says this account owns no list to share, and a person needs to
      know which of the two they got - "keep typing" is useless advice for somebody
      whose account owns nothing. They stay separable because the `code` rides along
      with the fallback sentence (`lib/api-refusal.ts:26-31`) and the client narrows
      it with `isRefusal`, which is the whole reason both codes are in the closed
      union rather than this route inventing one empty-results answer.
    */
    const found = await searchAccounts(q, accountId);
    if (!found.ok) return refusalResponse(found.refusal);

    return NextResponse.json({
      /*
        The results and nothing else. No `toWireSearchResult`, because
        `searchAccounts` already returns the wire shape - an explicit `select` in the
        query, the one value no column holds added beside it, and a return type of
        `AccountSearchResult` - so a mapper would copy four fields into four fields.
        The argument for an explicit mapping is that a spread would carry a new
        column out silently, and the select is that explicitness one layer earlier
        and closer to the column that would have to be added
        (`lib/wire.ts:154-167`).

        No count, and not as a later convenience. `lib/account-search.ts` gives
        "no total, ever" as one of its rules: a full page of results already says
        that more may exist and a number does not, and a count is what turns a lookup
        into an instrument. The eight-row cap is the bound; a count would replace it
        with something the cap cannot limit.
      */
      results: found.value,
    });
  } catch (error) {
    console.error('Error searching accounts:', error);
    return NextResponse.json(
      { message: 'Failed to search accounts' },
      { status: 500 }
    );
  }
};