import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import * as dict from '@/lib/translations/en.json';

/*
  The contents page, under the per-list model.

  Two things are asserted here that the group version of this spec could not be.

  The first is that the two sections are genuinely separate. `your lists` and
  `shared with you` are not one list with a column on it, because the two rows carry
  different affordances and a shared row is not the reader's to change. A shared row
  that offered a rename control would be a control the server refuses, which is the
  thing `sharing.spec.ts` asserts the other end of.

  The second is that a control a reader may not use is *absent*. The previous model
  showed owner-only toolbar buttons greyed out on every row; here a shared row has no
  toolbar at all, and the assertion is on the count. That is a product rule rather
  than a styling one - a buyer cannot tell an inert button from a broken one - so it
  is asserted rather than left to a screenshot.
*/

const prisma = new PrismaClient();

const lang = 'en';
const ANNA = 'anna@example.test';
const BEN = 'ben@example.test';
const MIA = 'mia@example.test';
const PASSWORD = 'test1234';

// Cleanup is scoped to lists this spec created, by name. The seeded demo lists are
// left alone for the same reason the group spec left `testgroup` alone: this suite
// writes to whatever database DATABASE_URL names, and in CI that can be the same one
// the deployed app reads.
const OWNED_BY_THIS_SPEC = ['e2e-owned', 'e2e-doomed'];

const signIn = async (
  page: import('@playwright/test').Page,
  email: string
) => {
  await page.getByTestId('OpenLogin').click();
  await page.getByTestId('loginIdentifier').fill(email);
  await page.getByTestId('loginPassword').fill(PASSWORD);
  await Promise.all([
    page.waitForNavigation({ timeout: 15000, waitUntil: 'load' }),
    page.getByTestId('SubmitLogin').click(),
  ]);
};

