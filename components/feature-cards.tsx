import React, { memo } from 'react';
import FeatureCard from '@/components/feature-card';
import { cn } from '@/lib/utils';
import type { Translations } from '@/types';

/**
 * Which claim leads the index.
 *
 * Not a preference. The bought mark is the one thing a neighbouring product could
 * not copy without changing what it is: every other wishlist tool lets each person
 * tick off what they personally intends to buy, and here the tick belongs to the
 * list the moment it is set - it shows to everyone that list is shared with, it
 * cannot be cleared by the owner once somebody else has set it, and it never names
 * who set it. "Nobody buys it twice" is therefore the product's claim and the other
 * two are the mechanics that make it true, so the claim is set large and the
 * mechanics are set as an index beneath it.
 *
 * The key is a constant rather than a position in the object, because the order
 * the features are written in the dictionary is not the order they are read in.
 * If a dictionary ever drops the key, the first surviving one is promoted instead
 * of leaving the page with a hole in it, and any key not named above still renders
 * - the dictionaries are a product asset, not a private of this component.
 */
const LEAD_KEY = 'tracking';

const FeatureCards: React.FC<Pick<Translations, 'features'>> = ({
  features,
}) => {
  const keys = Object.keys(features);

  if (keys.length === 0) return null;

  const leadKey = keys.includes(LEAD_KEY) ? LEAD_KEY : keys[0];
  const lead = features[leadKey];
  const rest = keys.filter((key) => key !== leadKey);

  return (
    <div className={cn('flex', 'flex-col')}>
      <FeatureCard
        variant='lead'
        title={lead.title}
        description={lead.description}
      />

      {/*
        The index itself: claim in a fixed narrow column, description beside it,
        one rule of hairline between entries. At 390px the two columns do not fit
        two German or Russian claims side by side, so the pair stacks until `sm`.
      */}
      <div className={cn('mt-12', 'flex', 'flex-col', 'gap-y-8')}>
        {rest.map((key) => {
          const feature = features[key];
          return (
            <div key={key} className={cn('border-t', 'border-rule', 'pt-6')}>
              <FeatureCard
                variant='entry'
                title={feature.title}
                description={feature.description}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default memo(FeatureCards);
