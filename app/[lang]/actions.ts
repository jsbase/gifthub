'use server'

import { getDictionary } from './dictionaries';

export async function loadTranslations(locale: string) {
  return getDictionary(locale);
}
