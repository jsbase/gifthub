'use client';

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

const languages: readonly Language[] = [
  { code: 'de', name: 'Deutsch', flag: '/flags/de.svg' },
  { code: 'en', name: 'English', flag: '/flags/gb.svg' },
  { code: 'ru', name: 'Русский', flag: '/flags/ru.svg' },
] as const;

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  const currentLang = languages.find(
    lang => pathname.startsWith(`/${lang.code}/`) || pathname === `/${lang.code}`
  ) || languages[0];

  const switchLanguage = async (langCode: LanguageCode) => {
    // Set cookie
    document.cookie = `NEXT_LOCALE=${langCode};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;

    await loadTranslations(langCode);

    const newPath = pathname.split('/').slice(2).join('/');
    // Wait for navigation to complete
    await router.push(`/${langCode}${newPath ? `/${newPath}` : ''}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 rounded-full overflow-hidden p-0"
        >
          <Image
            src={currentLang.flag}
            alt={currentLang.name}
            width={30}
            height={30}
            className="w-6 h-6"
            style={{ objectFit: 'cover' }}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className="flex items-center gap-2 cursor-pointer hover:bg-accent active:bg-accent/80 focus:bg-accent/80 py-3"
          >
            <Image
              src={lang.flag}
              alt={lang.name}
              width={20}
              height={20}
              className="w-5 h-5"
              style={{ objectFit: 'cover' }}
            />
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
