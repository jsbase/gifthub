/*
  Our Amazon PartnerNet tracking ID goes into the `tag` parameter of an amazon.de
  gift link, replacing whatever tag the link already carried.

  This runs where the link is rendered and not where it is saved, for two reasons.
  Every wish that already exists is covered with no migration, and the stored
  address stays what the person typed, so changing or dropping the ID later is one
  environment variable and not a rewrite of the table. The cost is that the sheet
  must print the original and use this only for the `href`; a sheet that printed
  the result would show `?tag=...` under every wish.

  The host is compared exactly. `endsWith('amazon.de')` or `includes('amazon')`
  would tag `notamazon.de` and `amazon.de.evil.com`, and would hand anybody who can
  type a gift link a way to dress their own page in ours.

  Only amazon.de is rewritten, because that is the one programme the ID belongs
  to. Short links (`amzn.to`, `amzn.eu`, `a.co`) are left alone too: they carry
  the tag in the redirect and not in the URL, so there is nothing to set without
  fetching them first, and a fetch on every render is not a price worth paying.
*/

const AMAZON_HOSTS = new Set(['amazon.de', 'www.amazon.de']);

/**
 * The one place that decides whether an address is ours to tag, so that the link
 * and the mark that says it is an advertisement can never disagree: a link tagged
 * without the mark is an undisclosed advertisement, and a mark on a link we did not
 * tag is a claim that is not true.
 *
 * Never throws: a wish's link is free text, so "not a link" is an ordinary input.
 */
function amazonDeAddress(url: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (!AMAZON_HOSTS.has(parsed.hostname)) return null;
  return parsed;
}

/**
 * The address to link to for `url`, tagged with `tag` when it is an amazon.de
 * link and returned untouched otherwise. An empty or missing `tag` means the
 * feature is off.
 */
export function withAffiliateTag(url: string, tag: string | undefined): string {
  if (!tag) return url;

  const parsed = amazonDeAddress(url);
  if (!parsed) return url;

  parsed.searchParams.set('tag', tag);
  return parsed.toString();
}

/**
 * Whether `url` is one `withAffiliateTag` tags, and so one that earns us a
 * commission and has to be marked as an advertisement.
 *
 * Asked separately rather than inferred from "the address came back different":
 * a link that already carries our own tag comes back byte for byte, and would be
 * taken for an ordinary one.
 */
export function isAffiliateLink(url: string, tag: string | undefined): boolean {
  return Boolean(tag) && amazonDeAddress(url) !== null;
}
