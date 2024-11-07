export const locales = ['en', 'de', 'ru'] as const;
export type LanguageCode = (typeof locales)[number];
export const defaultLocale: LanguageCode = 'de';
