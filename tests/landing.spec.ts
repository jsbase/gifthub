import { test, expect } from '@playwright/test';
import * as de from '@/lib/translations/de.json';
import * as en from '@/lib/translations/en.json';
import * as ru from '@/lib/translations/ru.json';
import { giftCountLabel } from '@/lib/gift-count';
import { locales } from '@/lib/i18n-config';
import type { LanguageCode, Translations } from '@/types';

/*
  The landing page: a claim, one list of the reader's own, and the three
  mechanisms.

  What this spec pins is the argument the page makes rather than its furniture.
  The claim is the product's own sentence; tipped into the narrow column beside it
  is one plate of the reader's own contents page, with a single row at three ideas
  still open and a caption under it saying what happened. Then the three
  mechanisms, as one index with no heading over the plate.

  It also pins the number of plates, which is the load-bearing claim here. The page
  once drew the same list three times over, its open count falling 3 -> 1 -> 0
  until the figure became a check. It was rendered, looked at and rejected: three
  plates with the same head, the same list name and the same one row read as
  repetition rather than as a story, the hero's plate and the pair below it broke
  one asymmetric spread into three scattered rectangles, and the plate carrying the
  check read as a different list rather than as a later state of this one. So
  `landingPlate` is asserted to resolve to exactly one element, on its own, before
  anything that would be ambiguous if it were two.

  Four things this file deliberately does not do.

  It asserts nothing about a class. `data-testid` is this repo's e2e selector
  contract and a class list is not one: a spec that looked for `text-done` to
  find the check would break on a rename and would pass straight through a page
  that drew the check in the wrong colour.

  It writes no translated sentence down. Every string it expects is read from
  the dictionary it is testing, and the count words come from `giftCountLabel`,
  the same function the plate calls. Hand-written expectations would be a second
  dictionary, and a copy change in any of the three would leave them behind as a
  passing test asserting sentences the page no longer prints.

  It does not read the open count out of the dictionary. 3 is this file's claim
  about the plate: a spec that took the number from `preview.items[0].count` would
  agree with whatever the dictionary said and prove nothing. Only the total is
  read from the dictionary, and only because `giftCountLabel` has to know the sheet
  is not empty - an empty sheet says something else entirely, and a row that lost
  its `collected` count would otherwise read as a plate with nothing to fill the
  progress rule rather than as a broken one.

  It runs in all three languages, because a German-only run of this file would
  not notice a key missing from `ru.json`, and the three dictionaries have to
  move together for reasons that have nothing to do with the browser.
*/

const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '');

const DICTIONARIES: Record<LanguageCode, Translations> = { de, en, ru };

/*
  The open count the one plate stands at.

  Not the dictionary's, deliberately: this is the file's claim about the plate,
  and a plate at zero would print a check instead of a number, which is a
  different picture rather than a different value.
*/
const OPEN_ON_THE_PLATE = 3;

