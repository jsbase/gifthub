import { test, expect } from '@playwright/test';
import { languages } from '@/lib/i18n-config';

test.describe('LanguageSwitcher Component', () => {
  test.beforeEach(async ({ page, context }) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    await context.setDefaultNavigationTimeout(20000);
    await context.setDefaultTimeout(20000);

    // Optionally log network requests for debugging
    await page.route('**', (route) => {
      console.log('NEXT_PUBLIC_BASE_URL:', baseUrl);
      console.log('Network Request:', route.request().url());
      return route.continue();
    });

    try {
      await page.goto(`${baseUrl}`, {
        waitUntil: 'networkidle',
        timeout: 20000,
      });

      await page.waitForSelector('body');
      console.log('Current URL after navigation:', page.url());
    } catch (error) {
      console.error('Navigation Error:', error);
      throw error;
    }
  });

  test('renders the current language flag correctly', async ({ page }) => {
    await page.waitForSelector('[data-testid="language-switcher"]', { state: 'visible', timeout: 20000 });
    const languageSwitcherButton = await page.getByTestId('language-switcher');
    expect(languageSwitcherButton).toBeTruthy();
  });

  test('opens language dropdown menu', async ({ page }) => {
    await page.waitForSelector('[data-testid="language-switcher"]', { state: 'visible', timeout: 20000 });
    const languageSwitcherButton = await page.getByTestId('language-switcher');
    await languageSwitcherButton.click();

    for (const lang of Object.values(languages)) {
      const languageOption = await page.getByRole('menuitem', {
        name: lang.name
      });
      expect(languageOption).toBeTruthy();
    }
  });

  test('switches language successfully', async ({ page }) => {
    const targetLanguage = Object.values(languages).find(lang => lang.code !== 'de');
    if (!targetLanguage) {
      throw new Error('No alternative language found');
    }

    await page.waitForSelector('[data-testid="language-switcher"]', { state: 'visible', timeout: 20000 });
    const languageSwitcherButton = await page.getByTestId('language-switcher');
    await languageSwitcherButton.click();

    const switchPromise = page.getByRole('menuitem', { name: targetLanguage.name }).click();
    await switchPromise;

    const cookies = await page.context().cookies();
    const localeCookie = cookies.find(
      cookie => cookie.name === 'NEXT_LOCALE' && cookie.value === targetLanguage.code
    );
    expect(localeCookie).toBeTruthy();
  });

  // test('shows loading spinner during language switch when logged in', async ({ page }) => {
  //   await page.goto('/');

  //   const loginButton = page.getByRole('button', { name: 'OpenLogin' });
  //   await loginButton.click();

  //   await page.fill('#groupName', 'testgroup');
  //   await page.fill('#password', 'test123');

  //   const submitButton = page.getByRole('button', { name: 'SubmitLogin' });
  //   await submitButton.click();

  //   await page.waitForNavigation();

  //   await page.route('**/actions', async (route) => {
  //     await new Promise(resolve => setTimeout(resolve, 500));

  //     return route.fulfill({
  //       status: 200,
  //       body: JSON.stringify({}),
  //       headers: { 'Content-Type': 'application/json' },
  //     });
  //   });

  //   await page.waitForSelector('[data-testid="language-switcher"]', { state: 'visible', timeout: 20000 });
  //   const languageSwitcherButton = await page.getByTestId('language-switcher');
  //   await languageSwitcherButton.click();

  //   const targetLanguage = Object.values(languages)
  //     .find(lang => lang.code !== 'de');

  //   if (!targetLanguage) {
  //     throw new Error('No alternative language found');
  //   }

  //   const switchPromise = page.getByRole('menuitem', { name: targetLanguage.name }).click();

  //   const spinner = await page.getByTestId('loading-spinner');
  //   expect(spinner).toBeTruthy();

  //   await switchPromise;
  // });
});