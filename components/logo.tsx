import React, { memo, useMemo } from 'react';
import { Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LogoProps } from '@/types';

const SIZES = {
  sm: {
    icon: 'h-6 w-6',
    text: 'text-xl',
  },
  md: {
    icon: 'h-7 w-7',
    text: 'text-2xl',
  },
  lg: {
    icon: 'h-9 w-9 sm:h-10 sm:w-10',
    text: 'text-[clamp(2.25rem,7vw,3.5rem)]',
  },
} as const;

const Logo: React.FC<LogoProps> = ({ size = 'md', className, groupName }) => {
  const containerClasses = useMemo(
    () => cn('flex', 'items-center', 'gap-2.5', className),
    [className]
  );

  const textClasses = useMemo(
    () =>
      cn(
        SIZES[size].text,
        'font-serif',
        'font-medium',
        'leading-none',
        'tracking-[-0.02em]',
        'text-balance',
        'text-foreground'
      ),
    [size]
  );

  return (
    <div className={containerClasses}>
      {/*
        A tag rather than a present: the app's whole subject is a list of things
        other people are going to wrap and hand over.
      */}
      <Tag
        className={cn(SIZES[size].icon, 'shrink-0', 'text-primary')}
        strokeWidth={1.75}
        aria-hidden='true'
      />
      <h1 className={textClasses}>{groupName || 'GiftHub'}</h1>
    </div>
  );
};

export default memo(Logo);
