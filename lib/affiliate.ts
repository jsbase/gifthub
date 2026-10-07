import { affiliateLink } from '@/lib/affiliate-link';
import type { AffiliateLink, AffiliateProgram } from '@/lib/affiliate-link';
import { amazonDe } from '@/lib/affiliate-programs/amazon-de';

/**
 * The programmes that are switched on: the ones with an ID in the environment.
 * A programme without one is `null` and drops out here, so an unconfigured shop
 * costs nothing - not a lookup per link and not a host fetched on save.
 *
 * Adding a shop is its own file under `affiliate-programs/`, its variable in
 * `.env.example`, and one line here.
 *
 * Each variable is read as a literal `process.env.NEXT_PUBLIC_...` and not through
 * a helper or a variable, because that is the only form Next.js inlines into the
 * client bundle at build time; any other lookup is `undefined` in the browser and
 * every link would silently go out untagged. It also freezes the value at build,
 * so a changed ID needs a redeploy.
 *
 * This is the one file that knows the environment. The core and the programmes
 * take their configuration as arguments, which is what lets them be tested
 * without a `.env.local`.
 */
export const AFFILIATE_PROGRAMS: readonly AffiliateProgram[] = [
  amazonDe(process.env.NEXT_PUBLIC_AMAZON_TAG),
].filter((program): program is AffiliateProgram => program !== null);

/** `affiliateLink` over the programmes that are switched on. */
export function affiliateFor(url: string): AffiliateLink {
  return affiliateLink(url, AFFILIATE_PROGRAMS);
}
