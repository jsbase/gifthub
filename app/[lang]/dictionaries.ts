import type { Translations } from '@/types';

// Add a simple cache for dictionaries
const dictionaryCache: Record<string, Promise<Translations>> = {};

const dictionaries = {
  en: () => import('@/lib/translations/en.json').then((module) => module.default as Translations),
  de: () => import('@/lib/translations/de.json').then((module) => module.default as Translations),
  ru: () => import('@/lib/translations/ru.json').then((module) => module.default as Translations),
};

export const getDictionary = async (locale: string): Promise<Translations> => {
  // Check if we have a cached version
  if (!dictionaryCache[locale]) {
    // If not, cache the promise
    dictionaryCache[locale] = dictionaries[locale as keyof typeof dictionaries]();
  }
  return dictionaryCache[locale];
};
