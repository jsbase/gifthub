import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

/*
  The Amazon programme on its own: which addresses are ours and what we do to
  them. Dispatch between programmes is `affiliate-link.test.ts`; fetching short
  links is `affiliate-expand.test.ts`. The tag is a made-up ID throughout, so none
  of this needs `.env.local`.
*/

const require = createRequire(import.meta.url);
const { amazonDe } =
  require('../../lib/affiliate-programs/amazon-de.ts') as typeof import('@/lib/affiliate-programs/amazon-de');

const TAG = 'test-21';

function programme() {
  const p = amazonDe(TAG);
  assert.ok(p, 'amazonDe(TAG) should be a programme');
  return p;
}

test('with no tag configured there is no programme at all', () => {
  // Off means off: a programme that existed and did nothing would still be asked
  // about every link and still have its short-link hosts fetched on save.
  assert.equal(amazonDe(undefined), null);
  assert.equal(amazonDe(''), null);
  assert.equal(amazonDe('   '), null);
});

test('only amazon.de is ours, and a look-alike host is not amazon.de', () => {
  // The host is compared exactly. A substring or suffix test would tag
  // `amazon.de.evil.com` and `notamazon.de`, and would let anybody who can type a
  // gift link dress their own page in ours. `https://amazon.de@evil.com/` is the
  // classic version: the real host is what follows the `@`.
  const p = programme();
  assert.equal(p.recognises(new URL('https://www.amazon.de/dp/B08N5WRWNW')), true);
  assert.equal(p.recognises(new URL('http://amazon.de/dp/B08N5WRWNW')), true);
  for (const link of [
    'https://example.com/dp/B08N5WRWNW',
    'https://amazon.de.evil.com/dp/B08N5WRWNW',
    'https://notamazon.de/dp/B08N5WRWNW',
    'https://amazon.de@evil.com/dp/B08N5WRWNW',
    'https://evil.com/?u=https://www.amazon.de/dp/B08N5WRWNW',
    // Our ID belongs to the amazon.de programme only.
    'https://www.amazon.com/dp/B08N5WRWNW',
    'https://www.amazon.co.uk/dp/B08N5WRWNW',
  ]) {
    assert.equal(p.recognises(new URL(link)), false, link);
  }
});

// Two links as Amazon hands them out, neither with a tag: the realistic input.
const LONG_LINK =
  'https://www.amazon.de/SereneLife-Klimaanlage-Luftk%C3%BChler-Ventilator-Luftentfeuchter/dp/B0CZYZMCN8/ref=pd_ci_mcx_mh_mcx_views_0_title?pd_rd_w=4Iakq&content-id=amzn1.sym.bbac26bb-3f7b-44dd-a8a5-c10fcfb1ed60%3Aamzn1.symc.30e3dbb4-8dd8-4bad-b7a1-a45bcdbc49b8&pf_rd_p=bbac26bb-3f7b-44dd-a8a5-c10fcfb1ed60&pf_rd_r=8M09S0CPWXFHH622F844&pd_rd_wg=h8sxY&pd_rd_r=28680d67-97c5-490b-9652-a284a853a35d&pd_rd_i=B0CZYZMCN8&th=1';
const SPONSORED_LINK =
  'https://www.amazon.de/dp/B0D98YCYSZ/ref=sspa_dk_detail_3?pd_rd_i=B0D98YCYSZ&pd_rd_w=OvhEt&content-id=amzn1.sym.cf5ead54-c2f4-4493-953a-430e94cae639&pf_rd_p=cf5ead54-c2f4-4493-953a-430e94cae639&pf_rd_r=XHN308SV8KBJ65AAT7CF&pd_rd_wg=aCFiE&pd_rd_r=064df214-90c0-4c85-a067-4f521b861389&aref=md7thzHp5f&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWw&th=1&psc=1';

test('our tag is appended and nothing else in a real link changes by a byte', () => {
  // The query is re-serialised by `URLSearchParams`, which could have turned
  // `%3A` into `:` or `%20` into `+`. It does not for links like these, and this
  // is the test that says so rather than the assumption.
  const p = programme();
  assert.equal(p.apply(new URL(LONG_LINK)).toString(), `${LONG_LINK}&tag=test-21`);
  assert.equal(p.apply(new URL(SPONSORED_LINK)).toString(), `${SPONSORED_LINK}&tag=test-21`);
});

