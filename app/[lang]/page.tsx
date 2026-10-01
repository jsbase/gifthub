import { NextPage } from 'next';
import React from 'react';
import getDictionary from '@/app/[lang]/dictionaries';
import Header from '@/components/header';
import Logo from '@/components/logo';
import AuthButtons from '@/components/auth-buttons';
import Footer from '@/components/footer';
import FeatureCards from '@/components/feature-cards';
import LandingPreview from '@/components/landing-preview';
import { cn } from '@/lib/utils';
import type { PageProps, Translations } from '@/types';

const Home: NextPage<PageProps> = async ({ params }) => {
  const { lang } = await params;
  const dict: Translations = await getDictionary(lang);

  return (
    <div className={cn('flex', 'flex-col', 'min-h-screen')}>
      <Header dict={dict} />
      <main className={cn('flex', 'flex-1', 'flex-col')}>
        {/*
          `container` is the outer element and the narrow column nests inside it,
          so the hand-written container ladder in globals.css is never fought by a
          max-width utility on the same element.

          The column is a flex column for one reason: flex items do not collapse
          their margins, so the gap between the features and the preview is the
          sum of the two margins rather than the larger of the two.

          What fills the space below the features is the preview's own content,
          not a layout trick. An earlier version had `flex-1` on this column and
          `mt-auto` on the preview and both were inert - the container utility is
          `display: block`, so the column was a block child with a
          content-derived height, `flex-1` had no free space to distribute, and
          `mt-auto` computed to 0px. Removing them moves the preview 0.00px.
        */}
        <div className={cn('container', 'mx-auto')}>
          <div
            className={cn(
              'mx-auto',
              'max-w-2xl',
              'flex',
              'flex-col',
              'pt-12',
              'pb-8',
              'sm:pt-14',
              'lg:pt-16',
              'lg:pb-6'
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
            <LandingPreview
              preview={dict.preview}
              giftCount={dict.giftCount}
              members={dict.members}
            />
          </div>
        </div>
      </main>
      <Footer dict={dict} />
    </div>
  );
};

export default Home;
