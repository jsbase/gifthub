import type { AffiliateProgram } from '@/lib/affiliate-link';

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
    shortHosts: ['amzn.to', 'amzn.eu', 'a.co'],
    recognises: (url) => AMAZON_DE_HOSTS.has(url.hostname),
    apply: (url) => {
      const tagged = new URL(url);
      for (const name of FOREIGN_PARTNER_PARAMS) tagged.searchParams.delete(name);
      if (tagged.searchParams.get('ref_')?.startsWith('as_li_')) {
        tagged.searchParams.delete('ref_');
      }
      // `set` and not `append`: it replaces the first `tag` where it stands and
      // removes any further ones, so two foreign tags become one of ours.
      tagged.searchParams.set('tag', tag.trim());
      return tagged;
    },
  };
}
