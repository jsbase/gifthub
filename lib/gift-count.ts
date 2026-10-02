import type { Gift, MemberGiftCounts } from '@/types';

/**
 * A list's sheet: the ideas written on it, and what is left of them.
 *
 * This module owns two facts that were previously derived at five call sites and
 * worded at two, which is how a list and its own index start disagreeing:
 *
 *   - the counts, from which the sections and the figure follow;
 *   - the four states those counts have, in the words the product already ships.
 *
 * Four distinct states, not two, and the product refuses to conflate them:
 *
 *   total 0    the list has no ideas at all - the one that most needs a present
 *   unbought 0 every idea on the list has been bought - this one is done
 *   unbought 1 singular, in every language
 *   otherwise  plural, with the number
 *
 * Empty and done are different situations and the row has to be able to say
 * which. An inline ternary once mapped a zero to `zero` on the same row that
 * draws the dashed placeholder, which everywhere else means the opposite.
 *
 * Three of the four functions here take an array of gifts and know nothing about
 * who owns them, and that is exactly why they needed no change when the product
 * stopped having groups: the model changed underneath them and they were still
 * right. Only the one function that keyed on a member had to be rekeyed.
 */

/** The smallest thing a count can be read from: does this idea carry the mark? */
type PurchasedFlag = { isPurchased: boolean };

/** What a sheet says about itself: what is left, and what it holds in total. */
export function sheetCounts(gifts: PurchasedFlag[]): MemberGiftCounts {
  return {
    unbought: gifts.filter((gift) => !gift.isPurchased).length,
    total: gifts.length,
  };
}

/**
 * The same counts for every list at once.
 *
 * One pass over the gifts rather than a filter per list: the contents page used to
 * walk the whole gift list once for each row it was drawing, which is quadratic in
 * exactly the place that has to stay responsive while lists are being added.
 */
export function countsByList(
  listIds: string[],
  gifts: (Gift | (PurchasedFlag & { listId: string }))[]
): Record<string, MemberGiftCounts> {
  const counts: Record<string, MemberGiftCounts> = {};
  for (const id of listIds) {
    counts[id] = { unbought: 0, total: 0 };
  }
  for (const gift of gifts) {
    const entry = counts[gift.listId];
    // An idea on a list that is no longer shown still belongs to the response, so
    // it is counted into nobody rather than into a missing key.
    if (!entry) continue;
    entry.total += 1;
    if (!gift.isPurchased) entry.unbought += 1;
  }
  return counts;
}

/**
 * A sheet split into the two sections it is read in: what is still needed, and
 * what has already been handled. A single undifferentiated list answers neither
 * question, which is why the sheet draws them as two.
 */
export function splitSheet(gifts: Gift[]): {
  open: Gift[];
  collected: Gift[];
} {
  const open: Gift[] = [];
  const collected: Gift[] = [];
  for (const gift of gifts) {
    (gift.isPurchased ? collected : open).push(gift);
  }
  return { open, collected };
}

/** The count of a list's open cells, in the words the product already ships. */
export function giftCountLabel(
  counts: MemberGiftCounts | undefined,
  dict: { giftCount: { none: string; zero: string; one: string; many: string } }
): string {
  if (!counts || counts.total === 0) return dict.giftCount.none;
  if (counts.unbought === 0) return dict.giftCount.zero;
  if (counts.unbought === 1) {
    return dict.giftCount.one.replace('{{count}}', '1');
  }
  return dict.giftCount.many.replace(
    '{{count}}',
    String(counts.unbought)
  );
}