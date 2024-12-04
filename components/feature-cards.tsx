import React, { memo } from 'react';
import FeatureCard from '@/components/feature-card';
import { cn } from '@/lib/utils';
import type { Translations } from '@/types';

const FeatureCards: React.FC<Pick<Translations, 'features'>> = ({
  features,
}) => (
  <div
    className={cn(
      'text-center',
      'my-12',
      'lg:mb-0',
      'md:mb-0',
      'grid',
      'grid-cols-1',
      'md:grid-cols-3',
      'gap-dialog-desktop',
      'xs:gap-dialog-mobile'
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
