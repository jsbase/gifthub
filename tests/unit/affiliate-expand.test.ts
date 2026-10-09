import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

/*
  Resolving a short link on save, which is the one place this feature touches the
  network. So the suite is mostly about what the server must NOT do: fetch an
  address nobody allow-listed, follow a redirect to one, read a body, or wait
  forever. Each of those is a way to turn "tidy up this wish's link" into "make
  our server request a URL somebody chose", and each has its own test.

  `fetch` is passed in, so nothing here touches the network, and the answers are
  real `Response` objects because that is what the server's `fetch` hands back
  when it is told not to follow redirects.

  What Amazon actually answers is not tested here and cannot be: that needs a
  real short link, and it is checked by hand against one.
*/

const require = createRequire(import.meta.url);
const { expandShortLink } =
  require('../../lib/affiliate-expand.ts') as typeof import('@/lib/affiliate-expand');
const { amazonDe } =
  require('../../lib/affiliate-programs/amazon-de.ts') as typeof import('@/lib/affiliate-programs/amazon-de');

const AMAZON = amazonDe('test-21');
assert.ok(AMAZON);
const PROGRAMS = [AMAZON];

const LONG = 'https://www.amazon.de/dp/B0D98YCYSZ?tag=other-21&linkCode=ll1&th=1';