test("somebody else's tag is replaced in place, not added to", () => {
  // The whole point of the feature. `append` instead of `set` would send
  // `tag=other-21&tag=test-21` and leave it to Amazon to pick one.
  const p = programme();
  assert.equal(
    p
      .apply(new URL('https://www.amazon.de/Beispiel/dp/B08N5WRWNW?th=1&tag=other-21&psc=1#reviews'))
      .toString(),
    'https://www.amazon.de/Beispiel/dp/B08N5WRWNW?th=1&tag=test-21&psc=1#reviews'
  );
  assert.equal(
    p.apply(new URL('http://amazon.de/dp/B08N5WRWNW?tag=a-21&tag=b-21')).toString(),
    'http://amazon.de/dp/B08N5WRWNW?tag=test-21'
  );
});

test("the other partner's widget parameters leave with their tag", () => {
  // What a SiteStripe or product-link widget adds beside `tag`. They name the
  // other partner's link in the other partner's reports, so leaving them on a link
  // that now pays us would be a link that is half theirs. An ordinary `ref_` is
  // Amazon's own navigation and stays.
  const p = programme();
  assert.equal(
    p
      .apply(
        new URL(
          'https://www.amazon.de/dp/B08N5WRWNW?th=1&linkCode=ll1&tag=other-21&linkId=abc123&creativeASIN=B08N5WRWNW&creative=6742&camp=1638&ascsubtag=xyz&language=de_DE&ref_=as_li_ss_tl&psc=1'
        )
      )
      .toString(),
    'https://www.amazon.de/dp/B08N5WRWNW?th=1&tag=test-21&language=de_DE&psc=1'
  );
  assert.equal(
    p.apply(new URL('https://www.amazon.de/dp/B08N5WRWNW?ref_=sr_1_1')).toString(),
    'https://www.amazon.de/dp/B08N5WRWNW?ref_=sr_1_1&tag=test-21'
  );
});

test('apply returns a new address and leaves the one it was given alone', () => {
  const given = new URL('https://www.amazon.de/dp/B08N5WRWNW?tag=other-21');
  programme().apply(given);
  assert.equal(given.toString(), 'https://www.amazon.de/dp/B08N5WRWNW?tag=other-21');
});

test('the short-link hosts are exactly the three, and none of them is a page we tag', () => {
  // This list is the whole of what the server may fetch on Amazon's behalf, so it
  // is asserted as a list. And a host that is also `recognises` would mean
  // fetching the product page itself, which is never the point: the short link's
  // own redirect already says where it goes.
  const p = programme();
  assert.deepEqual(p.shortHosts, ['amzn.to', 'amzn.eu', 'a.co']);
  for (const host of p.shortHosts ?? []) {
    assert.equal(p.recognises(new URL(`https://${host}/x`)), false, host);
  }
});

test('the programme names the sentence its agreement requires on the site', () => {
  // Amazon's agreement requires one fixed sentence on the site. The programme
  // carries which sentence, by key, so the footer can show it exactly when this
  // programme is switched on and never otherwise: "I earn from qualifying
  // purchases" with no programme behind it would be false.
  assert.equal(programme().disclosure, 'amazonDe');
});

test('a link as Amazon itself issues it keeps every other byte, literal commas included', () => {
  // The shape of a real SiteStripe short link's destination: literal commas in
  // `sprefix`, a percent-encoded `__mk_de_DE`, `+` for spaces, and the other
  // partner's `linkCode`, `tag`, `linkId` and `ref_=as_li_ss_tl` around them.
  // Re-serialising the query through `URLSearchParams` turned the commas into `%2C`:
  // the same value to any server, but not the same link, and "we only touched
  // the tag" is a promise worth keeping literally.
  const issued =
    'https://www.amazon.de/Produkt/dp/B0BNLN9V3M?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&crid=CE0V17TGVLH1&keywords=Gardena+Micro-Drip-System&sprefix=gardena+micro-drip-system,aps,135&sr=8-6&linkCode=sl1&tag=other-21&linkId=2d94b9ea&language=de_DE&ref_=as_li_ss_tl';
  assert.equal(
    programme().apply(new URL(issued)).toString(),
    'https://www.amazon.de/Produkt/dp/B0BNLN9V3M?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&crid=CE0V17TGVLH1&keywords=Gardena+Micro-Drip-System&sprefix=gardena+micro-drip-system,aps,135&sr=8-6&tag=test-21&language=de_DE'
  );
});
