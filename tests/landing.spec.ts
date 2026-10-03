import { test, expect } from '@playwright/test';
import * as de from '@/lib/translations/de.json';
import * as en from '@/lib/translations/en.json';
import * as ru from '@/lib/translations/ru.json';
import { giftCountLabel } from '@/lib/gift-count';
import { locales } from '@/lib/i18n-config';
import type { LanguageCode, Translations } from '@/types';

/*
  The landing page: a claim, and one list watched three times.

  What this spec pins is the argument the page makes rather than its furniture.
  The claim is the product's own sentence; tipped into the narrow column beside
  it is one plate of the reader's own contents page; below that the same list
  three times over, its open count falling 3 -> 1 -> 0 until the figure becomes
  a check. Then the two roles and the three mechanisms, as one index with no
  lead above it and no heading over the picture.

  Four things this file deliberately does not do.

  It asserts nothing about a class. `data-testid` is this repo's e2e selector
  contract and a class list is not one: a spec that looked for `text-done` to
  find the check would break on a rename and would pass straight through a page
  that drew the check in the wrong colour.

  It writes no translated sentence down. Every string it expects is read from
  the dictionary it is testing, and the count words come from `giftCountLabel`,
  the same function the plate calls. Six hand-written expectations would be a
  second dictionary, and a copy change in any of the three would leave them
  behind as a passing test asserting sentences the page no longer prints.

  It does not read the fall out of the dictionary. 3, 1 and 0 are this file's
  claim about the story: a spec that took the counts from `preview.states` would
  agree with whatever the dictionary said and prove nothing about an arc that no
  longer falls. Only the total is read from the dictionary, and only because
  `giftCountLabel` has to know the sheet is not empty - an empty sheet says
  something else entirely, and a state that lost its `collected` count would
  otherwise read as a fourth state rather than as a broken one.

  It runs in all three languages, because a German-only run of this file would
  not notice a key missing from `ru.json`, and the three dictionaries have to
  move together for reasons that have nothing to do with the browser.
*/

const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '');

const DICTIONARIES: Record<LanguageCode, Translations> = { de, en, ru };

/*
  The arc, as the page numbers its plates.

  `position` is the number in `landingState1|2|3` and `landingAction1|2|3`, and
  the dictionary index is one below it: the hero owns `preview.states[0]` and the
  page counts from one, so a spec that walked the dictionary instead of reading
  the ids would look for `landingState0` and find nothing.

  Both columns are this file's, not the dictionary's. That is what makes the
  second one an assertion.
*/
const THE_ARC = [
  { position: 1, open: 3 },
  { position: 2, open: 1 },
  { position: 3, open: 0 },
];

/**
 * The count words the plate at `position` has to print, in this dictionary's
 * words, for an open count of `open`.
 */
const countWords = (
  dict: Translations,
  position: number,
  open: number
): string => {
  const item = dict.preview.states[position - 1].items[0];
  return giftCountLabel(
    { unbought: open, total: item.count + item.collected },
    dict
  );
};

/*
  The check is the one thing on this page with no id and no string of its own:
  `SheetProgress` draws it as an icon and hides the figure behind it, and there is
  nothing to assert against but the number of pictures in the plate. The four crop
  marks are spans, not SVGs, so a plate with something bought from it has no SVG
  in it at all and the finished one has exactly one.

  Counting pictures rather than looking for the numeral is what makes the two
  halves of the claim separable: "zero left" is also printed as a numeral
  elsewhere, and an assertion on the numeral would pass on a page that replaced
  it with a picture and on one that printed it, which are the same picture and
  its opposite.
*/
const checksIn = (plate: ReturnType<typeof plateLocator>) =>
  plate.locator('svg');

/** The plate the page numbers `position`, as its own `data-testid` names it. */
const plateLocator = (
  page: import('@playwright/test').Page,
  position: number
) => page.getByTestId(`landingState${position}`);