/** A `fetch` that answers from a table and records what it was asked for. */
function fakeFetch(table: Record<string, Response | Error>) {
  const asked: string[] = [];
  const impl = (async (input: URL | string) => {
    const key = input.toString();
    asked.push(key);
    const answer = table[key];
    if (answer instanceof Error) throw answer;
    return answer ?? new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
  return { impl, asked };
}

const redirect = (to: string, status = 301) =>
  new Response(null, { status, headers: { location: to } });

test('a short link that redirects to an amazon.de link comes back as that link', async () => {
  const { impl, asked } = fakeFetch({ 'https://amzn.to/3abcdef': redirect(LONG) });
  assert.equal(await expandShortLink('https://amzn.to/3abcdef', PROGRAMS, { fetch: impl }), LONG);
  // The product page itself is never requested: the redirect already said where it goes.
  assert.deepEqual(asked, ['https://amzn.to/3abcdef']);
});

test('an address that is not one of the allow-listed short-link hosts is never requested', async () => {
  // The allow-list is the programmes' `shortHosts` and nothing else. These are the
  // addresses a person could type into a wish to make our server fetch something
  // it should not: another site, our own internals, the cloud metadata service, a
  // look-alike of the short host, and the product page the redirect points at.
  const targets = [
    'https://example.com/x',
    'http://localhost:3000/api/lists',
    'http://169.254.169.254/latest/meta-data/',
    'https://amzn.to.evil.com/x',
    'https://evilamzn.to/x',
    'https://amzn.to@evil.com/x',
    'https://www.amazon.de/dp/B0D98YCYSZ',
  ];
  for (const target of targets) {
    const { impl, asked } = fakeFetch({});
    assert.equal(await expandShortLink(target, PROGRAMS, { fetch: impl }), target, target);
    assert.deepEqual(asked, [], `${target} must not be requested`);
  }
});

test('with no programme that has short-link hosts nothing is ever requested', async () => {
  const { impl, asked } = fakeFetch({});
  assert.equal(await expandShortLink('https://amzn.to/3abcdef', [], { fetch: impl }), 'https://amzn.to/3abcdef');
  assert.deepEqual(asked, []);
});

test('a redirect to somewhere that is neither one of our links nor a short host is not followed', async () => {
  // A short link is an address somebody else controls, so what it redirects to is
  // not trusted either. Following it would be a fetch of whatever it names.
  const { impl, asked } = fakeFetch({
    'https://amzn.to/3abcdef': redirect('http://169.254.169.254/latest/meta-data/'),
  });
  assert.equal(await expandShortLink('https://amzn.to/3abcdef', PROGRAMS, { fetch: impl }), 'https://amzn.to/3abcdef');
  assert.deepEqual(asked, ['https://amzn.to/3abcdef']);
});

test('anything that is not a web address is returned as it came in, and nothing is requested', async () => {
  for (const input of ['not a link', '', 'javascript:alert(1)', 'ftp://amzn.to/x', 'mailto:a@amzn.to']) {
    const { impl, asked } = fakeFetch({});
    assert.equal(await expandShortLink(input, PROGRAMS, { fetch: impl }), input, input);
    assert.deepEqual(asked, [], input);
  }
});

test('a chain of short links is followed to the end, relative redirects included', async () => {
  // a.co -> amzn.to -> (relative) amzn.to -> the long link: every hop is itself a
  // short-link host, which is the only reason it is requested.
  const { impl, asked } = fakeFetch({
    'https://a.co/d/xyz': redirect('https://amzn.to/3a'),
    'https://amzn.to/3a': redirect('/3b', 302),
    'https://amzn.to/3b': redirect(LONG),
  });
  assert.equal(await expandShortLink('https://a.co/d/xyz', PROGRAMS, { fetch: impl }), LONG);
  assert.deepEqual(asked, ['https://a.co/d/xyz', 'https://amzn.to/3a', 'https://amzn.to/3b']);
});

test('a chain longer than three hops, and a loop, give up and return the address as typed', async () => {
  const chain = fakeFetch({
    'https://amzn.to/1': redirect('https://amzn.to/2'),
    'https://amzn.to/2': redirect('https://amzn.to/3'),
    'https://amzn.to/3': redirect('https://amzn.to/4'),
    'https://amzn.to/4': redirect(LONG),
  });
  assert.equal(await expandShortLink('https://amzn.to/1', PROGRAMS, { fetch: chain.impl }), 'https://amzn.to/1');
  assert.equal(chain.asked.length, 3, 'a fourth request must not be made');

  const loop = fakeFetch({ 'https://amzn.to/x': redirect('https://amzn.to/x') });
  assert.equal(await expandShortLink('https://amzn.to/x', PROGRAMS, { fetch: loop.impl }), 'https://amzn.to/x');
  assert.equal(loop.asked.length, 3);
});

test('an answer that is not a redirect, or a request that fails, leaves the address as typed', async () => {
  // None of these may throw: the wish is being saved, and a link that could not
  // be tidied is still a link the person typed and wants kept.
  for (const answer of [
    new Response('<html></html>', { status: 200 }),
    new Response(null, { status: 404 }),
    new Response(null, { status: 503 }),
    // A redirect with nowhere to go.
    new Response(null, { status: 301 }),
    new Error('getaddrinfo ENOTFOUND amzn.to'),
  ]) {
    const { impl } = fakeFetch({ 'https://amzn.to/3abcdef': answer });
    assert.equal(
      await expandShortLink('https://amzn.to/3abcdef', PROGRAMS, { fetch: impl }),
      'https://amzn.to/3abcdef'
    );
  }
});

test('a server that never answers is given up on after the timeout', { timeout: 2000 }, async () => {
  // The save request is waiting on this. Without a deadline one stalled host
  // would hold a serverless function open until the platform killed it.
  const hangs = ((_url: URL | string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    })) as unknown as typeof fetch;
  assert.equal(
    await expandShortLink('https://amzn.to/3abcdef', PROGRAMS, { fetch: hangs, timeoutMs: 30 }),
    'https://amzn.to/3abcdef'
  );
});

test('the body of an answer is never read', async () => {
  // Only the `Location` header is wanted. Reading a body would mean downloading
  // whatever the short host chose to send, from an address a stranger controls.
  let read = false;
  const answer = new Response('x'.repeat(10_000), { status: 200 });
  for (const method of ['text', 'json', 'arrayBuffer', 'blob', 'formData'] as const) {
    (answer as unknown as Record<string, unknown>)[method] = async () => {
      read = true;
      return '';
    };
  }
  const { impl } = fakeFetch({ 'https://amzn.to/3abcdef': answer });
  await expandShortLink('https://amzn.to/3abcdef', PROGRAMS, { fetch: impl });
  assert.equal(read, false);
});

test('the request goes to https on the allow-listed host, whatever scheme and case the person typed', async () => {
  // What is requested is built from the host in the programme's list plus the
  // person's path and query, and never from the typed address itself. So `http` is
  // upgraded, the host's case is normal, and a fragment - which never leaves the
  // browser anyway - is not sent.
  const { impl, asked } = fakeFetch({ 'https://amzn.to/3abcdef?x=1': redirect(LONG) });
  assert.equal(
    await expandShortLink('http://AMZN.to/3abcdef?x=1#frag', PROGRAMS, { fetch: impl }),
    LONG
  );
  assert.deepEqual(asked, ['https://amzn.to/3abcdef?x=1']);
});

test('an address with a port or credentials is never requested, even on an allow-listed host', async () => {
  // `amzn.to:8080` is still Amazon's host, but a person who types a port is asking
  // for a service on it that nobody listed, and credentials in an address are not a
  // short link. Neither is ours to send, so both come back as typed.
  for (const target of [
    'https://amzn.to:8080/x',
    'http://amzn.to:22/x',
    'https://user:pass@amzn.to/x',
    'https://user@amzn.to/x',
  ]) {
    const { impl, asked } = fakeFetch({});
    assert.equal(await expandShortLink(target, PROGRAMS, { fetch: impl }), target, target);
    assert.deepEqual(asked, [], `${target} must not be requested`);
  }
});

test('a redirect with a port or credentials on a short host is not followed, a plain http one is followed as https', async () => {
  // The same rule for every hop: the destination of somebody else's short link is
  // as untrusted as the address that was typed.
  for (const hop of ['https://amzn.to:8080/steal', 'https://user:pw@a.co/x']) {
    const { impl, asked } = fakeFetch({ 'https://amzn.to/3a': redirect(hop) });
    assert.equal(await expandShortLink('https://amzn.to/3a', PROGRAMS, { fetch: impl }), 'https://amzn.to/3a', hop);
    assert.deepEqual(asked, ['https://amzn.to/3a'], hop);
  }

  const upgraded = fakeFetch({
    'https://amzn.to/3a': redirect('http://amzn.to/next'),
    'https://amzn.to/next': redirect(LONG),
  });
  assert.equal(await expandShortLink('https://amzn.to/3a', PROGRAMS, { fetch: upgraded.impl }), LONG);
  assert.deepEqual(upgraded.asked, ['https://amzn.to/3a', 'https://amzn.to/next']);
});
