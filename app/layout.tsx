import '@/app/globals.css';
import React from 'react';
import { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import ThemeProvider from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import { cn } from '@/lib/utils';
import type { RootLayoutProps } from '@/types';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GiftHub - Family Gift Management',
  description: 'Manage gift ideas for your family and groups',
  authors: [{ name: 'GiftHub' }],
  keywords: ['gift', 'gift ideas', 'family gifts', 'group gifts', 'gift management'],
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
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
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
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1.0,
  viewportFit: 'cover',
  userScalable: false,
};

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => (
  <html lang="en" suppressHydrationWarning>
    <body className={cn(
      inter.className,
      "min-h-screen",
      "flex",
      "flex-col"
    )}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className={cn(
          "flex-1",
          "flex",
          "flex-col"
        )}>
          {children}
        </div>
        <Toaster />
        <ServiceWorkerRegistration />
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
