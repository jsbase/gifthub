import { test, expect } from '@playwright/test';

const lang = 'en';
const testuserName = 'testuser';

test.describe('Dashboard functionality', () => {
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
      console.log(`Test "dashboard" started for page: ${page.url()}`);
    } catch (error) {
      console.error('Navigation Error:', error);
      throw error;
    }

    const loginButton = page.getByTestId('OpenLogin');
    await loginButton.click();

    await page.fill('#groupName', 'testgroup');
    await page.fill('#password', 'test123');

    const submitButton = page.getByTestId('SubmitLogin');
    await Promise.all([
      page.waitForNavigation({ timeout: 15000, waitUntil: 'load' }),
      submitButton.click(),
    ]);

    await expect(page).toHaveURL(`/${lang}/dashboard`);
  });

  test('Add and remove members and gifts', async ({ page }) => {
    test.slow();

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    const noMembersMessage = await page.getByTestId('noMembers');
    await expect(noMembersMessage).toBeVisible();

    await page.getByTestId('addMemberButton').click();
    await page.fill('#name', testuserName);
    await page.getByTestId('memberNameSubmit').click();

    await expect(noMembersMessage).not.toBeVisible();

    // Open the members gifts dialog
    await page.getByTestId('showGiftsDialog').click();
    const dialogMember = page.locator('[role="dialog"]');
    await expect(dialogMember).toBeVisible();

    // Add a gift to a member
    await page.getByTestId('addGiftButton').click();
    await page.fill('#title', 'PlayStation 5');
    await page.fill('#description', 'Latest gaming console');
    await page.fill('#url', 'https://search.brave.com/');
    await page.getByTestId('addGiftSubmit').click();

    const giftCard = page.getByTestId('giftCard');
    await expect(giftCard).toBeVisible();
    expect(await giftCard.getByTestId('giftTitle').textContent()).toBe(
      'PlayStation 5'
    );

    // Delete the Gift
    await page.getByTestId('giftDelete').click();
    await expect(giftCard).not.toBeVisible();

    // Close the Member Gifts Dialog
    await page.getByTestId('dialogClose').click();
    await expect(dialogMember).not.toBeVisible();

    // Remove the member again
    await page.getByTestId('showRemoveMemberButtons').click();
    await page.waitForTimeout(1000);
    await page.getByTestId('removeMemberButton').click();

    await expect(noMembersMessage).toBeVisible();
  });
});
