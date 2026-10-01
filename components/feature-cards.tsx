import React, { memo } from 'react';
import FeatureCard from '@/components/feature-card';
import { cn } from '@/lib/utils';
import type { Translations } from '@/types';

const FeatureCards: React.FC<Pick<Translations, 'features'>> = ({
  features,
}) => (
  <div
    className={cn(
      'mt-20',
      'grid',
      'grid-cols-1',
      'gap-x-10',
      'gap-y-9',
      'sm:grid-cols-3',
      'sm:gap-y-0'
    )}
  >
    {Object.entries(features).map(([key, feature]) => (
      <FeatureCard
        key={key}
        title={feature.title}
        description={feature.description}
      />
    ))}
  </div>
);

export default memo(FeatureCards);