for (const lang of locales) {
  /*
    Every string the landing page prints out of the dictionary has to be there
    in every language, and the states have to be three. TypeScript cannot see
    either: `app/[lang]/dictionaries.ts` casts each JSON module to `Translations`
    with `as` rather than checking it against the interface, and an array of two
    states is a perfectly well-typed array of two states.

    So this is the assertion the parametrisation exists for, and it is worth its
    own test rather than being spread across the ones that read these keys: an
    empty string satisfies every `toContainText` in the file, so a copy change
    that emptied a claim would otherwise pass the test that looks for it.
  */
  test.describe(`Landing page dictionary (${lang})`, () => {
    test('Carries every string the page prints, and three states', async () => {
      const dict = DICTIONARIES[lang];

      const printed: Array<[string, string]> = [
        ['tagline', dict.tagline],
        ['yourLists', dict.yourLists],
        ['landing.standfirst', dict.landing.standfirst],
        ['landing.roles.owner.title', dict.landing.roles.owner.title],
        [
          'landing.roles.owner.description',
          dict.landing.roles.owner.description,
        ],
        ['landing.roles.buyer.title', dict.landing.roles.buyer.title],
        [
          'landing.roles.buyer.description',
          dict.landing.roles.buyer.description,
        ],
        ['features.simple.title', dict.features.simple.title],
        ['features.simple.description', dict.features.simple.description],
        ['features.tracking.title', dict.features.tracking.title],
        ['features.tracking.description', dict.features.tracking.description],
        ['features.updates.title', dict.features.updates.title],
        ['features.updates.description', dict.features.updates.description],
        ['giftCount.none', dict.giftCount.none],
        ['giftCount.zero', dict.giftCount.zero],
        ['giftCount.one', dict.giftCount.one],
        ['giftCount.many', dict.giftCount.many],
      ];

      for (const [key, value] of printed) {
        expect(value, `${key} is empty in ${lang}.json`).toBeTruthy();
      }

      /*
        Three, because the story is three states of one list and the hero owns
        the first. Two would leave the pair below the hero with one plate and no
        finished one; four would render a fourth state the page never promised to
        show. Either is a dictionary that has to be argued about rather than a
        page that reflowed.
      */
      expect(
        dict.preview.states.length,
        `preview.states must hold three states in ${lang}.json`
      ).toBe(THE_ARC.length);

      for (const [index, state] of dict.preview.states.entries()) {
        expect(
          state.action,
          `preview.states[${index}].action is empty in ${lang}.json`
        ).toBeTruthy();
        expect(
          state.items.length,
          `state ${index + 1} draws one row in ${lang}.json`
        ).toBeGreaterThan(0);
        expect(
          state.items[0].name,
          `state ${index + 1} names its list in ${lang}.json`
        ).toBeTruthy();
      }
    });
  });

  test.describe(`Landing page (${lang})`, () => {
    test.beforeEach(async ({ page, context }) => {
      await context.setDefaultNavigationTimeout(10000);
      await context.setDefaultTimeout(10000);

      /*
        The locale, set the two ways the app sets it: `NEXT_LOCALE` is the cookie
        `components/language-switcher.tsx` writes and `proxy.ts` reads, and the
        segment is where that component's `router.push` lands. Both are written
        here rather than driven through the header, because the switcher itself
        is what `tests/language-switcher.spec.ts` is for - re-opening a dropdown
        in every test of this file would test the switcher again and multiply the
        wait, and the wait is where this page's flakiness would come from.

        Each test gets its own context, so the cookie is scoped to the one test
        that wrote it. Nothing here can reach the next locale's run, and no test
        depends on the order they happen to be collected in.
      */
      await context.addCookies([
        { name: 'NEXT_LOCALE', value: lang, url: BASE_URL },
      ]);

      try {
        await page.goto(`${BASE_URL}/${lang}`, {
          waitUntil: 'networkidle',
          timeout: 10000,
        });

        await page.waitForSelector('body');
      } catch (error) {
        console.error('Navigation Error:', error);
        throw error;
      }
    });

    /*
      The claim and the sentence that explains it.

      Scoped to `main` on purpose: both strings are unique on the page, so an
      unscoped locator would also be satisfied by a claim that had been printed
      in the footer or by the wordmark, and this page's whole argument is where
      the claim stands. `toHaveCount(1)` beside the visibility check is the half
      of "printed once" that `toBeVisible` cannot see - a claim printed twice, once
      above the fold and once at the foot of it, reads as two claims and would
      pass a presence check on either.
    */
    test('The claim and the sentence under it are printed once each', async ({
      page,
    }) => {
      const dict = DICTIONARIES[lang];
      const main = page.getByRole('main');

      const claim = main.getByText(dict.tagline, { exact: true });
      await expect(claim).toHaveCount(1);
      await expect(claim).toBeVisible();

      const standfirst = main.getByText(dict.landing.standfirst, {
        exact: true,
      });
      await expect(standfirst).toHaveCount(1);
      await expect(standfirst).toBeVisible();
    });

    /*
      One list, watched three times.

      Each plate is checked three ways, because each of the three can fail on its
      own. The count words behind the figure are what a screen reader announces
      and the only form of the count a person can read aloud; the figure is the
      same fact in printed type; and the check is the moment the count stops being
      a quantity. An assertion on the words alone would pass on a plate that
      printed the right sentence and the wrong number beside it.

      The figure is read as the plate's own text with the count words taken out,
      rather than through a locator on the number: the number sits in a `<span>`
      inside a flex row with no id of its own, and every way of naming that span
      means naming a class or guessing at its position in the markup.
    */
    test(
      'The open count falls 3, 1, 0, and only the last plate carries the check',
      async ({ page }) => {
        const dict = DICTIONARIES[lang];

        /*
          The three counts have to read differently in this language, or the fall
          this test exists to pin is invisible in it: a `ru.json` whose `one` and
          `many` said the same words would satisfy every expectation below while
          the reader watched three plates claim three.
        */
        const words = THE_ARC.map(({ position, open }) =>
          countWords(dict, position, open)
        );
        expect(
          new Set(words).size,
          `3, 1 and 0 must read differently in ${lang}.json`
        ).toBe(THE_ARC.length);

        for (const [index, { position, open }] of THE_ARC.entries()) {
          const plate = plateLocator(page, position);
          await expect(plate).toBeVisible();

          const text = (await plate.textContent()) ?? '';
          expect(text, `plate ${position} must say its open count`).toContain(
            words[index]
          );

          const figure = text.split(words[index]).join('');
          if (open === 0) {
            /*
              Zero is a conclusion rather than a quantity, so at zero the figure
              is gone and a check stands in its place. What is asserted absent here
              is the numeral, and what says it is gone on purpose is the check
              below: either half alone would pass on the other half's failure.
            */
            expect(
              figure,
              `plate ${position} has nothing left, so it prints no figure`
            ).not.toContain('0');
          } else {
            expect(
              figure,
              `plate ${position} prints ${open} beside the count words`
            ).toContain(String(open));
          }

          await expect(
            checksIn(plate),
            'only the plate with nothing left carries the check'
          ).toHaveCount(open === 0 ? 1 : 0);
        }
      }
    );

    /*
      Three plates of the same anatomy stand on this page, and their ids are how
      a spec tells them apart - so `landingState1` printed twice is a real defect
      rather than a cosmetic one: an assertion on the hero's plate would resolve
      to two elements, and a spec that reached for `.first()` would be asserting
      about a plate it had not chosen. The number of the plates is therefore
      asserted on its own, before anything that would be ambiguous if it were
      wrong.
    */
    test('The hero owns the first plate and the storyboard the pair', async ({
      page,
    }) => {
      await expect(page.getByTestId('landingState1')).toHaveCount(1);

      const storyboard = page.getByTestId('landingStory');
      await expect(storyboard).toBeVisible();

      /*
        Everything the hero does not own: two plates today, and a fourth state
        would arrive here as a third plate in the pair rather than as a fourth row
        of the page, which is what `FIRST_AFTER_THE_HERO` is for.
      */
      for (const { position } of THE_ARC.slice(1)) {
        await expect(
          storyboard.getByTestId(`landingState${position}`)
        ).toHaveCount(1);
      }

      // And the hero's plate is not one of them.
      await expect(storyboard.getByTestId('landingState1')).toHaveCount(0);
    });

    /*
      What has happened to the list, under the plate it happened to, in the
      dictionary's own words.

      Asserted against each state rather than against the three at once, because
      one caption shared by all three plates would pass a test that only counted
      them, and a caption printed in the wrong order would pass one that only
      checked that all three are somewhere on the page.
    */
    test('Each plate carries the caption for its own state', async ({
      page,
    }) => {
      const dict = DICTIONARIES[lang];

      for (const { position } of THE_ARC) {
        await expect(page.getByTestId(`landingAction${position}`)).toHaveText(
          dict.preview.states[position - 1].action
        );
      }
    });

    /*
      The two roles, in the order the product names them.

      `ROLE_ORDER` in `landing-roles.tsx` is a constant rather than `Object.keys`
      because the order a JSON object happens to be written in is not a
      translation's to decide, and the array below is how that decision is held:
      swap the two and this fails.
    */
    test('Both roles are there, with their explanation', async ({ page }) => {
      const dict = DICTIONARIES[lang];
      const roles = page.getByTestId('landingRoles');

      await expect(roles).toBeVisible();
      await expect(roles.getByRole('heading', { level: 2 })).toHaveText([
        dict.landing.roles.owner.title,
        dict.landing.roles.buyer.title,
      ]);

      await expect(roles).toContainText(dict.landing.roles.owner.description);
      await expect(roles).toContainText(dict.landing.roles.buyer.description);
    });

    /*
      The index: three mechanisms, one reading order, and no lead.

      The whole page's level-2 outline is asserted at once, because the index is
      not a separate region - `FeatureCards` has no `data-testid` of its own, and
      the two roles are entries of the same kind. Two things fall out of the one
      list: a fourth entry would be the lead this index used to carry above the
      other three, which read as a headline of its own rather than as one of
      three, and the three plates would grow four more headings if their
      `yourLists` label ever went back to being an `<h2>` instead of a label.

      `ORDER` in `feature-cards.tsx` is the reading order, and it is a reading
      order rather than a whitelist - a claim added to a dictionary still renders,
      after these three, in dictionary order. So a fourth entry is not
      automatically a defect; this is where that decision gets taken, and a new
      claim that belongs in the index has to be added here too.
    */
    test('The index has three entries, in one order, and no lead', async ({
      page,
    }) => {
      const dict = DICTIONARIES[lang];

      await expect(
        page.getByRole('main').getByRole('heading', { level: 2 })
      ).toHaveText([
        dict.landing.roles.owner.title,
        dict.landing.roles.buyer.title,
        dict.features.simple.title,
        dict.features.tracking.title,
        dict.features.updates.title,
      ]);

      // An entry is a claim and its explanation; the heading alone would not
      // notice one that had lost the second half.
      for (const key of ['simple', 'tracking', 'updates'] as const) {
        await expect(
          page.getByText(dict.features[key].description, { exact: true })
        ).toBeVisible();
      }
    });
  });
}