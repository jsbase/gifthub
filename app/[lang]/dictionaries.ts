import 'server-only';
import { Translations } from '@/types';

const dictionaries = {
  en: () => import('@/lib/translations/en.json').then((module) => module.default),
  de: () => import('@/lib/translations/de.json').then((module) => module.default),
  ru: () => import('@/lib/translations/ru.json').then((module) => module.default),
};

export const getDictionary = async (locale: string): Promise<Translations> =>
  dictionaries[locale as keyof typeof dictionaries]();
