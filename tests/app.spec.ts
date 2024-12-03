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
    const header = page.locator('header');
    const footer = page.locator('footer');

    expect(await header.isVisible()).toBeTruthy();
    expect(await footer.isVisible()).toBeTruthy();

    await header.locator('[data-testid="logo"]').click();
    await expect(page).toHaveURL(`/${lang}`);
  });

  test('Header and Footer are visible on Privacy page', async ({ page }) => {
    const header = page.locator('header');
    const footer = page.locator('footer');

    expect(await header.isVisible()).toBeTruthy();
    expect(await footer.isVisible()).toBeTruthy();

    await footer.locator('[data-testid="linkPrivacy"]').click();
    await expect(page).toHaveURL(`${lang}/privacy`);

    expect(await header.isVisible()).toBeTruthy();
    expect(await footer.isVisible()).toBeTruthy();

    await header.locator('[data-testid="logo"]').click();
    await expect(page).toHaveURL(`/${lang}`);
  });

  test('Header and Footer are visible on Terms & Conditions page', async ({ page }) => {
    const header = page.locator('header');
    const footer = page.locator('footer');

    await footer.locator('[data-testid="linkTerms"]').click();
    await expect(page).toHaveURL(`${lang}/terms`);

    expect(await header.isVisible()).toBeTruthy();
    expect(await footer.isVisible()).toBeTruthy();

    await header.locator('[data-testid="logo"]').click();
    await expect(page).toHaveURL(`/${lang}`);
  });
});
