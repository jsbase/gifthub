'use client';

import { memo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getCurrentLanguage } from '@/lib/i18n-config';
import { cn } from '@/lib/utils';
import type { FooterProps } from '@/types';

const linkClasses = cn(
  'text-[0.8125rem]',
  'text-caption',
  'underline-offset-4',
  'transition-colors',
  /*
    A 44px target around 20px of text, by padding out and pulling back by the same
    amount. These are the only two controls in the app that measured under the
    floor - 82x19.5px and 27x19.5px at every width, because a footer link is a
    line of text and the line is what got sized. The footer's own height does not
    move: `-my-3` takes back exactly what `py-3` adds, so the band the footer
    occupies is unchanged and only the touch target grows.
  */
  'inline-flex min-h-11 items-center',
  '-my-3',
  '[@media(hover:hover)_and_(pointer:fine)]:hover:text-ink',
  '[@media(hover:hover)_and_(pointer:fine)]:hover:underline'
);

const FooterLinks = ({ dict }: Pick<FooterProps, 'dict'>) => {
  const path = usePathname();
  const currentLanguage = getCurrentLanguage(path);
  const [lang] = useState(currentLanguage.code);

  return (
    <div className={cn('flex', 'flex-wrap', 'gap-x-5', 'gap-y-1')}>
      <Link
        href={`/${lang}/privacy`}
        className={linkClasses}
        data-testid='linkPrivacy'
      >
        {dict.footer.privacyPolicy}
      </Link>
      <Link
        href={`/${lang}/terms`}
        className={linkClasses}
        data-testid='linkTerms'
      >
        {dict.footer.termsConditions}
      </Link>
    </div>
  );
};

export default memo(FooterLinks);
