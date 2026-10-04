import { test, expect } from '@playwright/test';
import * as de from '@/lib/translations/de.json';
import * as en from '@/lib/translations/en.json';
import * as ru from '@/lib/translations/ru.json';
import { giftCountLabel } from '@/lib/gift-count';
import { locales } from '@/lib/i18n-config';
import type { LanguageCode, Translations } from '@/types';

/*
  The landing page: a claim, the reader's own contents page on one plate, and the
  three mechanisms.

  What this spec pins is the argument the page makes rather than its furniture.
  The claim is the product's own sentence; tipped into the narrow column beside it
  is one plate of the reader's own contents page, carrying three rows - a list
  nobody has bought from yet, one nearly done, and one finished, where the figure
  has given way to a check. Then the three mechanisms, as one index with no
  heading over the plate.

  It also pins the number of plates, which is the load-bearing claim here. The page
  once drew the same list three times over, its open count falling 3 -> 1 -> 0 until
  the figure became a check. It was rendered, looked at and rejected: three plates
  with the same head, the same list name and the same single row read as repetition
  rather than as a story, the hero's plate and the pair below it broke one
  asymmetric spread into three scattered rectangles, and the plate carrying the
  check read as a different list rather than as a later state of this one. The arc
  that once needed three plates now runs down three rows inside one of them, so
  `landingPlate` is asserted to resolve to exactly one element before anything that
  would be ambiguous if it were two.

  Four things this file deliberately does not do.

  It asserts nothing about a class. `data-testid` is this repo's e2e selector
  contract and a class list is not one: a spec that looked for `text-done` to find
  the check would break on a rename and would pass straight through a page that
  drew the check in the wrong colour. Tag names are the only other thing it
  reaches for, and only where the tag is the structure: `li` is a row because the
  plate's only list is the rows, and `svg` is the check because the crop marks in
  the plate's corners are spans.

  It writes no translated sentence down. Every string it expects is read from the
  dictionary it is testing, and the count words come from `giftCountLabel`, the
  same function the plate calls. Hand-written expectations would be a second
  dictionary, and a copy change in any of the three would leave them behind as a
  passing test asserting sentences the page no longer prints.

  It does not read the open counts out of the dictionary. `OPEN_ON_THE_PLATE` is
  this file's claim about the rows, and it is the reason the plate draws three of
  them: a spec that took the numbers from `preview.items[i].count` would agree
  with whatever the dictionary said and prove nothing. Only the total is read from
  the dictionary, and only because `giftCountLabel` has to know the sheet is not
  empty - an empty sheet says something else entirely, and a row that lost its
  `collected` count would draw a rule with nothing in it rather than looking
  broken.

  It runs in all three languages, because a German-only run of this file would not
  notice a key missing from `ru.json`, and the three dictionaries have to move
  together for reasons that have nothing to do with the browser.
*/

const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '');

const DICTIONARIES: Record<LanguageCode, Translations> = { de, en, ru };

/*
  The open count each row of the plate stands at, in row order.

  Not the dictionary's, deliberately. This is the file's claim about the plate, and
  the last count in it is the load-bearing one: `SheetProgress` replaces the figure
  with a check at zero, so a single row could not have carried all three states
  anyway - at three open it shows one state, and at zero it shows no number at all.
*/
const OPEN_ON_THE_PLATE = [3, 1, 0];

/*
  The three claims the index reads, in the order `ORDER` in
  `components/feature-cards.tsx` renders them: what the reader gets, what keeps two
  people from buying the same thing, and what the person being celebrated gets out
  of it.

  Mirrored rather than imported. `ORDER` is private to that component, and a spec
  that imported the constant could never disagree with it - and a spec that cannot
  disagree with the thing it exists to check is not checking it. `once` before
  `surprise` is the half most likely to be read the other way round, which is why
  the order is asserted as an array of titles rather than as a set.
*/
const INDEX_ORDER = ['wish', 'once', 'surprise'] as const;

