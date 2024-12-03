import { test, expect } from '@playwright/test';

const lang = 'en';

test.describe('Start page Functionality', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    test.setTimeout(30000);

    await page.goto(`${baseUrl}/${lang}`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    await page.locator('header').waitFor({ state: 'visible', timeout: 5000 });
  });

  test('Header and Footer are visible on the Start Page', async ({ page }) => {
    const header = page.locator('header');
    const footer = page.locator('footer');

    expect(await header.isVisible()).toBeTruthy();
    expect(await footer.isVisible()).toBeTruthy();

    await header.getByTestId('logo').click({ force: true });
    await expect(page).toHaveURL(`/${lang}`);
  });

  test('Header and Footer are visible on Privacy page', async ({ page }) => {
    const header = page.locator('header');
    const footer = page.locator('footer');

    expect(await header.isVisible()).toBeTruthy();
    expect(await footer.isVisible()).toBeTruthy();

    await page.evaluate(() => {
      const privacyLink = document.querySelector('[data-testid="linkPrivacy"]');
      privacyLink?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = `/${lang}/privacy`;
      });
      privacyLink?.dispatchEvent(new MouseEvent('click'));
    });

    await page.waitForURL(`/${lang}/privacy`, { timeout: 5000 });

    expect(await header.isVisible()).toBeTruthy();
    expect(await footer.isVisible()).toBeTruthy();

    await header.getByTestId('logo').click({ force: true });
    await expect(page).toHaveURL(`/${lang}`);
  });

  test('Header and Footer are visible on Terms & Conditions page', async ({ page }) => {
    const header = page.locator('header');
    const footer = page.locator('footer');

    await page.evaluate(() => {
      const termsLink = document.querySelector('[data-testid="linkTerms"]');
      termsLink?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = `/${lang}/terms`;
      });
      termsLink?.dispatchEvent(new MouseEvent('click'));
    });

    await page.waitForURL(`/${lang}/terms`, { timeout: 5000 });

    expect(await header.isVisible()).toBeTruthy();
    expect(await footer.isVisible()).toBeTruthy();

    await header.getByTestId('logo').click({ force: true });
    await expect(page).toHaveURL(`/${lang}`);
  });
});
