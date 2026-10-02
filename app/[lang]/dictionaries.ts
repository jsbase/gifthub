import type { LanguageCode, Translations } from '@/types';
import { defaultLocale } from '@/lib/i18n-config';

const dictionaryCache: Record<string, Promise<Translations>> = {};

const dictionaries = {
  en: () =>
    import('@/lib/translations/en.json').then(
      (module) => module.default as Translations
    ),
  de: () =>
    import('@/lib/translations/de.json').then(
      (module) => module.default as Translations
    ),
  ru: () =>
    import('@/lib/translations/ru.json').then(
      (module) => module.default as Translations
    ),
};

type SupportedLocale = LanguageCode;

const isSupportedLocale = (locale: string): locale is SupportedLocale =>
  Object.prototype.hasOwnProperty.call(dictionaries, locale);

/*
  The fallback is `defaultLocale` rather than a literal. It used to be 'en',
  which made this file the second place in the app that answered "what is the
  default locale" - and answered it differently from `lib/i18n-config`, which
  says 'de' and is what the rest of the app reads. An unsupported locale segment
  rendered a German page with English words on it.
*/
const getDictionary = async (locale: string): Promise<Translations> => {
  const safeLocale: SupportedLocale = isSupportedLocale(locale)
    ? locale
    : defaultLocale;

  if (!dictionaryCache[safeLocale]) {
    dictionaryCache[safeLocale] = dictionaries[safeLocale]();
  }
  return dictionaryCache[safeLocale];
};

export default getDictionary;
