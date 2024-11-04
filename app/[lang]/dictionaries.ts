import type { Translations } from '@/types';

const dictionaries = {
  en: () => import('@/lib/translations/en.json').then((module) => module.default as Translations),
  de: () => import('@/lib/translations/de.json').then((module) => module.default as Translations),
  ru: () => import('@/lib/translations/ru.json').then((module) => module.default as Translations),
};

export const getDictionary = async (locale: string): Promise<Translations> =>
  dictionaries[locale as keyof typeof dictionaries]();
