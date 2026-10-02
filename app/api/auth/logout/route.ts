import { NextResponse } from 'next/server';

/*
  Signing out is the expiry of one cookie, and nothing else.

  There is no server-side session to invalidate, because the token is a stateless
  JWT - so a copy captured before this request still verifies for the rest of its
  seven days. That is the accepted shape of the session the product has always had
  (see the session contract in the design spec: unchanged in shape), and the reason
  the cookie is httpOnly and short-lived is unchanged with it. Building a server
  session to hang an off-switch on would be a second thing to keep in step with the
  token, for a threat the token's own expiry already bounds.
*/
export const POST: () => Promise<NextResponse> = async () => {
  const response = NextResponse.json({ success: true });

  response.cookies.set({
    name: 'auth-token',
    value: '',
    expires: new Date(0),
    path: '/',
  });

  return response;
};
