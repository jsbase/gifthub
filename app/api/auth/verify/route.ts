import { NextRequest, NextResponse } from 'next/server';
import { requireAccount } from '@/lib/auth-server';

export const GET: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  /*
    The silent variant exists because the header asks this question on every render
    to decide whether to show the person's name or the sign-in button
    (`PRODUCT.md:72`). A signed-out visitor is a normal state, not a failure, so it
    answers 200 with `success: false` and lets the caller carry on. The
    non-silent variant is the one the sign-out flow uses to confirm, and there a 401
    is the answer.
  */
  const isSilentAuth = request.headers.get('X-Silent-Auth') === '1';

  try {
    /*
      `requireAccount` is the only place the session is read, and it returns
      `null` for all three ways of having no session: no cookie, a bad signature, and
      a token naming an account that has since been deleted. This route used to
      verify the JWT itself and answer from the payload; reading the account
      instead is what makes the header name real - a token can outlive the row it
      names, and a display name in a stale token would be a name this person no
      longer goes by.
    */
    const account = await requireAccount();

    if (!account) {
      return NextResponse.json(
        { success: false },
        { status: isSilentAuth ? 200 : 401 }
      );
    }

    /*
      `id` is left out on purpose. Nothing in the client needs it, and this
      response is read on every page load, so the smallest useful answer is the one
      that ships. The password is not merely forgotten here - it is not selected
      anywhere on this path, so there is nothing to leak.
    */
    return NextResponse.json({
      success: true,
      email: account.email,
      displayName: account.displayName,
    });
  } catch (error) {
    /*
      Reaching here at all means something is wrong rather than that the person is
      signed out - a signed-out visitor took the branch above and never got here -
      so it is worth a line in the log. The response is still the signed-out one:
      this route cannot distinguish a database that is down from a cookie that is
      stale, and answering 500 would leave the header unable to say anything at all
      about who is using the page.
    */
    console.error('Error verifying session:', error);

    return NextResponse.json(
      { success: false },
      { status: isSilentAuth ? 200 : 401 }
    );
  }
};
