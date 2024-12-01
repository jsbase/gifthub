import { LanguageCode, Languages } from '@/types';

export const defaultLocale: LanguageCode = 'de';
export const locales: LanguageCode[] = ['de', 'en', 'ru'];
export const languages: Languages = {
  de: { code: locales[0], name: 'Deutsch', flag: '/flags/de.svg' },
  en: { code: locales[1], name: 'English', flag: '/flags/gb.svg' },
  ru: { code: locales[2], name: 'Русский', flag: '/flags/ru.svg' }
};