for (const lang of locales) {
  /*
    Every string the landing page prints out of the dictionary has to be there in
    every language, and TypeScript cannot see it from here. The JSON modules are
    assigned to `Translations`, so a missing top-level key is a compile error in
    this file - but a key that is present and empty is only a string, `Features` is
    an index signature so a missing claim is not a compile error either, and what
    the page ends up rendering is checked at runtime or not at all.

    So this is the assertion the parametrisation exists for, and it is worth its
    own test rather than being spread across the ones that read these keys: an
    empty string satisfies every `toContainText` in the file, so a copy change that
    emptied a claim would otherwise pass the test that looks for it.
  */
  test.describe(`Landing page dictionary (${lang})`, () => {
    test('Carries every string the page prints', async () => {
      const dict = DICTIONARIES[lang];

      const printed: Array<[string, string]> = [
        ['tagline', dict.tagline],
        ['yourLists', dict.yourLists],
        ['landing.standfirst', dict.landing.standfirst],
        ['giftCount.none', dict.giftCount.none],
        ['giftCount.zero', dict.giftCount.zero],
        ['giftCount.one', dict.giftCount.one],
        ['giftCount.many', dict.giftCount.many],
      ];

      for (const [key, value] of printed) {
        expect(value, `${key} is empty in ${lang}.json`).toBeTruthy();
      }

      /*
        A claim and its explanation, for each entry of the index. This one cannot be
        left to the page: `Features` is an index signature, so a key this file names
        is not a compile error in any of the three dictionaries - it is `undefined`
        at runtime, and the entry it should head renders with nothing in it. The
        outline assertion would catch the missing heading too, but as `undefined`
        where a sentence belongs, which says nothing about which dictionary lost the
        key or that its explanation went with it.
      */
      for (const key of INDEX_ORDER) {
        const feature = dict.features[key];
        expect(
          feature.title,
          `features.${key}.title is empty in ${lang}.json`
        ).toBeTruthy();
        expect(
          feature.description,
          `features.${key}.description is empty in ${lang}.json`
        ).toBeTruthy();
      }

      /*
        Three rows, one per state, and each of them named. The count is the same
        constant the plate test counts rows with, so a dictionary holding a fourth
        entry and a page drawing three rows cannot both be right. An entry with no
        name prints a row with nothing on its left-hand side while every count
        assertion below still passes.
      */
      expect(
        dict.preview.items.length,
        `preview.items draws one row per state in ${lang}.json`
      ).toBe(OPEN_ON_THE_PLATE.length);

      for (const item of dict.preview.items) {
        expect(item.name, `preview.items names its list in ${lang}.json`)
          .toBeTruthy();
      }

      /*
        The counts themselves, 3 -> 1 -> 0 in row order, which is the whole reason
        the plate draws three rows. Asserted against `OPEN_ON_THE_PLATE` rather
        than read back out of the dictionary: a `ru.json` reading 5, 2, 1 would
        satisfy every count on the page, because the words and the numerals would
        both be right - only the story would be gone, and a plate of three unrelated
        lists is a worse advertisement than one row.
      */
      expect(
        dict.preview.items.map((item) => item.count),
        `preview.items reads ${OPEN_ON_THE_PLATE.join('->')} in ${lang}.json`
      ).toEqual(OPEN_ON_THE_PLATE);

      /*
        The count words have to read differently in this language, or the numbers
        on the plate are invisible in it: a `ru.json` whose `one` and `many` said
        the same words would satisfy every expectation below while the reader
        watched a numeral they could not place against its sentence.

        Both come off the first row's own total, so the only thing that differs is
        the open count - which is the thing `giftCountLabel` reads - and rows one
        and two of the plate are the rows standing at 3 and at 1.
      */
      const firstTotal =
        dict.preview.items[0].count + dict.preview.items[0].collected;
      const [mostOpen, oneOpen] = OPEN_ON_THE_PLATE;
      expect(
        new Set([
          giftCountLabel({ unbought: oneOpen, total: firstTotal }, dict),
          giftCountLabel({ unbought: mostOpen, total: firstTotal }, dict),
        ]).size,
        `${mostOpen} and ${oneOpen} must read differently in ${lang}.json`
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
        here rather than driven through the header, because the switcher itself is
        what `tests/language-switcher.spec.ts` is for - re-opening a dropdown in
        every test of this file would test the switcher again and multiply the
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
      unscoped locator would also be satisfied by a claim that had been printed in
      the footer or by the wordmark, and this page's whole argument is where the
      claim stands. `toHaveCount(1)` beside the visibility check is the half of
      "printed once" that `toBeVisible` cannot see - a claim printed twice, once
      above the fold and once at the foot of it, reads as two claims and would pass
      a presence check on either.
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
      One plate, and one row per state.

      Each row is checked against its own entry rather than the plate as a whole,
      because three names on one plate is also what a plate with the rows permuted
      prints, and the order is half of what the plate claims. `getByText` with
      `exact` resolves to the innermost element carrying the text - the name sits in
      a span inside a span - so one match in a row is the name and nothing else.

      `toHaveCount(1)` on the plate comes first, before anything that would be
      ambiguous if it were two: a second plate would resolve every locator below to
      two elements, and one reaching for `.first()` would be asserting about a plate
      it had not chosen. That is what the storyboard's return would look like.
    */
    test('There is one plate, and it draws one row per state', async ({
      page,
    }) => {
      const dict = DICTIONARIES[lang];

      const plate = page.getByTestId('landingPlate');
      await expect(plate).toHaveCount(1);
      await expect(plate).toBeVisible();

      const rows = plate.getByTestId('landingPlateRow');
      await expect(rows, 'the plate draws one row per state').toHaveCount(
        OPEN_ON_THE_PLATE.length
      );

      for (const [index, item] of dict.preview.items.entries()) {
        await expect(
          rows.nth(index).getByText(item.name, { exact: true }),
          `row ${index + 1} names ${item.name}`
        ).toHaveCount(1);
      }
    });

    /*
      Three states on one plate, read three ways.

      Every row carries the same three facts about itself and they can fail apart:
      the count words, which are what a screen reader announces and the only form of
      the number a person can read aloud; the numeral, which is the same fact in
      printed type; and, on the finished row only, the check. An assertion on the
      words alone would pass on a row printing the right sentence beside the wrong
      number, and one on the numeral alone would pass on a row whose words had been
      another count's.

      The row count is asserted again here because `rows.nth(2)` against a two-row
      plate resolves to nothing at all, and "the last row carries no check" would
      then be true for the wrong reason.

      The numerals are read out of the row's own text with the count words taken
      out, rather than through a locator on the figure: the figure sits in a span
      inside `SheetProgress` with nothing of its own to name it by, and what is
      left over is the numeral alone - no name in any of the three dictionaries
      carries a digit, which is what makes "the only number on this row" a claim
      rather than a coincidence.
    */
    test('The three rows stand at three open, one open and done', async ({
      page,
    }) => {
      const dict = DICTIONARIES[lang];
      const plate = page.getByTestId('landingPlate');

      const rows = plate.getByTestId('landingPlateRow');
      await expect(rows).toHaveCount(OPEN_ON_THE_PLATE.length);

      for (const [index, unbought] of OPEN_ON_THE_PLATE.entries()) {
        const item = dict.preview.items[index];
        const words = giftCountLabel(
          { unbought, total: item.count + item.collected },
          dict
        );

        const text = (await rows.nth(index).textContent()) ?? '';
        expect(text, `row ${index + 1} must say its own open count`).toContain(
          words
        );

        const figure = text.split(words).join('');

        if (unbought > 0) {
          expect(
            figure.match(/\d+/g),
            `row ${index + 1} prints ${unbought} and nothing else`
          ).toEqual([String(unbought)]);
        } else {
          /*
            The check stands where the numeral was, so the finished row prints no
            number at all. `SheetProgress` treats "nothing left" as a conclusion
            rather than as a quantity, and a row showing a 0 beside its check would
            be two claims about one list where the app everywhere else makes one.

            `toBeNull`, not `toEqual([])`: a global regex that matches nothing
            returns `null` and not an empty array, so `toEqual([])` would fail on
            a row that is exactly right. The first run of this suite is what found
            it out, in all three locales at once.
          */
          expect(
            figure.match(/\d+/g),
            'the finished row prints no numeral at all'
          ).toBeNull();
        }
      }

/*
        The check, and the row it stands on.

        The check is named by its own `data-testid` rather than by `svg`, which is
        what the corner crop marks would have needed - they are spans, so the check
        used to be the only SVG inside `landingPlate`, and "the only SVG" was standing
        in for "the check". A name on the glyph itself is the claim; a leftover of the
        markup around it is not.

        The rows come first because a count of one on the plate cannot tell a check
        in the last row from a check in the first, and the plate's own total comes
        last because that is the half which says how many: the row counts say which
        row, the plate count says there is no second one anywhere on it. Both are
        asserted because each fails alone.

        The last row is `OPEN_ON_THE_PLATE`'s last entry - the zero - so this is the
        check standing on the finished list whichever row the dictionary puts it in,
        and a reordered `items` fails here.
      */
      await expect(
        rows.nth(OPEN_ON_THE_PLATE.length - 1).getByTestId('sheetProgressCheck'),
        'the finished row carries the check'
      ).toHaveCount(1);

      for (const [index, open] of OPEN_ON_THE_PLATE.slice(0, -1).entries()) {
        await expect(
          rows.nth(index).getByTestId('sheetProgressCheck'),
          `row ${index + 1} stands at ${open} and carries no check`
        ).toHaveCount(0);
      }

      await expect(
        plate.getByTestId('sheetProgressCheck'),
        'the plate carries exactly one check'
      ).toHaveCount(1);
    });

    /*
      The index: three mechanisms, one reading order, and the outline they are the
      whole of.

      The level-2 outline is asserted at once, because the index is not a separate
      region - `FeatureCards` has no `data-testid` of its own. The `h1` is the
      wordmark in the header, and the claim beside the plate is a `<p>`, so this
      page is one name plus three mechanisms and nothing else. That is not
      decoration: an `<h2>` the page does not need is a section a reader
      navigating by heading would arrive at and find nothing under.

      `INDEX_ORDER` mirrors `ORDER` in `feature-cards.tsx` and is a reading order
      rather than a whitelist - a claim added to a dictionary still renders, after
      these three, in dictionary order. So a fourth entry is not automatically a
      defect; this is where that decision gets taken, and a new claim that belongs
      in the index has to be added here too.
    */
    test('The index has three entries, in one order, each explained', async ({
      page,
    }) => {
      const dict = DICTIONARIES[lang];
      const main = page.getByRole('main');

      await expect(
        page.getByRole('heading', { level: 1 }),
        'the wordmark is the one h1 on the page'
      ).toHaveCount(1);

      await expect(main.getByRole('heading', { level: 2 })).toHaveText(
        INDEX_ORDER.map((key) => dict.features[key].title)
      );

      // An entry is a claim and its explanation; the heading alone would not
      // notice one that had lost the second half.
      for (const key of INDEX_ORDER) {
        await expect(
          main.getByText(dict.features[key].description, { exact: true })
        ).toBeVisible();
      }

      /*
        The plate's section line, as a paragraph and not as a fourth heading. It is
        a quotation of the contents page's own label rather than a section of this
        page, so a head here would claim a document section where there is a
        specimen - and the heading count above is what tells you it happened, this
        is what tells you what did.
      */
      const sectionLine = main.getByText(dict.yourLists, { exact: true });
      await expect(sectionLine).toHaveJSProperty('tagName', 'P');
    });
  });
}