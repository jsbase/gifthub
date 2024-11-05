import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageSwitcher } from '@/components/language-switcher';

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
    url: 'https://gifthub-wishlist.vercel.app/',
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

export const viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1.0,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="fixed top-4 right-4 z-50">
            <LanguageSwitcher />
          </div>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
