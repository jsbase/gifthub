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
    return dict.giftCount.one.replace('{count}', '1');
  }
  return dict.giftCount.many.replace(
    '{count}',
    String(counts.unbought)
  );
}

/**
 * How many wishes are selected, in four forms rather than two.
 *
 * A second function rather than a parameter of the one above, because the two
 * counts have different shapes of truth. `giftCountLabel`'s four states are two
 * zeroes and two numbers - a sheet can be empty and a sheet can be finished, and
 * the row has to be able to say which - while a selection has neither state. The bar
 * this belongs to is rendered for as long as a transfer mode is active, so it also
 * stands there with nothing ticked yet, and the figure it prints then is simply
 * zero. A selection is a count of what is ticked: the two zeroes above describe a
 * *sheet* (nothing on it, nothing left to buy), and a bar that says "0 selected" is
 * making neither claim. Carrying `none` and `zero` here would answer a question the
 * bar is not asking, and would invite the sheet's two meanings into a sentence about
 * a selection.
 *
 * Zero needs no branch of its own because the plural rules already word it: it is
 * `other` in German and English and `many` in Russian, and `other` falls through to
 * `many` below, so all three shipped locales print the plural form, which is the
 * right one.
 *
 * What is left is the part that varies, and it varies by more than singular and
 * plural. Russian has three forms - 1 пожелание, 2-4 пожелания, 5+ пожеланий - and
 * one template carrying a `{count}` cannot produce them; a wish list is exactly the
 * kind of noun a Slavic language inflects hardest. The four dictionary keys are the
 * four CLDR plural categories, which is why they are exactly those four and not a
 * singular/plural pair: `two` is a real category in Irish, Welsh and Breton, and
 * a locale that needs it must be able to *name* it rather than have the function
 * decide for it.
 *
 * **The category comes from `Intl.PluralRules`, not from counting.** An earlier
 * version of this compared the number against a ladder - 1, 2, 3-4, 5+ - and that
 * is correct for every number a reader can see on a phone and wrong for the rest:
 * Russian 21 is `одно` (21 желание) and 22 is two (22 желания), while the ladder
 * put both in the `many` band and printed "21 желаний". The rule is not "pick the
 * form for this digit", it is "pick the form this language uses for this number",
 * and only the platform knows the answer for 21 in a language nobody on this
 * feature has thought about. `giftCountLabel` above still counts by hand, which is
 * the same latent bug in a function that predates this one; it is not copied here.
 *
 * `other` has no key and falls through to `many`, deliberately: `other` is what
 * German returns for every count above one, and German's plural *is* the band that
 * `many` names, so the two languages disagree about the category name and not about
 * the sentence.
 */
export function selectedCountLabel(
  count: number,
  locale: string,
  dict: {
    selectedCount: {
      one: string;
      two: string;
      few: string;
      many: string;
    };
  }
): string {
  const category = new Intl.PluralRules(locale).select(count);
  const key =
    category === 'one' || category === 'two' || category === 'few'
      ? category
      : 'many';
  return dict.selectedCount[key].replace('{count}', String(count));
}