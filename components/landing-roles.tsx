import React, { memo } from 'react';
import FeatureCard from '@/components/feature-card';
import { cn } from '@/lib/utils';
import type { LandingRolesProps } from '@/types';

/**
 * The two roles, in the order the product names them.
 *
 * A constant rather than `Object.keys`, for the reason `feature-cards.tsx` gives:
 * the order a JSON object happens to be written in is not a translation's to
 * decide. The owner comes first because writing the list down is what the page has
 * been talking about until this point.
 */
const ROLE_ORDER = ['owner', 'buyer'] as const;

/**
 * Who this page is written for, as two entries of the same index as the mechanisms
 * below.
 *
 * The pair answers "which one am I?" for somebody standing in front of the sign-in
 * buttons who has not registered yet, and it does that by being the anatomy the
 * page already has: a claim in a narrow column, its explanation beside it, a
 * hairline above each. No new shape, and no heading - a heading would say these are
 * a section, and they are a frame around the two ways to use the product rather
 * than a third claim about it.
 */
const LandingRoles: React.FC<LandingRolesProps> = ({ roles }) => (
  <div data-testid='landingRoles' className={cn('flex', 'flex-col', 'gap-y-8')}>
    {ROLE_ORDER.map((role) => (
      <div key={role} className={cn('border-t', 'border-rule', 'pt-6')}>
        <FeatureCard
          title={roles[role].title}
          description={roles[role].description}
        />
      </div>
    ))}
  </div>
);

export default memo(LandingRoles);
