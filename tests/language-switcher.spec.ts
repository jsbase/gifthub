import { test, expect } from '@playwright/test';
import { languages } from '@/lib/i18n-config';

test.describe('Switch language', () => {
  test.beforeEach(async ({ page, context }) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    await context.setDefaultNavigationTimeout(10000);
    await context.setDefaultTimeout(10000);

    try {
      await page.goto(`${baseUrl}`, {
        waitUntil: 'networkidle',
        timeout: 10000,
      });

      await page.waitForSelector('body');
      console.log(`Test "language-switcher" started for page: ${page.url()}`);
    } catch (error) {
      console.error('Navigation Error:', error);
      throw error;
    }
  });

  test('Renders the current language flag correctly', async ({ page }) => {
    const languageSwitcherButton = await page.getByTestId('language-switcher');
    expect(languageSwitcherButton).toBeTruthy();
  });

  test('Opens language dropdown menu', async ({ page }) => {
    const languageSwitcherButton = await page.getByTestId('language-switcher');
    await languageSwitcherButton.click();

    for (const lang of Object.values(languages)) {
      const languageOption = await page.getByRole('menuitem', {
        name: lang.name,
      });
      expect(languageOption).toBeTruthy();
    }
  });

  test('Switches language successfully', async ({ page }) => {
    const targetLanguage = Object.values(languages).find(
      (lang) => lang.code !== 'de'
    );
    if (!targetLanguage) {
      throw new Error('No alternative language found');
    }

    const languageSwitcherButton = await page.getByTestId('language-switcher');
    await languageSwitcherButton.click();

    const switchPromise = page
      .getByRole('menuitem', { name: targetLanguage.name })
      .click();
    await switchPromise;

    const cookies = await page.context().cookies();
    const localeCookie = cookies.find(
      (cookie) =>
        cookie.name === 'NEXT_LOCALE' && cookie.value === targetLanguage.code
    );
    expect(localeCookie).toBeTruthy();
  });

  test('Shows loading spinner during language switch when logged in', async ({
    page,
  }) => {
    await page.goto('/');

    const loginButton = page.getByTestId('OpenLogin');
    await loginButton.click();

    await page.fill('#groupName', 'testgroup');
    await page.fill('#password', 'test123');

    const submitButton = page.getByRole('button', { name: 'SubmitLogin' });
    await submitButton.click();

    await page.waitForNavigation();

    await page.route('**/actions', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      return route.fulfill({
        status: 200,
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const languageSwitcherButton = await page.getByTestId('language-switcher');
    await languageSwitcherButton.click();

    const targetLanguage = Object.values(languages).find(
      (lang) => lang.code !== 'de'
    );

    if (!targetLanguage) {
      throw new Error('No alternative language found');
    }

    const spinner = await page.getByTestId('loadingSpinner');
    expect(spinner).toBeTruthy();

    const switchPromise = page
      .getByRole('menuitem', { name: targetLanguage.name })
      .click();
    await switchPromise;

    await page.getByTestId('loadingSpinner');
  });
});
