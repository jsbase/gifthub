import { NextPage } from 'next';
import React from 'react';
import getDictionary from '@/app/[lang]/dictionaries';
import Header from '@/components/header';
import Logo from '@/components/logo';
import AuthButtons from '@/components/auth-buttons';
import Footer from '@/components/footer';
import FeatureCards from '@/components/feature-cards';
import { cn } from '@/lib/utils';
import type { PageProps, Translations } from '@/types';

const Home: NextPage<PageProps> = async ({ params }) => {
  const { lang } = await params;
  const dict: Translations = await getDictionary(lang);

  return (
    <div className={cn('flex', 'flex-col', 'min-h-screen')}>
      <Header dict={dict} />
      <main className={cn('flex-1')}>
        {/*
          `container` is the outer element and the narrow column nests inside
          it, so the hand-written container ladder in globals.css is never
          fought by a max-width utility on the same element.
        */}
        <div className={cn('container', 'mx-auto')}>
          <div
            className={cn(
              'mx-auto',
              'max-w-2xl',
              'pt-14',
              'pb-20',
              'sm:pt-20',
              'lg:pt-28',
              'lg:pb-24'
            )}
          >
            <Logo size='lg' />
            <p
              className={cn(
                'mt-6',
                'max-w-[46ch]',
                'text-[1.0625rem]',
                'leading-relaxed',
                'text-muted-foreground'
              )}
            >
              {dict.tagline}
            </p>
            <div className={cn('mt-9')}>
              <AuthButtons dict={dict} />
            </div>
            <FeatureCards features={dict.features} />
          </div>
        </div>
      </main>
      <Footer dict={dict} />
    </div>
  );
};

export default Home;
