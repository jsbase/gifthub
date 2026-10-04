import React, { memo, useMemo } from 'react';
import { IconTag } from '@tabler/icons-react';
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

const Logo: React.FC<LogoProps> = ({ size = 'md', className, displayName }) => {
  const containerClasses = useMemo(
    () => cn('flex', 'min-w-0', 'items-center', 'gap-2.5', className),
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
        /*
          A display name is a person's own name, and German and Russian names are
          long - longer, in the written forms, than a group name had any reason to
          be. The header gives this row to the name first and the instruments
          second, so the name is the one thing allowed to give way - with an
          ellipsis, and never by pushing the controls off the row. `min-w-0` on the
          flex child is what lets it shrink below its content width; without it a
          flex item floors at its longest word, which for a Cyrillic name is a
          single unbreakable token.
        */
        'min-w-0',
        'truncate',
        'text-ink'
      ),
    [size]
  );

  return (
    <div className={containerClasses}>
      {/*
        A tag rather than a present: the app's whole subject is a list of things
        other people are going to wrap and hand over.
      */}
      {/*
        `stroke`, not `strokeWidth`. Tabler reads `stroke` as the numeric
        stroke-width and maps it onto the attribute; `strokeWidth` still typechecks
        and still works, because the component spreads the rest of its props last
        and so silently overrides `stroke` - which means a missed conversion here
        does not throw, it just draws the glyph 12.5% heavier than intended. The
        1.75 is deliberate in both libraries: Lucide's default is 2 on the same
        24px grid, so this thins the tag rather than the serif wordmark beside it.
      */}
      <IconTag
        className={cn(SIZES[size].icon, 'shrink-0', 'text-ink')}
        stroke={1.75}
        aria-hidden='true'
      />
      {/*
        `h1` only while it is the wordmark. Signed out, this is the product's own
        name and the largest thing on the page, so it is the page's heading. Signed
        in, the product substitutes the person's own display name here - and a
        person's name is not the heading of the page they are looking at, so this
        became a second `h1` on the list sheet (which has its own, the list's name)
        and the heading outline there was h1, h1, h3, h3 with no `h2` between them.
        Each route now owns exactly one `h1` and this component steps aside.
      */}
      {displayName ? (
        <p className={textClasses}>{displayName}</p>
      ) : (
        <h1 className={textClasses}>wishy</h1>
      )}
    </div>
  );
};

export default memo(Logo);
