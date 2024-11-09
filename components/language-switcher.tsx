'use client';

import { lazy, memo, Suspense, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { loadTranslations } from '@/app/[lang]/actions';
import { LanguageCode, Language } from '@/types';
import { cn } from '@/lib/utils';

const languages: readonly Language[] = [
  { code: 'de', name: 'Deutsch', flag: '/flags/de.svg' },
  { code: 'en', name: 'English', flag: '/flags/gb.svg' },
  { code: 'ru', name: 'Русский', flag: '/flags/ru.svg' },
] as const;

// Lazy load the LoadingSpinner since it's conditionally rendered
const LoadingSpinner = lazy(() => import('./loading-spinner'));

// Memoize the flag image component since it's used multiple times
const LanguageFlag = memo(function LanguageFlag({ 
  src, 
  alt, 
  width, 
  height, 
  className 
}: { 
  src: string; 
  alt: string; 
  width: number; 
  height: number; 
  className?: string; 
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ objectFit: 'cover' }}
    />
  );
});

export const LanguageSwitcher = memo(function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  const currentLang = languages.find(
    lang => pathname.startsWith(`/${lang.code}/`) || pathname === `/${lang.code}`
  ) || languages[0];

  const switchLanguage = async (langCode: LanguageCode) => {
    try {
      setIsChangingLanguage(true);
      document.cookie = `NEXT_LOCALE=${langCode};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
      await loadTranslations(langCode);
      const newPath = pathname.split('/').slice(2).join('/');
      await router.push(`/${langCode}${newPath ? `/${newPath}` : ''}`);
    } finally {
      setIsChangingLanguage(false);
    }
  };

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
          >
            <LanguageFlag
              src={currentLang.flag}
              alt={currentLang.name}
              width={30}
              height={30}
              className={cn("w-6", "h-6", "object-cover")}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {languages.map((lang) => (
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
});
