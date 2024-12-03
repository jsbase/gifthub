import { test, expect } from '@playwright/test';
import * as dict from '@/lib/translations/en.json';

// const lang = 'en';

test.describe('Login and Registration', () => {
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
      console.log(`Test "auth-buttons" started for page: ${page.url()}`);
    } catch (error) {
      console.error('Navigation Error:', error);
      throw error;
    }
  });

  test('Login dialog opens and closes correctly', async ({ page }) => {
    const loginButton = page.getByTestId('OpenLogin');
    await loginButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    const closeIcon = dialog.getByTestId('dialogClose');
    await closeIcon.click();
    await expect(dialog).not.toBeVisible({ timeout: 2000 });

    await loginButton.click();
    await expect(dialog).toBeVisible();
  });

  test('Login with valid credentials', async ({ page }) => {
    const loginButton = page.getByTestId('OpenLogin');
    await loginButton.click();

    await page.fill('#groupName', 'testgroup');
    await page.fill('#password', 'test123');

    const submitButton = page.getByTestId('SubmitLogin');

    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 15000, waitUntil: 'load' }),
      submitButton.click(),
    ]);

    await expect(page).toHaveURL(/dashboard/);

    const toast = page.locator('[data-sonner-toast][data-type="success"]');
    await toast.waitFor({ state: 'visible', timeout: 10000 });
    expect(await toast.textContent()).toContain(dict.toasts.loginSuccess);

    const spinner = page.getByTestId('loadingSpinner');
    await spinner.waitFor({ state: 'visible', timeout: 2000 });
    expect(spinner).toBeTruthy();
  });

  // TODO: enable and adjust this test after implementing a "remove group" functionality
  // test('Register new group with valid credentials', async ({ page }) => {
  //   await page.goto(`/${lang}`);

  //   const registerButton = page.getByTestId('OpenRegister');
  //   await registerButton.click();

  //   const dialog = page.locator('[role="dialog"]');
  //   await expect(dialog).toBeVisible();

  //   await page.fill('#newGroupName', 'NewTestGroup');
  //   await page.fill('#newPassword', 'newpassword123');
  //   await page.fill('#confirmPassword', 'newpassword123');

  //   const submitButton = page.getByTestId('SubmitRegister');
  //   await submitButton.click();

  //   await expect(dialog).not.toBeVisible();
  //   await page.waitForNavigation();

  //   await expect(page).toHaveURL(`/${lang}`);

  //   const toast = page.locator('[data-sonner-toast][data-type="success"]');
  //   await toast.waitFor({ state: 'visible', timeout: 2000 });

  //   expect(await toast.textContent()).toContain(dict.toasts.registrationSuccess);
  // });
});
