'use client';

import Image from 'next/image';
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
  const currentLanguage = {
    name: languages[0].name,
    flag: languages[0].flag
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full overflow-hidden">
          <Image
            src={currentLanguage?.flag || languages[0].flag}
            alt={currentLanguage?.name || languages[0].name}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => console.log(lang.code)}
            className="flex items-center gap-2"
          >
            <Image
              src={lang.flag}
              alt={lang.name}
              width={20}
              height={20}
              className="rounded-sm"
            />
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
