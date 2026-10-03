import type { NextRequest } from 'next/server';

/**
 * Whether a cookie served on this request may be marked `Secure`.
 *
 * It used to be `NODE_ENV === 'production'`, which is the wrong question. What
 * matters is whether the connection the cookie is travelling over is encrypted: a
 * `Secure` cookie sent over plain http is not stored at all by most browsers, so
 * the flag does not "weaken" anything on http - it removes the session.
 *
 * That is invisible on a deployed app, where everything is https either way, and
 * invisible in CI, because Chrome treats `localhost` as a secure context and will
 * happily store a `Secure` cookie over http. It is only WebKit and Safari that
 * refuse, and only locally - which is how fourteen login tests could pass in CI
 * and fail against a production build on a laptop, with nothing in the diff to
 * explain it.
 *
 * Proxy headers are honoured because that is how the app is reached in production:
 * Vercel terminates TLS and forwards plain http internally, so `request.protocol`
 * reports `http` on a served-over-https request unless `x-forwarded-proto` is
 * consulted. Getting that wrong in the other direction - trusting a header that
 * says https when the client is not - would hand out a cookie the browser then
 * refuses to send, which is the same failure wearing a different hat.
 *
 * There is no test for this, and there cannot be one. The failure it exists to
 * prevent is only visible to the engine that refuses to store the cookie: only
 * WebKit and Safari drop a `Secure` cookie served over plain http, and only
 * locally, so a suite could only see it by running real WebKit against a real
 * non-https origin - which is the whole five-browser matrix on a laptop rather
 * than a test. The regression check is the manual procedure, not an assertion:
 * point the login specs at `npm run start` over `http://localhost` and see
 * whether WebKit signs in. Chromium alone passing proves nothing about this.
 */
export const cookieIsSecure = (request: NextRequest): boolean => {
  const forwarded = request.headers.get('x-forwarded-proto');

  if (forwarded) {
    return forwarded.split(',')[0]?.trim() === 'https';
  }

  return (
    request.nextUrl.protocol === 'https:' ||
    process.env.NODE_ENV !== 'production'
  );
};