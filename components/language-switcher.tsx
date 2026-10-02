'use client';

import React, { lazy, memo, Suspense, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { IconChevronDown } from '@tabler/icons-react';
import { useDebounce } from '@/hooks/use-debounce';
import { loadTranslations } from '@/app/[lang]/actions';
import LanguageFlag from '@/components/language-flag';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCurrentLanguage, languages } from '@/lib/i18n-config';
import { cn } from '@/lib/utils';
import type { LanguageCode, LanguageSwitcherProps } from '@/types';

const LoadingSpinner = lazy(() => import('@/components/loading-spinner'));

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ label }) => {
  const path = usePathname();
  const router = useRouter();
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const selectedLanguage = getCurrentLanguage(path);

  const switchLanguageBase = async (langCode: LanguageCode) => {
    try {
      setIsChangingLanguage(true);
      document.cookie = `NEXT_LOCALE=${langCode};path=/;max-age=${
        365 * 24 * 60 * 60
      };SameSite=Lax`;
      await loadTranslations(langCode);
      const newPath = path.split('/').slice(2).join('/');
      await router.push(`/${langCode}${newPath ? `/${newPath}` : ''}`);
    } finally {
      setIsChangingLanguage(false);
    }
  };

  const switchLanguage = useDebounce(switchLanguageBase, 300, {
    leading: true,
    trailing: false,
  });

  /*
    A printed reference, not a pill.

    It was a 36px circle with a 1px ring, which broke the 44px floor this app
    treats as a hard minimum and read as a coloured dot: a German flag cropped
    to a disc loses two of its three bands, and the disc was the only saturated
    thing in the header competing with the name.

    The flag is now shown at its own 4:3 shape with no ring. It needs no boundary
    - it is the highest-contrast object on the row and it draws its own edge - and
    a `--rule` hairline would have measured 2.24:1 on the dark board, so it would
    have been invisible at night and present by day. Two things make it read as a
    control: the two-letter code in the printed-label face, which states the
    language in letters rather than asking the eye to recognise a flag, and the
    chevron, which is the only affordance the previous version never had.

    The code is `--caption` rather than `--furniture`. `--furniture` measures
    3.63:1 on the dark board and 2.80:1 on the light one - it is a border token,
    not a text token, and it fails 4.5:1 in both themes. `--caption` clears
    8.11:1 and 4.50:1.
  */
  const switcherLabel = label
    ? `${label}: ${selectedLanguage.name}`
    : selectedLanguage.name;

  return (
    <>
      {isChangingLanguage && (
        <Suspense fallback={null}>
          <LoadingSpinner />
        </Suspense>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            className={cn('gap-1.5', 'px-2')}
            data-testid='language-switcher'
            aria-label={switcherLabel}
          >
            {/*
              `alt=""` on purpose: the trigger already names itself and the
              current language in its aria-label, so a second announcement of
              "Deutsch" from the image would be a duplicate, not a detail.

              `relative -top-px` is an optical correction, not a layout one: a
              15px flag centred against a 14px chevron and an 11px code reads
              about a pixel low, because the flag's own mass sits in its upper
              half where a chevron's does not. A relative offset is used rather
              than a margin or a transform so the flag keeps its 15px box and the
              trigger keeps its 44px touch target - the nudge moves the pixels,
              not the hit area.
            */}
            <LanguageFlag
              src={selectedLanguage.flag}
              alt=''
              width={20}
              height={15}
              className={cn(
                'relative',
                '-top-px',
                'h-[15px]',
                'w-5',
                'shrink-0',
                'rounded-[2px]'
              )}
            />
            <span className={cn('label-print', 'narrow:hidden')}>
              {selectedLanguage.code.toUpperCase()}
            </span>
            <IconChevronDown
              className={cn('h-3.5', 'w-3.5', 'shrink-0')}
              aria-hidden='true'
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          {Object.values(languages).map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => switchLanguage(lang.code)}
              className={cn(
                'flex',
                'items-center',
                'gap-2.5',
                'cursor-pointer'
              )}
            >
              <LanguageFlag
                src={lang.flag}
                alt=''
                width={20}
                height={15}
                className={cn('w-5', 'h-[15px]', 'shrink-0', 'rounded-[2px]')}
              />
              <span>{lang.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default memo(LanguageSwitcher);
