import type { MemberGiftCounts } from '@/types';

/**
 * The count of a member's open cells, in the words the product already ships.
 *
 * This lived inline in the member list and was going to be needed a second time
 * in the wishlist sheet, so it lives here instead of being written twice. Four
 * distinct states, not two, and the product refuses to conflate them:
 *
 *   total 0   the member has no ideas at all - the one who most needs a present
 *   unbought 0  every idea on the list has been collected - this one is done
 *   unbought 1  singular, in every language
 *   otherwise  plural, with the number
 */
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
