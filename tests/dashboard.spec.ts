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

  /*
    The header is the only chrome on every page, and it used to carry two
    regressions that no other test could see: the language trigger overrode the
    44px `icon` size with `h-9 w-9`, so the one control that changes the locale
    sat at 36px, and the app-wide focus ring resolved to `box-shadow: none` on
    every focusable element in the app. Both are invisible to a screenshot diff
    and to a smoke test, so they are asserted here on geometry and on computed
    style.

    This spec's `beforeEach` has already logged in, so the logout control - which
    only renders for an authenticated group - is on the page.
  */
  test('Header controls meet the 44px floor and keep a visible focus ring', async ({
    page,
  }) => {
    const switcher = page.getByTestId('language-switcher');
    const logout = page.getByTestId('logout');
    const logo = page.getByTestId('logo');

    for (const control of [switcher, logout, logo]) {
      const box = await control.boundingBox();
      expect(box, 'header control has no box').not.toBeNull();
      // Both axes are floors, not just height: a 44px-tall control 20px wide is
      // still a miss on a phone held in one hand.
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }

    // The two controls must not touch: two 44px targets 4px apart is one target
    // with a seam, and mis-hits on the wrong one of two adjacent actions.
    const sBox = (await switcher.boundingBox())!;
    const lBox = (await logout.boundingBox())!;
    expect(sBox.x + sBox.width).toBeLessThanOrEqual(lBox.x - 8);

    // Logout is a bare glyph below 640px and carries the word above it, and it is
    // never an unlabelled icon at either width. The narrow viewport has to be set
    // before the first assertion, not just before the second: the Playwright
    // default is wider than 640px, so the label is already on screen.
    await page.setViewportSize({ width: 375, height: 667 });

    const logoutLabel = logout.locator('span');
    await expect(logout).toHaveAttribute('aria-label', /./);
    await expect(logoutLabel).toBeHidden();

    await page.setViewportSize({ width: 800, height: 800 });
    await expect(logoutLabel).toBeVisible();
    await expect(logoutLabel).toHaveText('Log out');

    // The switcher names its action and the language it is currently on, and
    // states that language in letters as well as in a flag, so it does not depend
    // on recognising the flag to be usable.
    await expect(switcher).toHaveAttribute(
      'aria-label',
      'Change language: English'
    );
    await expect(switcher).toContainText('EN');
    await expect(switcher.locator('svg')).toHaveCount(1); // the chevron

    // The two-tone ring, read off a focused element: the gap in the local ground,
    // then the registration-cyan ring. Asserted as two shadows because a single
    // flat colour cannot clear 3:1 on both the board and an ink-filled button.
    await page.getByTestId('logo').focus();
    await page.keyboard.press('Tab');

    const ring = await switcher.evaluate((el) => {
      const s = getComputedStyle(el);
      return { shadow: s.boxShadow, matches: el.matches(':focus-visible') };
    });
    expect(ring.matches, 'switcher is not the focus-visible element').toBe(true);
    const shadows = ring.shadow.split(/,(?![^(]*\))/);
    expect(shadows.length, `expected a two-tone ring, got: ${ring.shadow}`)
      .toBe(2);
    for (const shadow of shadows) {
      expect(shadow).toMatch(/rgba?\(\d+,\s*\d+,\s*\d+/);
    }
    // A dropped declaration computes to `none`, which is how the ring went
    // missing without anything in the cascade looking wrong.
    expect(ring.shadow).not.toBe('none');
  });
});
