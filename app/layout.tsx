import '@/app/globals.css';
import React from 'react';
import { Metadata, Viewport } from 'next';
import { Literata, Onest } from 'next/font/google';
import ThemeProvider from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import ServiceWorkerRegistration from '@/components/service-worker';
import { cn } from '@/lib/utils';
import type { RootLayoutProps } from '@/types';

// Literata carries the people and the occasion: the wordmark, page titles,
// member names, the member's name as a dialog title. Onest carries the
// mechanism: buttons, inputs, gift titles, counts, legal copy. Both ship Latin
// and Cyrillic, which de/en/ru from one component tree requires.
const literata = Literata({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600'],
  display: 'swap',
  variable: '--font-literata',
});

const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-onest',
});

export const metadata: Metadata = {
  title: 'GiftHub - Family Gift Management',
  description: 'Manage gift ideas for your family and groups',
  authors: [{ name: 'GiftHub' }],
  keywords: [
    'gift',
    'gift ideas',
    'family gifts',
    'group gifts',
    'gift management',
  ],
  robots: 'index, follow',
  openGraph: {
    title: 'GiftHub - Family Gift Management',
    description: 'Manage gift ideas for your family and groups',
    images: [
      {
        url: '/apple-touch-icon.png',
      },
    ],
    url: process.env.NEXT_PUBLIC_BASE_URL,
    siteName: 'GiftHub',
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
  // These are the two page grounds, and they are the two values the token block
  // in globals.css actually renders - the dark ground is a 49%-saturated deep
  // teal, not a near-black, so the OS chrome is told what the page paints.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F8F7' },
    { media: '(prefers-color-scheme: dark)', color: '#0C1E22' },
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
        literata.variable,
        onest.variable,
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
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
