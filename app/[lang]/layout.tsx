import '@/app/globals.css';
import React from 'react';
import { Metadata, Viewport } from 'next';
import { Golos_Text, PT_Sans_Narrow, Source_Serif_4 } from 'next/font/google';
import ThemeProvider from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import ServiceWorkerRegistration from '@/components/service-worker';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { cn } from '@/lib/utils';
import { locales, defaultLocale } from '@/lib/i18n-config';
import type { LanguageCode, RootLayoutProps } from '@/types';

/*
  This is the app's root layout, and it sits inside `app/[lang]/` rather than at
  `app/layout.tsx` because `<html lang>` is a property of the document and the
  document is the one thing that has to know which of the three locales it is
  carrying. Every page in this project already lives under that segment - the
  only other things under `app/` are route handlers, the service worker and the
  stylesheet, none of which renders a document - so the layout moved rather than
  the locale being guessed.

  It used to live at `app/layout.tsx` with a hardcoded `lang='en'`, which is a
  defect and was measured as one: on `/ru/dashboard`, with "Ваши списки" on
  screen, `document.documentElement.lang` was `"en"`. There was no client-side
  override anywhere in the repository, so the value was static rather than
  briefly wrong. A screen reader met Russian in a document that claimed to be
  English, and took its pronunciation and its syllable rules - and therefore its
  line-breaking opportunities - from the wrong language, in a product whose own
  constraints say layout has to be designed against the longest string in the
  set. Three of the app's locales are not a decoration on one document; they
  are three documents.

  The cost of fixing it the other way round - reading the locale out of a request
  header in the root layout - was rejected on purpose: `headers()` opts the whole
  app out of static rendering to serve one attribute that the segment already
  knows.
*/
const sourceSerif = Source_Serif_4({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-source-serif',
});

const golos = Golos_Text({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-golos',
});

const ptNarrow = PT_Sans_Narrow({
  subsets: ['latin', 'cyrillic'],
  // PT Sans Narrow ships 400 and 700 only, and that is all this face needs: the
  // printed chrome is either plain or emphatically stamped.
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-pt-narrow',
});

export const metadata: Metadata = {
  title: 'wishy - Family Gift Management',
  description: 'Manage gift ideas for your family and groups',
  authors: [{ name: 'wishy' }],
  keywords: [
    'gift',
    'gift ideas',
    'family gifts',
    'group gifts',
    'gift management',
  ],
  robots: 'index, follow',
  openGraph: {
    title: 'wishy - Family Gift Management',
    description: 'Manage gift ideas for your family and groups',
    images: [
      {
        url: '/apple-touch-icon.png',
      },
    ],
    url: process.env.NEXT_PUBLIC_BASE_URL,
    siteName: 'wishy',
    locale: 'en_US',
    type: 'website',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      {
        url: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
    other: [
      {
        rel: 'manifest',
        url: '/site.webmanifest',
      },
    ],
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  /*
    The two page grounds, and the two values the token block in globals.css
    actually renders. These are duplicated here because `themeColor` is a static
    metadata value, not a token reference, so it cannot follow the theme block
    when either changes - these two hexes and the two `--board` declarations are
    the same colour written twice, and they have to be kept in step by hand.

      light  --board: 40 26% 89%  ->  #EAE5DC
      dark   --board: 28 15%  7%  ->  #15120F

    Both were wrong in the comment this replaces: the light value was the
    pre-rebrush buff, and the dark one read a shade too dark. The numbers above
    are the HSL triplets in `globals.css` resolved, which is the same arithmetic
    the browser does.
  */
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EAE5DC' },
    { media: '(prefers-color-scheme: dark)', color: '#15120F' },
  ],
  width: 'device-width',
  initialScale: 1.0,
  viewportFit: 'cover',
  userScalable: false,
};

const LocaleLayout: React.FC<RootLayoutProps> = async ({ children, params }) => {
  const { lang } = await params;
  /*
    The segment is the authority on the locale and `proxy.ts` has already
    redirected anything that did not carry one, so this guard is not routing -
    it is the one place the document's `lang` could otherwise be a string no
    locale matches, which is the same failure as the hardcoded `en` in a narrower
    window.
  */
  const locale: LanguageCode = locales.includes(lang as LanguageCode)
    ? (lang as LanguageCode)
    : defaultLocale;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          sourceSerif.variable,
          golos.variable,
          ptNarrow.variable,
          'min-h-screen',
          'flex',
          'flex-col'
        )}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <div className={cn('flex-1', 'flex', 'flex-col')}>{children}</div>
          <Toaster />
          <ServiceWorkerRegistration />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;