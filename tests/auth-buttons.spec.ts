import { test, expect } from '@playwright/test';
import dict from '@/lib/translations/en.json';

const locale = 'en';

test.describe('Login and Registration Modal', () => {
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
      console.log('Test completed on:', page.url());
    } catch (error) {
      console.error('Navigation Error:', error);
      throw error;
    }
  });

  test('Login with valid credentials', async ({ page }) => {
    await page.goto(`/${locale}`);

    const loginButton = page.getByRole('button', { name: dict.login });
    await loginButton.click();

    await page.fill('#groupName', 'testgroup');
    await page.fill('#password', 'test123');

    const submitButton = page.getByRole('button', { name: dict.loginToGroup });
    await submitButton.click();

    const toast = page.locator('[data-sonner-toast][data-type="success"]');
    await toast.waitFor({ state: 'visible', timeout: 5000 });

    expect(await toast.textContent()).toContain(dict.toasts.loginSuccess);

    await page.waitForNavigation();

    await expect(page).toHaveURL(/dashboard/);

    const spinner = page.getByTestId('loading-spinner');
    await spinner.waitFor({ state: 'visible', timeout: 5000 });
    expect(spinner).toBeTruthy();
  });

  // TODO: enable and adjust this test after implementing a "remove group" functionality
  // test('Register new group with valid credentials', async ({ page }) => {
  //   await page.goto(`/${locale}`);

  //   const registerButton = page.getByRole('button', { name: dict.register });
  //   await registerButton.click();

  //   const registerModal = page.locator('[role="dialog"]');
  //   await expect(registerModal).toBeVisible();

  //   await page.fill('#newGroupName', 'NewTestGroup');
  //   await page.fill('#newPassword', 'newpassword123');
  //   await page.fill('#confirmPassword', 'newpassword123');

  //   const submitButton = page.getByRole('button', { name: dict.createGroupBtn });
  //   await submitButton.click();

  //   await expect(registerModal).not.toBeVisible();
  //   await page.waitForNavigation();

  //   await expect(page).toHaveURL(/login/);

  //   const toast = page.locator('[data-sonner-toast][data-type="success"]');
  //   await toast.waitFor({ state: 'visible', timeout: 5000 });

  //   expect(await toast.textContent()).toContain(dict.toasts.registrationSuccess);
  // });
});
