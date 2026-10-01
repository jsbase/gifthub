import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const lang = 'en';
const testuserName = 'testuser';

// This spec deletes data, so it must never touch `testgroup`: that is the demo
// group the deployed app shows to whoever is looking at it. Every write below is
// scoped to a group of its own, created on demand, so the demo group survives
// the suite even where CI is pointed at the same database.
const GROUP_NAME = 'testgroup-e2e';
const GROUP_PASSWORD = 'test123';

const prisma = new PrismaClient();

test.describe('Dashboard functionality', () => {
  test.beforeAll(async ({ request }) => {
    // Idempotent: the first run creates the group, every later run gets the 400
    // the register route returns for a name that is taken.
    const response = await request.post('/api/auth/register', {
      data: { groupName: GROUP_NAME, password: GROUP_PASSWORD },
    });
    const body = await response.json().catch(() => null);

    expect(
      response.ok() || body?.message === 'A group with this name already exists',
      `registering ${GROUP_NAME} failed: ${response.status()} ${JSON.stringify(
        body
      )}`
    ).toBe(true);
  });

  test.beforeEach(async ({ page, context }) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    // Own the fixture: wipe any members left in the group by an interrupted run,
    // so the assertions below do not depend on initial DB state.
    const group = await prisma.group.findUnique({
      where: { name: GROUP_NAME },
    });
    if (group) {
      const memberships = await prisma.userGroup.findMany({
        where: { groupId: group.id },
        select: { id: true, userId: true },
      });
      await prisma.gift.deleteMany({
        where: { forMemberId: { in: memberships.map((m) => m.id) } },
      });
      await prisma.userGroup.deleteMany({ where: { groupId: group.id } });
      // `userGroups: { none: {} }` is what keeps this safe. A User row is
      // global - `@@unique([userId, groupId])` lets one user sit in several
      // groups - and this filter runs after the memberships above are gone, so it
      // can only match users left belonging to nothing at all. Without it, any
      // user shared with another group would be deleted here and take that
      // membership with it; nothing in the schema stops the app from creating
      // such a user (app/api/members/route.ts:87 inserts a fresh one, but a test
      // must not depend on that).
      await prisma.user.deleteMany({
        where: {
          id: { in: memberships.map((m) => m.userId) },
          userGroups: { none: {} },
        },
      });
    }
    await prisma.$disconnect();

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

    await page.fill('#groupName', GROUP_NAME);
    await page.fill('#password', GROUP_PASSWORD);

    const submitButton = page.getByTestId('SubmitLogin');
    await Promise.all([
      page.waitForNavigation({ timeout: 15000, waitUntil: 'load' }),
      submitButton.click(),
    ]);

    await expect(page).toHaveURL(`/${lang}/dashboard`);
  });

  test('Add and remove members and gifts', async ({ page }) => {
    test.slow();

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

    // Delete the Gift. The confirmation is the app's own dialog, not a native
    // window.confirm, so the step has to drive it - and the assertions below are
    // what prove the dialog actually destroyed the row.
    await page.getByTestId('giftDelete').click();
    await page.getByTestId('confirmAction').click();
    await expect(giftCard).not.toBeVisible();

    // Close the Member Gifts Dialog
    await page.getByTestId('dialogClose').click();
    await expect(dialogMember).not.toBeVisible();

    // Remove the member again
    await page.getByTestId('showRemoveMemberButtons').click();
    await page.waitForTimeout(1000);
    await page.getByTestId('removeMemberButton').click();
    await page.getByTestId('confirmAction').click();

    await expect(noMembersMessage).toBeVisible();
  });
});
