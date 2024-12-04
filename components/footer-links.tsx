'use client';

import { memo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getCurrentLanguage } from '@/lib/i18n-config';
import { cn } from '@/lib/utils';
import type { FooterProps } from '@/types';

const FooterLinks = ({ dict }: Pick<FooterProps, 'dict'>) => {
  const path = usePathname();
  const currentLanguage = getCurrentLanguage(path);
  const [lang] = useState(currentLanguage.code);

  return (
    <div
      className={cn('flex', 'space-x-5', 'justify-end', 'sm:justify-center')}
    >
      <Link
        href={`/${lang}/privacy`}
        className={cn(
          'text-gray-500',
          'hover:text-gray-900',
          'dark:hover:text-white'
        )}
        data-testid='linkPrivacy'
      >
        {dict.footer.privacyPolicy}
      </Link>
      <Link
        href={`/${lang}/terms`}
        className={cn(
          'text-gray-500',
          'hover:text-gray-900',
          'dark:hover:text-white'
        )}
        data-testid='linkTerms'
      >
        {dict.footer.termsConditions}
      </Link>
    </div>
  );
};

export default memo(FooterLinks);
