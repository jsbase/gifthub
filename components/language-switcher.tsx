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

const languages = [
  { code: 'en', name: 'English', flag: '/flags/gb.svg' },
  { code: 'de', name: 'Deutsch', flag: '/flags/de.svg' },
  { code: 'ru', name: 'Русский', flag: '/flags/ru.svg' },
] as const;

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  const currentLang = languages.find(
    lang => pathname.startsWith(`/${lang.code}/`) || pathname === `/${lang.code}`
  ) || languages[0];

  const switchLanguage = (langCode: string) => {
    const newPath = pathname.split('/').slice(2).join('/');
    const redirectPath = `/${langCode}${newPath ? `/${newPath}` : ''}`;
    router.push(redirectPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full overflow-hidden p-0">
          <Image
            src={currentLang.flag}
            alt={currentLang.name}
            width={32}
            height={32}
            className="w-8 h-8"
            style={{ objectFit: 'cover' }}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className="flex items-center gap-2"
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
