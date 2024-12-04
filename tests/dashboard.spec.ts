import { test, expect } from '@playwright/test';
import * as dict from '@/lib/translations/en.json';

const lang = 'en';

test.describe('Dashboard Page Functionality', () => {
  // Login with test credentials
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

    const loginButton = page.getByTestId('OpenLogin');
    await loginButton.click();

    await page.fill('#groupName', 'testgroup');
    await page.fill('#password', 'test123');

    const submitButton = page.getByTestId('SubmitLogin');

    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 15000, waitUntil: 'load' }),
      submitButton.click(),
    ]);

    await expect(page).toHaveURL(`/${lang}/dashboard`);
  });

  test('Create and Delete a gift', async ({ page }) => {
    // Step 1: Open the Member Gifts Dialog
    await page.getByTestId('showGiftsDialog').first().click();
    const dialogMember = page.locator('[role="dialog"]');
    await expect(dialogMember).toBeVisible();

    // Step 2: Add a Gift
    await page.getByTestId('addGiftButton').click();
    await expect(page.locator('#title')).toBeVisible();

    await page.fill('#title', 'PlayStation 5');
    await page.fill('#description', 'Latest gaming console');
    await page.fill('#url', 'https://search.brave.com/');
    await page.getByTestId('addGiftSubmit').click();

    const giftCard = page.getByTestId('giftCard');
    await expect(giftCard).toBeVisible();
    expect(await giftCard.getByTestId('giftTitle').textContent()).toBe(
      'PlayStation 5'
    );

    // Step 3: Delete the Gift
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toBe(dict.confirmations.deleteGift);
      await dialog.accept();
    });

    await page.getByTestId('giftDelete').click();
    await expect(giftCard).not.toBeVisible();

    // Step 4: Close the Member Gifts Dialog
    await page.getByTestId('dialogClose').click();
    await expect(dialogMember).not.toBeVisible();
  });
});
