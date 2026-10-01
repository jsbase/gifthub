'use client';

import { memo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getCurrentLanguage } from '@/lib/i18n-config';
import { cn } from '@/lib/utils';
import type { FooterProps } from '@/types';

const linkClasses = cn(
  'text-[0.8125rem]',
  'text-muted-foreground',
  'underline-offset-4',
  'transition-colors',
  'hover:text-foreground',
  'hover:underline'
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
