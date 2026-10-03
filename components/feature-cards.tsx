import React, { memo } from 'react';
import FeatureCard from '@/components/feature-card';
import { cn } from '@/lib/utils';
import type { Translations } from '@/types';

/**
 * The order the index is read in.
 *
 * A decision that lives here rather than in the order the claims happen to be
 * written in the dictionaries: `simple` is what it takes to put one idea down,
 * `tracking` is what makes "nobody buys it twice" true, and `updates` is what the
 * person being surprised gets out of it. The order a JSON object happens to be
 * written in is not a translation's to decide, and it is already the reading
 * order - which is exactly why it needs a constant to say so.
 *
 * This is a reading order, not a whitelist. A key named here that the dictionary
 * does not have is skipped, so a dropped translation leaves no hole in the index;
 * and a key this list does not name still renders, after the named ones, in
 * dictionary order - the dictionaries are a product asset, not a private of this
 * component, and a claim added to one of them must not need this file edited
 * before it can reach the page.
 */
const ORDER = ['simple', 'tracking', 'updates'] as const;

const FeatureCards: React.FC<Pick<Translations, 'features'>> = ({
  features,
}) => {
  const keys = Object.keys(features);

  if (keys.length === 0) return null;

  const ordered = [
    ...ORDER.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !ORDER.some((named) => named === key)),
  ];

  return (
    /*
      The index: claim in a fixed narrow column, description beside it, one rule
      of hairline between entries. At 390px the two columns do not fit two German
      or Russian claims side by side, so the pair stacks until `sm`. The `mt-12`
      that separated the lead claim from this list left with the lead; the
      distance to the section above is the caller's to set.
    */
    <div className={cn('flex', 'flex-col', 'gap-y-8')}>
      {ordered.map((key) => {
        const feature = features[key];
        return (
          <div key={key} className={cn('border-t', 'border-rule', 'pt-6')}>
            <FeatureCard
              title={feature.title}
              description={feature.description}
            />
          </div>
        );
      })}
    </div>
  );
};

export default memo(FeatureCards);
