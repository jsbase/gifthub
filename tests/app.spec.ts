import { test, expect } from '@playwright/test';

const lang = 'en';

test.describe('Start page Functionality', () => {
  test.beforeEach(async ({ page, context }) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    await context.setDefaultNavigationTimeout(10000);
    await context.setDefaultTimeout(10000);

    try {
      await page.goto(`${baseUrl}/${lang}`, {
        waitUntil: 'networkidle',
        timeout: 10000,
      });

      await page.waitForSelector('body');
      console.log(`Test "app" started for page: ${page.url()}`);
    } catch (error) {
      console.error('Navigation Error:', error);
      throw error;
    }
  });

  test('Header and Footer are visible on the Start Page', async ({ page }) => {
    const header = page.getByTestId('header');
    const footer = page.getByTestId('footer');

    expect(await header.isVisible()).toBeTruthy();
    expect(await footer.isVisible()).toBeTruthy();

    await header.getByTestId('logo').click();
    await expect(page).toHaveURL(`/${lang}`);
  });

  test('Header and Footer are visible on Privacy page', async ({ page }) => {
    const header = page.getByTestId('header');
    const footer = page.getByTestId('footer');

    expect(await header.isVisible()).toBeTruthy();
    expect(await footer.isVisible()).toBeTruthy();

    await page.getByTestId('linkPrivacy').click();
    await expect(page).toHaveURL(`/${lang}/privacy`, { timeout: 4000 });

    expect(await header.isVisible()).toBeTruthy();
    expect(await footer.isVisible()).toBeTruthy();

    await header.getByTestId('logo').click();
    await expect(page).toHaveURL(`/${lang}`, { timeout: 4000 });
  });

  test('Header and Footer are visible on Terms & Conditions page', async ({
    page,
  }) => {
    const header = page.getByTestId('header');
    const footer = page.getByTestId('footer');

    await page.getByTestId('linkTerms').click();
    await expect(page).toHaveURL(`/${lang}/terms`, { timeout: 4000 });

    expect(await header.isVisible()).toBeTruthy();
    expect(await footer.isVisible()).toBeTruthy();

    await page.getByTestId('logo').click();
    await expect(page).toHaveURL(`/${lang}`, { timeout: 4000 });
  });
});

/*
  The footer's third link is the only part of the app's own chrome that leaves it
  for somebody else's site (`PRODUCT.md`: voluntary support, the one permitted
  neighbour of "no payment model"); the links on an idea are the readers' own
  content. Three things about it are the product, not the markup: it is worded in
  the reader's language, it goes to the page the README names and no other, and it
  cannot hand the new tab a handle back to this one.

  The expected strings are literals rather than read from the dictionaries, so a
  dictionary that drifted would disagree with this file instead of agreeing with
  itself.

  The cup is a picture and the label is the name. It is checked as text on the page
  and kept out of the accessible name, because a screen reader would otherwise say
  "hot beverage" in front of the words, and the words are what a person who cannot
  see the cup is asked to act on.
*/
const supportLabels = {
  de: 'Spendier mir einen Kaffee',
  en: 'Buy me a coffee',
  ru: 'Угости меня кофе',
} as const;

test.describe('Voluntary support link', () => {
  for (const [locale, label] of Object.entries(supportLabels)) {
    test(`the footer links to Ko-fi, worded in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}`);

      const link = page.getByTestId('footer').getByTestId('linkSupport');
      await expect(link).toHaveAccessibleName(label);
      await expect(link).toContainText('☕');
      await expect(link).toHaveAttribute('href', 'https://ko-fi.com/wishyapp');
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
      await expect(link).toHaveAttribute('rel', /\bnoreferrer\b/);
    });
  }

  for (const locale of ['de', 'ru'] as const) {
    test(`the footer still fits at 390px in ${locale}`, async ({ page }) => {
      /*
        German and Russian are the long ones, and two labels that fit side by side
        in English are the usual casualty. Measured on the footer rather than the
        document, so a page that overflows for some other reason cannot make this
        test fail - or pass - on the link's account.
      */
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/${locale}`);

      const footer = page.getByTestId('footer');
      const link = footer.getByTestId('linkSupport');
      await expect(link).toBeVisible();

      const overflow = await footer.evaluate(
        (node) => node.scrollWidth - node.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);

      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);

      /*
        Each link is a 44px target pulled back by `-my-3`, so two rows of them sit
        20px of text apart plus whatever the row gap adds. Russian is the case that
        wraps at this width: with the old 4px row gap the second row's boxes
        measured 20px over the first row's, and the support link comes later in the
        DOM, so it stacks on top of the lower edge of "Политика конфиденциальности".
        Boxes may touch, not cover each other; the 0.5px is sub-pixel layout, not
        slack.
      */
      const boxes = (
        await Promise.all(
          ['linkPrivacy', 'linkTerms', 'linkSupport'].map((id) =>
            footer.getByTestId(id).boundingBox()
          )
        )
      ).map((found) => {
        expect(found).not.toBeNull();
        return found!;
      });
      const overlap = (a: number, aSize: number, b: number, bSize: number) =>
        Math.min(a + aSize, b + bSize) - Math.max(a, b);
      for (const [i, a] of boxes.entries()) {
        for (const b of boxes.slice(i + 1)) {
          const across = overlap(a.x, a.width, b.x, b.width);
          const down = overlap(a.y, a.height, b.y, b.height);
          expect(
            across > 0.5 && down > 0.5,
            `footer links overlap by ${across.toFixed(0)}x${down.toFixed(0)}px`
          ).toBe(false);
        }
      }
    });
  }
});
