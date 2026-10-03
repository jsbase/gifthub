import { NextPage } from 'next';
import React from 'react';
import getDictionary from '@/app/[lang]/dictionaries';
import Header from '@/components/header';
import AuthButtons from '@/components/auth-buttons';
import Footer from '@/components/footer';
import FeatureCards from '@/components/feature-cards';
import LandingPreview from '@/components/landing-preview';
import LandingRoles from '@/components/landing-roles';
import { cn } from '@/lib/utils';
import type { PageProps, Translations } from '@/types';

/**
 * The album's cover: the claim, the two ways in, and one list of the reader's own.
 *
 * It is Persuade, not Operate, so the hierarchy is the opposite of the
 * dashboard's: the claim and the two buttons are the loudest things here and the
 * plate is evidence beside them, not a screenshot underneath them.
 *
 * **One grid, two rows, nothing centred.** Both rows are the same `7fr / 5fr`
 * split, and that shared division is the whole composition:
 *
 *   row 1  the claim fills the wide column; the plate is tipped into the narrow
 *          one, dropped 6rem so its top edge falls between the claim's first and
 *          second line. Two masses of different widths with different top edges
 *          and different left and right margins.
 *   row 2  the two roles and the three mechanisms run down the wide column and
 *          the narrow one is left as bare board.
 *
 * The eye therefore travels claim → plate → roles → mechanisms, a diagonal, instead
 * of straight down a centred axis. Nothing on the page shares a left edge with
 * anything below it, and that is the point: the previous version was a hero
 * rectangle, a three-up feature row and a second rectangle of exactly the same
 * size, all on one centre line, which is the composition every generated landing
 * page arrives at.
 *
 * One plate, not three. Row 1 used to carry the hero's plate in the narrow column
 * and row 2 a pair of the same list again in the wide one, which is what broke
 * this composition: a third rectangle below the fold did not read as a later state
 * of the same list but as a separate block, and the check on the finished one read
 * as a different list entirely. The plate is the reader's own contents page, and
 * one of it says the same thing three times would only have muddled.
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
                order this claim silently fell back to the 1.5 Tailwind's preflight
                sets on `html`, which is what a 44px paragraph inherits with no
                `leading-*` of its own, and it read as body copy rather than as a
                statement. A scan of every `cn()` call in the repo finds no
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
                  A standfirst, not a subtitle: what the product actually is, in
                  concrete terms. Deliberately narrower than the claim above it and
                  narrower than the plate beside it, so the page carries three
                  measures rather than one - the widest for the thing being said,
                  the middle for the thing being shown, the narrowest for the
                  sentence that ties them.

                  `order-4` below `sm` and `order-3` from `sm` up: on a phone the
                  standfirst moves UNDER the two buttons, and on anything with
                  room it goes back between the rule and the buttons, which is
                  where a standfirst belongs.

                  That reorder is the adaptation, and it is structural rather than
                  cosmetic. The actions used to sit under this sentence, so how far
                  down the page they landed was a function of how long the sentence
                  was - four lines of German on a 360px phone and three of Russian,
                  and the second button finished below the fold on both 320x568 and
                  360x640, which is where most small Androids are. Those numbers
                  belong to the stand before this one, and the sentence above is
                  longer than that one was (148 characters of German against 129),
                  which is exactly why the order may no longer be argued from the
                  copy: moving the explanation below the action makes the claim, the
                  rule and the two buttons a block whose height is the claim's own
                  line count, and the claim is now 58 characters of German where it
                  was 98. What that buys is that no translator can move the controls
                  by rewriting the sentence underneath them - the buttons cannot wrap
                  either, `whitespace-nowrap` and `h-12` see to that in
                  `components/ui/button.tsx`. How much room the block then clears
                  the fold by is a MEASUREMENT and is not asserted here; `DESIGN.md`
                  carries it as pending against the browser pass. Above `sm` the
                  source order is restored and the page is exactly what it was.
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
                  claim's block instead of above it. It is the only plate on the
                  page and it shows the whole `preview` dictionary: the list the
                  reader has written down and shared, at three ideas still open.
                  There is a count on this list and there is something left to tick
                  off it, which is the honest opening - a plate at zero would show
                  the check and a list with nothing left on it. */}
              <div className={cn('lg:mt-24')}>
                <LandingPreview
                  preview={dict.preview}
                  yourLists={dict.yourLists}
                  giftCount={dict.giftCount}
                  testId='landingPlate'
                  actionTestId='landingCaption'
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
              {/*
                Everything below the hero runs down the wide column and the narrow
                one stays bare board, so the spread is still two masses of different
                widths rather than a centred stack. The two are 3rem apart, the
                `mt-12` the index used to carry above its own list, and the gap is
                `gap-y-*` rather than two `mt-*` values so that dropping or adding
                a section cannot leave one behind with a margin of its own.

                Roles, mechanisms: a frame and an index. No heading above either -
                they are not sections of a kind, and the `yourLists` line the plate
                carries belongs to the illustration rather than to the document,
                which is why it is printed as a label and not as a heading. Nothing
                is lost by leaving the block unheaded either: a reader who navigates
                by heading reaches the roles and the mechanisms and sees the plate
                for the evidence it is.
              */}
              <div className={cn('flex', 'flex-col', 'gap-y-12')}>
                <LandingRoles roles={dict.landing.roles} />
                <FeatureCards features={dict.features} />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer dict={dict} />
    </div>
  );
};

export default Home;