test.describe('Contents page', () => {
  test.beforeAll(async () => {
    // The old spec registered its own group here and accepted either a 200 or the
    // duplicate-name refusal, so a re-run was idempotent. Accounts already exist in
    // the seed, so this only has to clear anything an interrupted run left behind.
    const accounts = await prisma.account.findMany({
      where: { email: { in: [ANNA, BEN] } },
      select: { id: true },
    });
    const ids = accounts.map((a) => a.id);
    if (ids.length > 0) {
      const lists = await prisma.list.findMany({
        where: { name: { in: OWNED_BY_THIS_SPEC }, ownerId: { in: ids } },
        select: { id: true },
      });
      const listIds = lists.map((l) => l.id);
      /*
        Cascade handles the rest; the order is only so the FK check never sees an
        audience row whose list is already gone. Both audience tables are in that set
        now, and `listGroupAccess` is the one a reader would not think of here: this
        spec creates no groups, but a list left behind by an interrupted run can carry
        a group grant pointing at it, and it names a group rather than an account -
        which is precisely why the ordering has to be written down per table instead of
        being inferred from "the tables this spec uses".
      */
      await prisma.gift.deleteMany({ where: { listId: { in: listIds } } });
      await prisma.listAccess.deleteMany({ where: { listId: { in: listIds } } });
      await prisma.listGroupAccess.deleteMany({ where: { listId: { in: listIds } } });
      await prisma.list.deleteMany({ where: { id: { in: listIds } } });
    }
    await prisma.$disconnect();
  });

  test.beforeEach(async ({ page, context }) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    await context.setDefaultNavigationTimeout(10000);
    await context.setDefaultTimeout(10000);

    await page.goto(`${baseUrl}`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForSelector('body');

    await signIn(page, ANNA);
    await expect(page).toHaveURL(`/${lang}/dashboard`);
  });

  test('Create a list as private and as shared, then delete one', async ({
    page,
  }) => {
    // Private first: it is the default, and the default is the state that means
    // "only me" rather than "nobody has decided yet".
    await page.getByTestId('createListButton').click();
    await page.getByTestId('createListName').fill('e2e-owned');
    await page.getByTestId('createVisibility-private').click();
    await page.getByTestId('createListSubmit').click();

    /*
      Creating lands on the new sheet, not back on the board. That is deliberate:
      a list exists so that an idea can go on it, and an empty sheet behind the
      dialog says what to do next in one line of copy instead of leaving the owner
      to work out where the thing they just made went.
    */
    await expect(page).toHaveURL(new RegExp(`/${lang}/list/`), {
      timeout: 10000,
    });
    await expect(page.getByTestId('listName')).toContainText('e2e-owned');

    // The add form is present because this account owns it.
    await expect(page.getByTestId('addGiftButton')).toBeVisible();

    await page.getByTestId('addGiftButton').click();
    await page.getByTestId('giftTitleInput').fill('PlayStation 5');
    await page.getByTestId('giftDescriptionInput').fill('Latest console');
    await page.getByTestId('giftUrlInput').fill('https://search.brave.com/');
    await page.getByTestId('addGiftSubmit').click();

    const card = page.getByTestId('giftCard');
    await expect(card).toBeVisible();
    expect(await card.getByTestId('giftTitle').textContent()).toBe(
      'PlayStation 5'
    );

    // Add a second idea so the count on the row is something rather than nothing.
    await page.getByTestId('addGiftButton').click();
    await page.getByTestId('giftTitleInput').fill('Lampe');
    await page.getByTestId('addGiftSubmit').click();
    await expect(page.getByTestId('giftCard')).toHaveCount(2);

    // Delete one idea. The confirmation is the app's own dialog, not a native
    // window.confirm, so the step has to drive it.
    await page.getByTestId('giftCard').first().getByTestId('giftDelete').click();
    await page.getByTestId('confirmAction').click();
    await expect(page.getByTestId('giftCard')).toHaveCount(1);

    await page.getByTestId('backToLists').click();
    await expect(page).toHaveURL(`/${lang}/dashboard`);

    const owned = page.getByTestId('listRow').filter({ hasText: 'e2e-owned' });
    await expect(owned).toHaveCount(1);

    // Now a shared one, to prove the choice is actually taken rather than offered on
    // a control that does nothing.
    await page.getByTestId('createListButton').click();
    await page.getByTestId('createListName').fill('e2e-doomed');
    await page.getByTestId('createVisibility-shared').click();
    await page.getByTestId('createListSubmit').click();
    await expect(page).toHaveURL(new RegExp(`/${lang}/list/`), {
      timeout: 10000,
    });

    await page.getByTestId('backToLists').click();
    const doomed = page.getByTestId('listRow').filter({ hasText: 'e2e-doomed' });
    await expect(doomed).toHaveCount(1);

    // The visibility is the visible difference between the two rows, and the
    // audience count is the difference a shared list is actually carrying: this one
    // is shared and nobody has been added to it, which is a state distinct from
    // private and the row has to be able to say so.
    await expect(doomed).toContainText(dict.visibility.shared);
    await expect(owned).toContainText(dict.visibility.private);

    // Deleting a list is the only irreversible control in the product, so the
    // confirmation has to state the cascade.
    await doomed.getByTestId('deleteList').click();
    await expect(page.getByTestId('confirmAction')).toBeVisible();
    await page.getByTestId('confirmAction').click();

    await expect(page.getByTestId('listRow').filter({
      hasText: 'e2e-doomed',
    })).toHaveCount(0);
  });

  /*
    Anchored to a seeded list rather than to one an earlier test in this file
    created. A test that depends on the test before it passes as a suite and fails
    on its own, which is the kind of thing that only shows up when someone runs one
    spec to reproduce a bug. "Für mich" is private and owned by Anna and is created
    by the seed, so it is here whatever else this file does.
  */
  test('An owner row offers all four controls', async ({ page }) => {
    const owned = page
      .getByTestId('ownedLists')
      .getByTestId('listRow')
      .filter({ hasText: 'Für mich' });
    await expect(owned).toHaveCount(1);

    for (const control of ['openList', 'shareList', 'renameList', 'deleteList']) {
      await expect(owned.getByTestId(control)).toHaveCount(1);
    }
  });

  test('A shared row offers opening and nothing else', async ({ page }) => {
    /*
      As Mia, who has Ben's list shared with her. Not as Anna: the seed makes Anna
      the owner of everything she can see, so her "shared with you" section is empty
      and asserting anything about a shared row from her session tests the empty
      state instead. That is the same reason the seed gives Mia a *disjoint* list -
      a person who holds access to something is the only thing a shared row can be
      observed from.
    */
    await page.context().clearCookies();
    await page.goto(`${process.env.NEXT_PUBLIC_BASE_URL}`, {
      waitUntil: 'networkidle',
    });
    await signIn(page, MIA);

    await expect(page).toHaveURL(`/${lang}/dashboard`);

    const shared = page
      .getByTestId('sharedLists')
      .getByTestId('listRow')
      .first();
    await expect(shared).toBeVisible({ timeout: 10000 });

    // A shared row is identified by whose it is, which is the only way to tell two
    // rows apart when the names could coincide. This also pins *which* list Mia was
    // given, so a seed change that swaps the audience fails here with a readable
    // message rather than four count assertions failing further down.
    await expect(shared.getByTestId('listOwner')).toContainText('Ben');

    /*
      `toHaveCount(0)` rather than "is disabled", because the rule is that the
      control does not exist: an inert button and a missing one are indistinguishable
      to the person looking at it, and this product's audience is not going to work
      out which is which. The server refuses all four of these - `sharing.spec.ts`
      asserts that end - so a rendered-but-disabled toolbar would be four promises
      the product cannot keep.
    */
    for (const control of [
      'shareList',
      'renameList',
      'changeVisibility',
      'deleteList',
    ]) {
      await expect(shared.getByTestId(control)).toHaveCount(0);
    }
    // Opening it is not owner-only.
    await expect(shared.getByTestId('openList')).toHaveCount(1);
  });

  /*
    The header is the only chrome on every page, and it used to carry two
    regressions no screenshot diff could see: the language trigger overrode the 44px
    `icon` size with `h-9 w-9`, and the app-wide focus ring resolved to
    `box-shadow: none` on every focusable element. Both are invisible to a
    screenshot, so they are asserted here on geometry and on computed style.

    The header also carries the product's substitution - a signed-in person's display
    name in place of the wordmark - so the box measured here is that name.
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

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(logout).toHaveAttribute('aria-label', /./);
    await expect(logout.getByTestId('logoutLabel')).toBeHidden();

    await page.setViewportSize({ width: 800, height: 800 });
    await expect(logout.getByTestId('logoutLabel')).toBeVisible();
    await expect(logout.getByTestId('logoutLabel')).toHaveText('Log out');

    await expect(switcher).toContainText('EN');
    await expect(
      switcher.getByTestId('languageSwitcherChevron')
    ).toHaveCount(1); // the chevron

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