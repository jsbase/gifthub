import type { AffiliateProgram, ShortLinkRule } from '@/lib/affiliate-link';

const AMAZON_DE_HOSTS = new Set(['amazon.de', 'www.amazon.de']);

/*
  What another partner's link carries beside their `tag`: the SiteStripe and
  product-link widgets add these, and they exist to name that partner's link in
  that partner's reports. Dropped with the tag, because a link that now pays us and
  still names somebody else's widget is half theirs.

  Deliberately a list and not "everything we do not recognise": the rest of an
  Amazon query is Amazon's own and a link that loses a parameter it needed is a
  link that opens the wrong page. `ref_` is only theirs when it names a widget, so
  it is handled by value below.
*/
const FOREIGN_PARTNER_PARAMS = [
  'linkCode',
  'linkId',
  'ascsubtag',
  'creative',
  'creativeASIN',
  'camp',
];

/*
  Amazon's short links: `amzn.to/4b8Q8eK`, and `/d/` before the code on `amzn.eu`
  and `a.co`. A code is a few letters and digits and nothing else, so a path with a
  separator, a dot segment, an encoded character, a query or a code of the wrong
  length is not one and is never requested. The `/d/` is allowed on every host
  rather than pinned per host: what matters is that the path cannot say anything
  but "this code", and a code that Amazon does not know is answered with a
  redirect to its home page, which is not followed.
*/
const SHORT_CODE_PATH = /^\/(?:d\/)?[A-Za-z0-9]{4,20}\/?$/;

const SHORT_LINKS: readonly ShortLinkRule[] = ['amzn.to', 'amzn.eu', 'a.co'].map(
  (host) => ({ host, path: SHORT_CODE_PATH })
);

/**
 * Our Amazon PartnerNet programme for amazon.de, or `null` when no tracking ID is
 * configured - the programme does not exist rather than existing and doing
 * nothing, so it is not asked about links and its short-link hosts are not
 * fetched on save.
 *
 * Only amazon.de, because that is the one programme the ID belongs to.
 */
export function amazonDe(tag: string | undefined): AffiliateProgram | null {
  if (!tag || tag.trim() === '') return null;

  return {
    id: 'amazon-de',
    shortLinks: SHORT_LINKS,
    disclosure: 'amazonDe',
    recognises: (url) => AMAZON_DE_HOSTS.has(url.hostname),
    apply: (url) => {
      const ours = `tag=${encodeURIComponent(tag.trim())}`;
      let placed = false;
      const kept: string[] = [];

      /*
        The query is rewritten as the raw text it arrived as and not through
        `URLSearchParams`, which re-serialises every parameter: Amazon's own
        redirects carry literal commas (`sprefix=gardena+micro-drip-system,aps,135`)
        and it turns each into `%2C`. Same value to any server, but a different
        link, and the promise here is that only the tag changed. A parameter is
        either kept byte for byte or dropped.
      */
      for (const part of url.search.slice(1).split('&')) {
        if (part === '') continue;
        const eq = part.indexOf('=');
        const name = decodeParam(eq === -1 ? part : part.slice(0, eq));
        const value = eq === -1 ? '' : decodeParam(part.slice(eq + 1));

        if (name === 'tag') {
          // The first one is replaced where it stands, any further ones go, so two
          // foreign tags become one of ours and the order of the rest is kept.
          if (!placed) kept.push(ours);
          placed = true;
          continue;
        }
        if (FOREIGN_PARTNER_PARAMS.includes(name)) continue;
        if (name === 'ref_' && value.startsWith('as_li_')) continue;
        kept.push(part);
      }
      if (!placed) kept.push(ours);

      const tagged = new URL(url);
      tagged.search = kept.join('&');
      return tagged;
    },
  };
}

/** A parameter's name or value as the person who wrote it meant it; the raw text if it is malformed. */
function decodeParam(raw: string): string {
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' '));
  } catch {
    return raw;
  }
}
