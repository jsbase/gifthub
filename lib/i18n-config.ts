import type {
  LanguageCode,
  Languages,
} from '@/types';

export const defaultLocale: LanguageCode = 'de';
export const locales: LanguageCode[] = ['de', 'en', 'ru'];

export const languages: Languages = {
  de: { code: locales[0], name: 'Deutsch', flag: '/flags/de.svg' },
  en: { code: locales[1], name: 'English', flag: '/flags/gb.svg' },
  ru: { code: locales[2], name: 'Русский', flag: '/flags/ru.svg' }
};

export const hasLocaleInPath = (path: string) => locales.some(locale =>
  path.startsWith(`/${locale}/`) || path === `/${locale}`);

export const getLocaleFromPath = (path: string) => (
  locales.find(locale =>
    path.startsWith(`/${locale}/`) || path === `/${locale}`)) ||
  defaultLocale;

export const getCurrentLanguage = (path: string) => (
  hasLocaleInPath(path) &&
  Object.values(languages).find(lang =>
    path.startsWith(`/${lang.code}/`) || path === `/${lang.code}`)
) || languages[defaultLocale];
