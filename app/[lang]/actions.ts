'use server';

import { getDictionary } from '@/app/[lang]/dictionaries';
import { Translations } from '@/types';

const loadTranslations: (locale: string) => Promise<Translations> = async (locale) => {
  return getDictionary(locale);
};

export { loadTranslations };
