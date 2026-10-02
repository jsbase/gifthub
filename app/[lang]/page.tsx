import { NextPage } from 'next';
import React from 'react';
import getDictionary from '@/app/[lang]/dictionaries';
import Header from '@/components/header';
import AuthButtons from '@/components/auth-buttons';
import Footer from '@/components/footer';
import FeatureCards from '@/components/feature-cards';
import LandingPreview from '@/components/landing-preview';
import { cn } from '@/lib/utils';
import type { PageProps, Translations } from '@/types';

/**
 * The album's cover: the claim, the two ways in, and one page of the album itself.
 *
 * It is Persuade, not Operate, so the hierarchy is the opposite of the
 * dashboard's: the claim and the two buttons are the loudest things here and the
 * specimen plate is evidence beside them, not a screenshot underneath them.
 *
 * **One grid, two rows, nothing centred.** Both rows are the same `7fr / 5fr`
 * split, and that shared division is the whole composition:
 *
 *   row 1  the claim fills the wide column; the plate is tipped into the narrow
 *          one, dropped 6rem so its top edge falls between the claim's first and
 *          second line. Two masses of different widths with different top edges
 *          and different left and right margins.
 *   row 2  the three mechanisms run down the wide column and the narrow one is
 *          left as bare board.
 *
 * The eye therefore travels claim → plate → mechanisms, a diagonal, instead of
 * straight down a centred axis. Nothing on the page shares a left edge with
 * anything below it, and that is the point: the previous version was a hero
 * rectangle, a three-up feature row and a second rectangle of exactly the same
 * size, all on one centre line, which is the composition every generated landing
 * page arrives at.
 *
 * It also drops `max-w-5xl` and its own `px-4 sm:px-6`. The `container` utility
 * already supplies the page's horizontal padding, so that inner column was
 * padding the padding: it put the content's left edge 72px right of the header
 * wordmark and of the footer's copyright, on the same screen, on every route.
 * Without it the claim starts on the header's left edge and the plate ends on the
 * header's right edge, which is the only alignment the two rows of furniture and
 * the content between them can all share.
 *
 * The dashboard keeps its own `max-w-5xl`: a mounted sheet is meant to sit inset
 * from the desk on all four sides, and there the inset is the design. Here the
 * content is the page, not a sheet lying on it.
 */
const Home: NextPage<PageProps> = async ({ params }) => {
  const { lang } = await params;
  const dict: Translations = await getDictionary(lang);

  return (
    <div className={cn('flex', 'flex-col', 'min-h-screen', 'bg-board')}>
      <Header dict={dict} />
      <main className={cn('flex', 'flex-1', 'flex-col')}>
        <div className={cn('container', 'mx-auto')}>
          <div className={cn('py-10', 'sm:py-14', 'lg:py-20')}>
            <div
              className={cn(
                'grid',
                'gap-x-14',
                'gap-y-16',
                'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]'
              )}
            >
              {/*
                `leading-[1.08]` is written AFTER the size on purpose. In
                tailwind-merge 3.7.0, which `cn` is built on, a font-size class
                eats a preceding `leading-*` from the same call:
                `cn('leading-[1.08]', 'text-[clamp(...)]')` resolves to the size
                alone. Reversed, both survive. Written in the natural reading
                order this claim silently fell back to the 1.5 the browser gives
                a 44px paragraph, which is why it read as body copy rather than
                as a statement. A scan of every `cn()` call in the repo finds no
                other call losing a leading class today - every existing site
                happens to order `leading-*` last.

                No `max-w` here on purpose. The grid column IS the measure, and a
                cap wide enough to matter measured identical to it at 1440, 1024
                and 390 - three breakpoints, three equalities - so it was a class
                that read as a decision and bound nothing. `text-balance` then does
                the real work of evening the rag across whatever the column is.
              */}
              <div className={cn('flex', 'flex-col')}>
                <p
                  className={cn(
                    'order-1',
                    'font-semibold',
                    'tracking-[-0.02em]',
                    'text-balance',
                    'text-ink',
                    'text-[clamp(1.75rem,3.4vw,2.75rem)]',
                    'leading-[1.08]'
                  )}
                >
                  {dict.tagline}
                </p>

                {/*
                  The album's entry rule: a catalogue marks the start of an entry
                  with a short line of ink. It sits between the claim and the
                  sentence that explains it, so the two read as different registers
                  of the same voice rather than as a heading and its subtitle.
                */}
                <span
                  aria-hidden='true'
                  className={cn(
                    'order-2',
                    'mt-9',
                    'block',
                    'h-px',
                    'w-16',
                    'bg-furniture'
                  )}
                />

                {/*
                  A standfirst, not a subtitle: what the group model actually is,
                  in concrete terms. Deliberately narrower than the claim above it
                  and narrower than the plate beside it, so the page carries three
                  measures rather than one - the widest for the thing being said,
                  the middle for the thing being shown, the narrowest for the
                  sentence that ties them.

                  `order-4` below `sm` and `order-3` from `sm` up: on a phone the
                  standfirst moves UNDER the two buttons, and on anything with
                  room it goes back between the rule and the buttons, which is
                  where a standfirst belongs.

                  That reorder is the adaptation, and it is structural rather than
                  cosmetic. The actions used to sit under this sentence, so how far
                  down the page they landed depended on how long the sentence was -
                  four lines of German on a 360px phone and three of Russian, and
                  the second button finished below the fold on both 320x568 and
                  360x640, which is where most small Androids are. Moving the
                  explanation below the action makes the claim, the rule and the
                  two buttons a fixed block whose height is the claim's own line
                  count, so the controls are clear of the fold on the smallest
                  screen this app supports and stop depending on prose length at
                  all. Above `sm` the source order is restored and the page is
                  exactly what it was.
                */}
                <p
                  className={cn(
                    'order-4',
                    'mt-8',
                    'max-w-[52ch]',
                    'text-[1.0625rem]',
                    'leading-[1.6]',
                    'text-pretty',
                    'text-caption',
                    'sm:order-3',
                    'sm:mt-6'
                  )}
                >
                  {dict.landing.standfirst}
                </p>

                <div className={cn('order-3', 'mt-9', 'sm:order-4')}>
                  <AuthButtons dict={dict} />
                </div>
              </div>

              {/* Tipped in low. The offset is 6rem, about a line and a half of
                  the claim above it, so the plate's top rule lands inside the
                  claim's block instead of above it. */}
              <div className={cn('lg:mt-24')}>
                <LandingPreview
                  preview={dict.preview}
                  giftCount={dict.giftCount}
                  members={dict.members}
                />
              </div>
            </div>

            <div
              className={cn(
                'mt-16',
                'grid',
                'gap-x-14',
                'lg:mt-28',
                'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]'
              )}
            >
              <FeatureCards features={dict.features} />
            </div>
          </div>
        </div>
      </main>
      <Footer dict={dict} />
    </div>
  );
};

export default Home;
