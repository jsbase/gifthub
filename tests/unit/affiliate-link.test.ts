import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

/*
  The tag is a parameter and the function never reads `process.env`, so every
  case here runs with a made-up ID and no `.env.local`. The one place that does
  read `NEXT_PUBLIC_AMAZON_TAG` is the gift card, which is where Next.js inlines
  it at build time; a lookup through a variable would not be inlined and the
  link would silently go out untagged.
*/

const require = createRequire(import.meta.url);
const { withAffiliateTag } =
  require('../../lib/affiliate-link.ts') as typeof import('@/lib/affiliate-link');

const TAG = 'test-21';

test('an amazon.de link without a tag gets ours', () => {
  assert.equal(
    withAffiliateTag('https://www.amazon.de/dp/B08N5WRWNW', TAG),
    'https://www.amazon.de/dp/B08N5WRWNW?tag=test-21'
  );
});

test("somebody else's tag is replaced, not added to, and the rest of the link stays", () => {
  // This is the whole point of the feature. `append` instead of `set` would send
  // `tag=other-21&tag=test-21` and leave it to Amazon to pick one.
  assert.equal(
    withAffiliateTag(
      'https://www.amazon.de/Beispiel-Produkt/dp/B08N5WRWNW?th=1&tag=other-21&psc=1#reviews',
      TAG
    ),
    'https://www.amazon.de/Beispiel-Produkt/dp/B08N5WRWNW?th=1&tag=test-21&psc=1#reviews'
  );
  assert.equal(
    withAffiliateTag('http://amazon.de/dp/B08N5WRWNW?tag=a-21&tag=b-21', TAG),
    'http://amazon.de/dp/B08N5WRWNW?tag=test-21'
  );
});

test('without a tag the link is left exactly as typed', () => {
  // An unset variable arrives as `undefined` and a blank one in `.env.local` as
  // an empty string. Both mean "off": CI and the e2e suite run with neither set
  // and must see the same hrefs they always did.
  const link = 'https://www.amazon.de/dp/B08N5WRWNW';
  assert.equal(withAffiliateTag(link, undefined), link);
  assert.equal(withAffiliateTag(link, ''), link);
});

test('only amazon.de is rewritten, and a look-alike host is not amazon.de', () => {
  // The host is matched exactly. A substring or suffix test would tag
  // `amazon.de.evil.com` and `notamazon.de`, and would let anybody who can type
  // a gift link route a buyer through a page that merely starts with our name.
  // `https://amazon.de@evil.com/` is the classic version: the real host is what
  // follows the `@`.
  const untouched = [
    'https://example.com/dp/B08N5WRWNW',
    'https://amazon.de.evil.com/dp/B08N5WRWNW',
    'https://notamazon.de/dp/B08N5WRWNW',
    'https://amazon.de@evil.com/dp/B08N5WRWNW',
    'https://evil.com/?u=https://www.amazon.de/dp/B08N5WRWNW',
  ];
  for (const link of untouched) {
    assert.equal(withAffiliateTag(link, TAG), link, link);
  }
});

test('other marketplaces and short links are left alone', () => {
  // Our ID belongs to the amazon.de programme only, and a short link carries its
  // tag in the redirect rather than in the URL, so there is nothing here to set.
  const untouched = [
    'https://www.amazon.com/dp/B08N5WRWNW',
    'https://www.amazon.co.uk/dp/B08N5WRWNW',
    'https://amzn.to/3abcdef',
    'https://amzn.eu/d/abcdef',
    'https://a.co/d/abcdef',
  ];
  for (const link of untouched) {
    assert.equal(withAffiliateTag(link, TAG), link, link);
  }
});

test('anything that is not a web address is returned as it came in', () => {
  // A wish's link is free text in the form, so these reach the card. A throw
  // here would take the whole sheet down for one badly typed cell.
  const untouched = [
    'not a link',
    'www.amazon.de/dp/B08N5WRWNW',
    'javascript:alert(1)',
    'mailto:anna@example.de',
    'ftp://www.amazon.de/dp/B08N5WRWNW',
  ];
  for (const link of untouched) {
    assert.equal(withAffiliateTag(link, TAG), link, link);
  }
});
