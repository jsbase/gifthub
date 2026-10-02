import type { Translations } from '@/types';

const dictionaryCache: Record<string, Promise<Translations>> = {};

type SupportedLocale = 'en' | 'de' | 'ru';

const dictionaries = new Map<SupportedLocale, () => Promise<Translations>>([
  [
    'en',
    () =>
      import('@/lib/translations/en.json').then(
        (module) => module.default as Translations
      ),
  ],
  [
    'de',
    () =>
      import('@/lib/translations/de.json').then(
        (module) => module.default as Translations
      ),
  ],
  [
    'ru',
    () =>
      import('@/lib/translations/ru.json').then(
        (module) => module.default as Translations
      ),
  ],
]);

const isSupportedLocale = (locale: string): locale is SupportedLocale =>
  locale === 'en' || locale === 'de' || locale === 'ru';

const getDictionary = async (locale: string): Promise<Translations> => {
  const safeLocale: SupportedLocale = isSupportedLocale(locale) ? locale : 'en';

  if (!dictionaryCache[safeLocale]) {
    const loader = dictionaries.get(safeLocale) ?? dictionaries.get('en');
    if (typeof loader !== 'function') {
      throw new Error('No dictionary loader configured for locale.');
    }
    dictionaryCache[safeLocale] = loader();
  }
  return dictionaryCache[safeLocale];
};

export default getDictionary;
