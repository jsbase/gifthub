import type { LanguageCode, Languages } from '@/types';

export const locales: LanguageCode[] = ['en', 'de', 'ru'];
export const defaultLocale: LanguageCode = 'de';

export const languages: Languages = {
  en: { name: 'English', flag: '/flags/gb.svg' },
  de: { name: 'Deutsch', flag: '/flags/de.svg' },
  ru: { name: 'Русский', flag: '/flags/ru.svg' }
};
