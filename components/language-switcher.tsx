'use client';

import { lazy, memo, Suspense, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
import type { LanguageCode } from '@/types';

const LoadingSpinner = lazy(() => import('@/components/loading-spinner'));

const LanguageSwitcher: React.FC = () => {
  const path = usePathname();
  const router = useRouter();
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const selectedLanguage = getCurrentLanguage(path);

  const switchLanguageBase = async (langCode: LanguageCode) => {
    try {
      setIsChangingLanguage(true);
      document.cookie = `NEXT_LOCALE=${langCode};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
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
            variant="ghost"
            size="icon"
            className={cn("w-6 h-6", "rounded-full", "overflow-hidden", "p-0")}
            data-testid="language-switcher"
          >
            <LanguageFlag
              src={selectedLanguage.flag}
              alt={selectedLanguage.name}
              width={30}
              height={30}
              className={cn("w-6", "h-6", "object-cover")}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {Object.values(languages).map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => switchLanguage(lang.code)}
              className={cn(
                "flex", "items-center", "gap-2", "cursor-pointer",
                "hover:bg-accent", "active:bg-accent/80",
                "focus:bg-accent/80", "py-3"
              )}
            >
              <LanguageFlag
                src={lang.flag}
                alt={lang.name}
                width={20}
                height={20}
                className={cn("w-5", "h-5")}
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
