import type { Translations } from '@/types';

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

type SupportedLocale = keyof typeof dictionaries;

const isSupportedLocale = (locale: string): locale is SupportedLocale =>
  Object.prototype.hasOwnProperty.call(dictionaries, locale);

const getDictionary = async (locale: string): Promise<Translations> => {
  const safeLocale: SupportedLocale = isSupportedLocale(locale) ? locale : 'en';

  if (!dictionaryCache[safeLocale]) {
    dictionaryCache[safeLocale] = dictionaries[safeLocale]();
  }
  return dictionaryCache[safeLocale];
};

export default getDictionary;
