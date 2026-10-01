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
import type { RootLayoutProps } from '@/types';

/*
  Three faces, three jobs, all three carrying Latin AND Cyrillic - the de/en/ru
  route tree comes from one component tree, so a face without a Cyrillic subset
  breaks the product for half its audience rather than degrading it.

  Golos Text is Cyrillic-first: it was drawn for Cyrillic, which matters in a
  product whose longest strings are German compounds and Russian genitives.
  Source Serif 4 is reserved for a name, which is the one typographic commitment
  carried over from the previous system - a museum specimen label is exactly
  where a serif belongs, so the rule survives the change of world and is better
  motivated by it. PT Sans Narrow is the printed chrome: the cell's name and the
  reference line under it, the count figure that heads each section of a sheet,
  and the small tracked labels, 11-15px.
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
    when either changes — these two hexes and the two `--board` declarations are
    the same colour written twice, and they have to be kept in step by hand.

      light  --board: 40 26% 89%  ->  #E3DACA
      dark   --board: 28 15%  7%  ->  #100C09
  */
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#E3DACA' },
    { media: '(prefers-color-scheme: dark)', color: '#100C09' },
  ],
  width: 'device-width',
  initialScale: 1.0,
  viewportFit: 'cover',
  userScalable: false,
};

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => (
  <html lang='en' suppressHydrationWarning>
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

export default RootLayout;