for (const lang of locales) {
  /*
    Every string the landing page prints out of the dictionary has to be there
    in every language. TypeScript cannot see it: `app/[lang]/dictionaries.ts`
    casts each JSON module to `Translations` with `as` rather than checking it
    against the interface, so a missing key is invisible to `npx tsc` and only
    shows up as an empty string on the page.

    So this is the assertion the parametrisation exists for, and it is worth its
    own test rather than being spread across the ones that read these keys: an
    empty string satisfies every `toContainText` in the file, so a copy change
    that emptied a claim would otherwise pass the test that looks for it.
  */
  test.describe(`Landing page dictionary (${lang})`, () => {
    test('Carries every string the page prints', async () => {
      const dict = DICTIONARIES[lang];

      const printed: Array<[string, string]> = [
        ['tagline', dict.tagline],
        ['yourLists', dict.yourLists],
        ['landing.standfirst', dict.landing.standfirst],
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

      expect(
        dict.preview.action,
        `preview.action is empty in ${lang}.json`
      ).toBeTruthy();

      /*
        One row, and a named one. The plate is a specimen of a contents page, so
        `items` is a list rather than a single row - but a second row would put a
        second list on a page whose plate exists to show one list in one state, and
        a row with no name would print a plate with nothing on its left-hand side
        while every assertion below still passed.
      */
      expect(
        dict.preview.items.length,
        `preview.items draws one row in ${lang}.json`
      ).toBe(1);
      expect(
        dict.preview.items[0].name,
        `preview.items[0] names its list in ${lang}.json`
      ).toBeTruthy();

      /*
        The count words have to read differently in this language, or the number
        on the plate is invisible in it: a `ru.json` whose `one` and `many` said
        the same words would satisfy every expectation below while the reader
        watched a numeral they could not place against its sentence.

        Both come off this row's own total, so the only thing that differs is the
        open count - which is the thing `giftCountLabel` reads.
      */
      const item = dict.preview.items[0];
      const total = item.count + item.collected;
      expect(
        new Set([
          giftCountLabel({ unbought: 1, total }, dict),
          giftCountLabel({ unbought: OPEN_ON_THE_PLATE, total }, dict),
        ]).size,
        `1 and ${OPEN_ON_THE_PLATE} must read differently in ${lang}.json`
      ).toBe(2);
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
      One plate, and it stands at three open.

      The count is checked three ways because each can fail on its own: the count
      words behind the figure are what a screen reader announces and the only form
      of the number a person can read aloud; the figure is the same fact in
      printed type; and the absence of a check is the half that says the plate is
      not a finished list. An assertion on the words alone would pass on a plate
      that printed the right sentence and the wrong number beside it, and an
      assertion on the number alone would pass on a plate whose words had been
      another count's.

      `toHaveCount(1)` is on its own here, before anything that would be ambiguous
      if it were two: a second plate would resolve every locator below to two
      elements, and one reaching for `.first()` would be asserting about a plate it
      had not chosen. That is what the storyboard's return would look like.

      The figure is read as the plate's own text with the count words taken out,
      rather than through a locator on the number: the number sits in a `<span>`
      inside a flex row with no id of its own, and every way of naming that span
      means naming a class or guessing at its position in the markup.
    */
    test('There is one plate, and it stands at three open', async ({
      page,
    }) => {
      const dict = DICTIONARIES[lang];
      const item = dict.preview.items[0];

      const words = giftCountLabel(
        { unbought: OPEN_ON_THE_PLATE, total: item.count + item.collected },
        dict
      );

      const plate = page.getByTestId('landingPlate');
      await expect(plate).toHaveCount(1);
      await expect(plate).toBeVisible();

      const text = (await plate.textContent()) ?? '';
      expect(text, 'the plate must say its open count').toContain(words);
      expect(
        text.split(words).join(''),
        `the plate prints ${OPEN_ON_THE_PLATE} beside the count words`
      ).toContain(String(OPEN_ON_THE_PLATE));

      /*
        The crop marks are spans rather than SVGs, so a plate with something
        bought from it has no SVG in it at all, and a check would be exactly one.
        This is the assertion that the plate is the open list and not the finished
        one: the plate that carried the check is gone, and a page that kept drawing
        it here would be claiming the list was done.
      */
      await expect(
        plate.locator('svg'),
        'a plate with three open carries no check'
      ).toHaveCount(0);
    });

    /*
      What has happened to the list, under the plate it happened to, in the
      dictionary's own words.

      `toHaveCount(1)` beside `toHaveText`, because the caption is the one piece
      of prose this page writes and a second copy of it anywhere would be a
      sentence the reader has to reconcile. `toHaveText` is the form that pins the
      sentence rather than its existence.
    */
    test('The plate carries one caption, and it is its own', async ({
      page,
    }) => {
      const caption = page.getByTestId('landingCaption');

      await expect(caption).toHaveCount(1);
      await expect(caption).toHaveText(DICTIONARIES[lang].preview.action);
    });

    /*
      The index: three mechanisms and one reading order.

      The whole page's level-2 outline is asserted at once, because the index is
      not a separate region - `FeatureCards` has no `data-testid` of its own. One
      thing falls out of the one list: the plate would add a fourth heading if its
      `yourLists` label ever went back to being an `<h2>` instead of a label - a
      plate is a quotation of the contents page, and this page has no section for a
      head to open.

      `ORDER` in `feature-cards.tsx` is the reading order, and it is a reading
      order rather than a whitelist - a claim added to a dictionary still renders,
      after these three, in dictionary order. So a fourth entry is not
      automatically a defect; this is where that decision gets taken, and a new
      claim that belongs in the index has to be added here too.
    */
    test('The index has three entries, in one order', async ({ page }) => {
      const dict = DICTIONARIES[lang];

      await expect(
        page.getByRole('main').getByRole('heading', { level: 2 })
      ).toHaveText([
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