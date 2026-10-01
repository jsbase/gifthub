import { NextPage } from 'next';
import React from 'react';
import getDictionary from '@/app/[lang]/dictionaries';
import Header from '@/components/header';
import AuthButtons from '@/components/auth-buttons';
import Footer from '@/components/footer';
import FeatureCards from '@/components/feature-cards';
import LandingPreview from '@/components/landing-preview';
import { CropMarks } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { PageProps, Translations } from '@/types';

/**
 * The album's cover, its front matter, and a specimen of the contents page.
 *
 * Three bands, and the material of each one is the argument:
 *
 *   a sheet   the claim and the two ways in. Label stock mounted on the board,
 *             crop marks in the corners, board showing around it on all four
 *             sides. This is what the app is, before anything is explained.
 *   the board three sentences about how the group works. No box, no fill, no
 *             edge - they are descriptions rather than objects, and a frame
 *             would claim they were objects.
 *   a sheet   the contents page, quoted rather than described.
 *
 * It is Persuade, not Operate, so the hierarchy is inverted against the
 * dashboard's: here the claim and the two buttons are the loudest things on the
 * page and the sample list is evidence.
 *
 * The claim is the display line and the product's name is not. `wishy` is
 * already in the header at every width on every route, in the same serif, and
 * a second copy of it 40px below the first answered a question the visitor
 * already had answered while answering the one they had not - which is what
 * this is, and why they should care. `dict.tagline` is that sentence. It used to
 * be set at 17px in the caption weight, the quietest treatment on a page whose
 * whole job is to be believed, while the name above it was the loudest.
 */
const Home: NextPage<PageProps> = async ({ params }) => {
  const { lang } = await params;
  const dict: Translations = await getDictionary(lang);

  return (
    <div className={cn('flex', 'flex-col', 'min-h-screen', 'bg-board')}>
      <Header dict={dict} />
      {/*
        `container` is the outer element and the plate column nests inside it, so
        the hand-written container ladder in globals.css is never fought by a
        max-width utility on the same element.

        The plate ladder below is the dashboard's, character for character:
        `max-w-5xl px-4 py-8 sm:px-6 sm:py-12`. That is not tidiness. It is the
        only reason the two sheets on this page and the contents sheet on the
        dashboard are visibly the same piece of stock at the same distance from
        the edge of the desk, which is the whole of what "same product" looks
        like when nobody has seen the dashboard and only has this page.

        What fills the space below the features is the preview's own content, not
        a layout trick. An earlier version had `flex-1` on this column and
        `mt-auto` on the preview and both were inert - the container utility is
        `display: block`, so the column was a block child with a
        content-derived height, `flex-1` had no free space to distribute, and
        `mt-auto` computed to 0px. Removing them moves the preview 0.00px.
      */}
      <main className={cn('flex', 'flex-1', 'flex-col')}>
        <div className={cn('container', 'mx-auto')}>
          <div
            className={cn(
              'mx-auto',
              'max-w-5xl',
              'px-4',
              'py-8',
              'sm:px-6',
              'sm:py-12'
            )}
          >
            <div
              className={cn(
                'relative',
                'border',
                'border-rule',
                'bg-sheet',
                'px-5',
                'py-8',
                'sm:px-10',
                'sm:py-12'
              )}
            >
              {/* The same corner furniture the contents sheet and every floating
                  sheet carry. On this page it does more work than elsewhere:
                  without it a white rectangle on a buff ground is a card, and a
                  card is the one shape this world does not have. */}
              <CropMarks />
              {/*
                The `leading-[1.15]` is written AFTER the size on purpose. In
                tailwind-merge 3.7.0, which `cn` is built on, a font-size class
                eats a preceding `leading-*` from the same call:
                `cn('leading-[1.15]', 'text-[clamp(...)]')` resolves to
                `text-[clamp(...)]` alone, and `cn('leading-tight', 'text-3xl')`
                to `text-3xl`. Reversed, both survive. Written in the natural
                reading order this claim silently fell back to the 1.5 the
                browser gives a 34px paragraph, which is why the sentence
                read as two separate lines of body copy instead of one
                statement. A scan of every `cn()` call in the repo finds no
                other call losing a leading class today - every existing site
                happens to order `leading-*` last.
              */}
              <p
                className={cn(
                  'max-w-[46ch]',
                  'font-medium',
                  'text-balance',
                  'text-ink',
                  'text-[clamp(1.375rem,5vw,2.125rem)]',
                  'leading-[1.15]'
                )}
              >
                {dict.tagline}
              </p>
              <div className={cn('mt-8', 'sm:mt-10')}>
                <AuthButtons dict={dict} />
              </div>
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