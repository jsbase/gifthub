'use server';

import { getDictionary } from '@/app/[lang]/dictionaries';
import type { Translations } from '@/types';

const loadTranslations: (locale: string) => Promise<Translations> = async (locale) => {
  return getDictionary(locale);
};

export { loadTranslations };
