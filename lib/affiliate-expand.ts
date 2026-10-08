import type { AffiliateProgram } from '@/lib/affiliate-link';

/*
  Resolving a short link (`amzn.to`, `amzn.eu`, `a.co`) to the address it stands
  for, so that an affiliate tag somebody else put behind the short link is on the
  address we store and `affiliateLink` can replace it. A short link carries the
  tag in its redirect and not in its URL, so there is nothing to replace until it
  is opened once.

  It runs on save and nowhere else: a request to a third party on every render of
  every sheet is not a price worth paying, and a save is the one moment a wish is
  already waiting on the network. Server only, because the browser would have to
  follow the redirect itself and could not read where it went.

  This is the only place the feature makes the server fetch an address a person
  typed, so it is built around what it must not do:

    - It only requests an address a programme's `shortLinks` rule allows: a listed
      host and a path shaped like a short code, over https, with no port, no
      credentials and no query. Anything else is returned untouched and never
      fetched, which is what stops a wish being a way to make our server request an
      internal address or an arbitrary path on a listed one.
    - It does not follow a redirect to an address that is neither a link the
      programme recognises nor another short link its rules allow. The destination
      of somebody else's short link is not trusted either.
    - It never opens the product page. The redirect's own `Location` already says
      where it goes, and reading the page would be a download from a host we do
      not control.
    - It does not read a body, makes at most `maxHops` requests, and has one
      deadline for all of them.
    - It cannot fail a save: every way it can go wrong returns the address as the
      person typed it, which is then stored and simply not tagged.
*/

const DEFAULT_MAX_HOPS = 3;
const DEFAULT_TIMEOUT_MS = 3000;

export interface ExpandOptions {
  /** Injected so tests never touch the network. */
  fetch?: typeof fetch;
  /** The most requests one expansion may make. */
  maxHops?: number;
  /** One budget for all of them, not one per request. */
  timeoutMs?: number;
}

const isWebAddress = (url: URL) =>
  url.protocol === 'https:' || url.protocol === 'http:';

/**
 * The address to request for `url`, or `null` when it is not one we may send.
 *
 * Built from the host in the programme's own rule plus the path, and never from
 * `url` itself. The typed address is checked, not forwarded: what leaves the
 * server is always `https`, always a host somebody listed, with no port, no
 * credentials and no query, whatever was typed or whatever a redirect asked for.
 * The path is the one part a person controls, so it is only used once it has
 * matched the rule's shape for a short code - a few letters and digits, nothing
 * that could name another path, another host or a dot segment - and a path that
 * does not match is not requested at all.
 */
function requestFor(program: AffiliateProgram, url: URL): URL | null {
  const rule = program.shortLinks?.find(
    (listed) => listed.host === url.hostname && listed.path.test(url.pathname)
  );
  if (!rule) return null;
  if (url.port !== '' || url.username !== '' || url.password !== '') return null;
  return new URL(`https://${rule.host}${url.pathname}`);
}

/**
 * The long address behind a short link, or `url` unchanged.
 */
export async function expandShortLink(
  url: string,
  programs: readonly AffiliateProgram[],
  options: ExpandOptions = {}
): Promise<string> {
  const fetchImpl = options.fetch ?? fetch;
  const maxHops = options.maxHops ?? DEFAULT_MAX_HOPS;

  let current: URL;
  try {
    current = new URL(url);
  } catch {
    return url;
  }
  if (!isWebAddress(current)) return url;

  // The first programme with a short-link rule this address satisfies, and the
  // request that rule allows for it. Neither exists for anything else, which is
  // returned untouched and never fetched.
  let program: AffiliateProgram | undefined;
  let request: URL | null = null;
  for (const candidate of programs) {
    request = requestFor(candidate, current);
    if (request) {
      program = candidate;
      break;
    }
  }
  if (!program || !request) return url;

  /*
    A controller and a timer of our own rather than `AbortSignal.timeout`, whose
    timer does not keep the event loop alive: in a process with nothing else
    running, the pending request would be abandoned instead of aborted. The timer
    is cleared below, so a fast answer does not leave one behind.
  */
  const deadline = new AbortController();
  const timer = setTimeout(
    () => deadline.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  try {
    for (let hop = 0; hop < maxHops; hop++) {
      const response = await fetchImpl(request, {
        redirect: 'manual',
        signal: deadline.signal,
      });
      // Only a header is wanted. Cancelling releases the connection without
      // reading what the host chose to send.
      await response.body?.cancel();

      const location =
        response.status >= 300 && response.status < 400
          ? response.headers.get('location')
          : null;
      if (!location) return url;

      const next = new URL(location, current);
      if (!isWebAddress(next)) return url;
      if (program.recognises(next)) return next.toString();
      const nextRequest = requestFor(program, next);
      if (!nextRequest) return url;
      current = next;
      request = nextRequest;
    }
  } catch {
    return url;
  } finally {
    clearTimeout(timer);
  }
  return url;
}
