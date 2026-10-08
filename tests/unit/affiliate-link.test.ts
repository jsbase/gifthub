import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import type { AffiliateProgram } from '@/lib/affiliate-link';

/*
  The core knows no shop. It takes the programmes it is handed and asks them in
  order, so everything here runs against two made-up ones - and made up in two
  different mechanisms on purpose. Amazon puts a parameter on the address; most
  networks wrap the address in a tracking one. If the core only coped with the
  first kind, adding the second would be a rewrite and not a new file, and that is
  the thing this suite is here to hold.

  Amazon's own rules are `affiliate-amazon-de.test.ts`.
*/

const require = createRequire(import.meta.url);
const { affiliateLink, disclosuresFor } =
  require('../../lib/affiliate-link.ts') as typeof import('@/lib/affiliate-link');

const paramShop: AffiliateProgram = {
  id: 'param-shop',
  recognises: (url) => url.hostname === 'shop.example',
  apply: (url) => {
    const out = new URL(url);
    out.searchParams.set('partner', 'p-1');
    return out;
  },
};

const wrapShop: AffiliateProgram = {
  id: 'wrap-shop',
  recognises: (url) => url.hostname === 'wrap.example',
  apply: (url) =>
    new URL(`https://track.example/go?to=${encodeURIComponent(url.toString())}&id=w-9`),
};

test('a link a programme recognises is rewritten and reported as earning', () => {
  assert.deepEqual(affiliateLink('https://shop.example/item/7', [paramShop]), {
    href: 'https://shop.example/item/7?partner=p-1',
    earns: true,
  });
});

test('a link no programme recognises comes back as it went in, not earning', () => {
  assert.deepEqual(affiliateLink('https://elsewhere.example/item/7', [paramShop]), {
    href: 'https://elsewhere.example/item/7',
    earns: false,
  });
});

test('anything that is not a web address is returned as it came in, and no programme is asked', () => {
  // A wish's link is free text in the form, so these reach the card. A throw
  // would take the whole sheet down for one badly typed cell, and a programme
  // handed `javascript:` or `ftp:` would have to know to refuse it - so it is
  // refused once, here, before any programme sees it.
  const asked: string[] = [];
  const spy: AffiliateProgram = {
    id: 'spy',
    recognises: (url) => {
      asked.push(url.toString());
      return false;
    },
    apply: (url) => url,
  };
  for (const link of [
    'not a link',
    '',
    'www.shop.example/item/7',
    'javascript:alert(1)',
    'mailto:anna@example.de',
    'ftp://shop.example/item/7',
  ]) {
    assert.deepEqual(affiliateLink(link, [spy]), { href: link, earns: false }, link);
  }
  assert.deepEqual(asked, []);
});

test('a second programme with another mechanism goes through the same call', () => {
  const programs = [paramShop, wrapShop];
  assert.deepEqual(affiliateLink('https://wrap.example/item/7', programs), {
    href: 'https://track.example/go?to=https%3A%2F%2Fwrap.example%2Fitem%2F7&id=w-9',
    earns: true,
  });
  assert.deepEqual(affiliateLink('https://shop.example/item/7', programs), {
    href: 'https://shop.example/item/7?partner=p-1',
    earns: true,
  });
});

test('the first programme that recognises a link wins, and the rest are not asked to mark it', () => {
  let secondApplied = false;
  const greedy: AffiliateProgram = {
    id: 'greedy',
    recognises: (url) => url.hostname === 'shop.example',
    apply: () => {
      secondApplied = true;
      return new URL('https://greedy.example/');
    },
  };
  assert.equal(
    affiliateLink('https://shop.example/item/7', [paramShop, greedy]).href,
    'https://shop.example/item/7?partner=p-1'
  );
  assert.equal(secondApplied, false);
});

test('with no programmes configured nothing is rewritten', () => {
  assert.deepEqual(affiliateLink('https://shop.example/item/7', []), {
    href: 'https://shop.example/item/7',
    earns: false,
  });
});

test('the sentences the footer must show are those of the programmes that are on, each once', () => {
  // The footer asks this and nothing about shops. A programme that is not
  // configured is not in the list at all, so its sentence is not shown, and two
  // programmes that need the same sentence do not print it twice.
  const requires = (id: string): AffiliateProgram => ({
    ...paramShop,
    id,
    disclosure: 'amazonDe',
  });
  assert.deepEqual(disclosuresFor([]), []);
  assert.deepEqual(disclosuresFor([paramShop, wrapShop]), []);
  assert.deepEqual(disclosuresFor([paramShop, requires('a'), wrapShop]), ['amazonDe']);
  assert.deepEqual(disclosuresFor([requires('a'), requires('b')]), ['amazonDe']);
});
