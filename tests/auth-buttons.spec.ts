import { test, expect } from '@playwright/test';
import * as dict from '@/lib/translations/en.json';

// const locale = 'en';

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
      console.log(`Test completed for component "auth-buttons" on ${page.url()}`);
    } catch (error) {
      console.error('Navigation Error:', error);
      throw error;
    }
  });

  test('Login dialog opens and closes correctly', async ({ page }) => {
    const loginButton = page.getByRole('button', { name: dict.login });
    await loginButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    const closeIcon = dialog.locator('[data-testid="dialog-close"]');
    await closeIcon.click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    await loginButton.click();
    await expect(dialog).toBeVisible();
  });

  test('Login with valid credentials', async ({ page }) => {
    const loginButton = page.getByRole('button', { name: dict.login });
    await loginButton.click();

    await page.fill('#groupName', 'testgroup');
    await page.fill('#password', 'test123');

    const submitButton = page.getByRole('button', { name: dict.loginToGroup });

    // Ensure login response or navigation happens first
    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 15000, waitUntil: 'load' }),
      submitButton.click(), // Trigger login action
    ]);

    await expect(page).toHaveURL(/dashboard/); // Ensure we're redirected to the dashboard

    // Wait for the toast to be visible, increase timeout to 10 seconds
    const toast = page.locator('[data-sonner-toast][data-type="success"]');
    await toast.waitFor({ state: 'visible', timeout: 10000 });
    expect(await toast.textContent()).toContain(dict.toasts.loginSuccess);

    const spinner = page.getByTestId('loading-spinner');
    await spinner.waitFor({ state: 'visible', timeout: 5000 });
    expect(spinner).toBeTruthy();
  });


  // TODO: enable and adjust this test after implementing a "remove group" functionality
  // test('Register new group with valid credentials', async ({ page }) => {
  //   await page.goto(`/${locale}`);

  //   const registerButton = page.getByRole('button', { name: dict.register });
  //   await registerButton.click();

  //   const dialog = page.locator('[role="dialog"]');
  //   await expect(dialog).toBeVisible();

  //   await page.fill('#newGroupName', 'NewTestGroup');
  //   await page.fill('#newPassword', 'newpassword123');
  //   await page.fill('#confirmPassword', 'newpassword123');

  //   const submitButton = page.getByRole('button', { name: dict.createGroupBtn });
  //   await submitButton.click();

  //   await expect(dialog).not.toBeVisible();
  //   await page.waitForNavigation();

  //   await expect(page).toHaveURL(/login/);

  //   const toast = page.locator('[data-sonner-toast][data-type="success"]');
  //   await toast.waitFor({ state: 'visible', timeout: 5000 });

  //   expect(await toast.textContent()).toContain(dict.toasts.registrationSuccess);
  // });
});
