import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import * as dict from '@/lib/translations/en.json';

/*
  THE TWO GROUP SHEETS, AS SHEETS.

  `groups.spec.ts` is HTTP-only and says why: what an account is *allowed* is a
  question for the server. This file asks the other half - what the two sheets
  *offer* - because both of them used to contradict themselves and neither claim is
  visible to a request.

  Three defects, three assertions:

    - the groups sheet was one scroll holding a create form, a group list, the
      expanded members of whichever group was open, and that group's member picker
      in a fixed order. Opening a group appended to the bottom of the sheet, there
      was no way back out of one except the window's own cross, and the block under
      the list was unlabelled by position - so the head had to carry the group's
      name to say whose members these were.

    - the share sheet printed every group twice on a shared list: once under the
      audience, saying it can reach this list, and once under the offer, saying the
      same name with no control at all. Same row, opposite affordance, and the only
      difference was which list the renderer had walked.

    - the create form was the first thing in the groups sheet, permanently, under
      the only solid ink button in the app - so the largest object on a screen of
      somebody's own groups was "make another one".
*/

const prisma = new PrismaClient();

const lang = 'en';
const ANNA = 'anna@example.test';
const PASSWORD = 'test1234';

// Unique per run so an interrupted run cannot collide with its own leftovers, and
// so nothing seeded is ever the subject of a test.
const GROUP_NAME = `spec-group-${process.pid}`;

const signIn = async (page: Page, email: string) => {
  await page.goto(`/${lang}`);
  await page.getByTestId('OpenLogin').click();
  await page.getByTestId('loginIdentifier').fill(email);
  await page.getByTestId('loginPassword').fill(PASSWORD);
  await Promise.all([
    page.waitForURL(/\/(dashboard|list)/, { timeout: 20000 }),
    page.getByTestId('SubmitLogin').click(),
  ]);
};

test.describe('Group sheets', () => {
  test.beforeAll(async () => {
    const anna = await prisma.account.findUnique({
      where: { email: ANNA },
    });
    if (!anna) throw new Error('the seed is missing anna@example.test');

    // Built through Prisma rather than the dialog, because the claim under test is
    // about what the dialog does with a group that exists - not about typing into a
    // field. `groups.spec.ts` covers the request.
    await prisma.group.create({
      data: { name: GROUP_NAME, ownerId: anna.id },
    });
  });

  test.afterAll(async () => {
    // Scoped to the one name this file created. This suite writes to whatever
    // DATABASE_URL names and in CI that can be the database the deployed app reads.
    await prisma.group.deleteMany({ where: { name: GROUP_NAME } });
    await prisma.$disconnect();
  });

  test('the groups sheet opens on the list, and the create form is one tap away', async ({
    page,
  }) => {
    await signIn(page, ANNA);
    await page.getByTestId('openGroups').click();

    await expect(page.getByTestId('groupList')).toBeVisible();
    await expect(page.getByTestId('groupList').getByText(GROUP_NAME)).toBeVisible();

    /*
      Not `toBeHidden`, and not "the form is somewhere below": the form must not be
      in the document at all until it is asked for. A permanently visible field with
      a full-width ink button above somebody's own groups is the arrangement being
      replaced, and `toBeHidden` would also pass if it were merely collapsed.
    */
    await expect(page.getByTestId('groupNameInput')).toHaveCount(0);
    await expect(page.getByTestId('newGroupButton')).toBeVisible();

    await page.getByTestId('newGroupButton').click();
    await expect(page.getByTestId('groupNameInput')).toBeVisible();
  });

  test('a group opens, and there is a way back out of it', async ({ page }) => {
    await signIn(page, ANNA);
    await page.getByTestId('openGroups').click();

    await page
      .getByTestId('openGroup')
      .filter({ hasText: GROUP_NAME })
      .click();

    /*
      The sheet's title becomes the group's name, in the serif, because a group name
      is a name and this is the one serif the product allows. Asserted through the
      dialog title rather than through the group's own heading, since the title is
      what tells a reader which level they are on.
    */
    await expect(page.getByTestId('dialogContent')).toContainText(GROUP_NAME);

    // The block carries no head of its own any more: the title above it says which
    // group these are, which is what the old section head had to repeat.
    await expect(page.getByTestId('membersHeading')).toHaveCount(0);

    const back = page.getByTestId('backToGroups');
    await expect(back).toBeVisible();
    await expect(back).toHaveText(dict.groups.backToGroups);

    await back.click();
    await expect(page.getByTestId('groupList')).toBeVisible();
    await expect(page.getByTestId('backToGroups')).toHaveCount(0);
  });

  test('the add-person control is at the foot and quiet until it is pressed', async ({
    page,
  }) => {
    await signIn(page, ANNA);
    await page.getByTestId('openGroups').click();
    await page
      .getByTestId('openGroup')
      .filter({ hasText: GROUP_NAME })
      .click();

    await expect(page.getByTestId('noMembers')).toBeVisible();
    await expect(page.getByTestId('noMembers')).toHaveText(dict.groups.noMembers);

    // A second heading over one field is the redundancy: "Person hinzufügen" above
    // a picker already labelled "Nickname oder E-Mail-Adresse".
    await expect(page.getByTestId('addMemberHeading')).toHaveCount(0);
    await expect(page.getByTestId('addMemberButton')).toBeVisible();

    await page.getByTestId('addMemberButton').click();
    await expect(page.getByTestId('addMemberHeading')).toBeVisible();
  });

  test('a group already reaching a list is offered exactly once', async ({ page }) => {
    const anna = await prisma.account.findUniqueOrThrow({
      where: { email: ANNA },
    });
    // A group grant is refused on a private list, so the list has to be one the seed
    // made shared rather than any of Anna's. Picked by visibility rather than by the
    // seed's name, which is not in the dictionary and is not this file's subject.
    const list = await prisma.list.findFirstOrThrow({
      where: { ownerId: anna.id, visibility: 'SHARED' },
    });

    await prisma.listGroupAccess.create({
      data: { listId: list.id, groupId: await groupId() },
    });

    try {
      await signIn(page, ANNA);
      await page.goto(`/${lang}/list/${list.id}`);
      await page.getByTestId('sheetShareList').click();

      /*
        One row for this group on the whole sheet, and the audience is a single
        list rather than two. The old version printed this group under the audience
        *and* under the offer, so the count was two while the reader's model of the
        sheet was one - and the two rows differed only in whether the renderer had
        walked `myGroups` or `groupAccess`.
      */
      await expect(
        page.getByTestId('accessList').getByText(GROUP_NAME)
      ).toHaveCount(1);
      await expect(
        page.getByTestId('groupPicker').getByText(GROUP_NAME)
      ).toHaveCount(0);

      /*
        And the offer is exactly her groups minus this one's grant - counted, not
        assumed. The first version of this assertion was "the offer is empty", which
        is only true when the account happens to own exactly one group; it passed on
        chromium and failed on webkit purely because a previous project's spec had
        left her a second one. The claim is the subtraction, so it is written as the
        subtraction and read from the database at the moment it is asserted.
      */
      const owned = await prisma.group.count({ where: { ownerId: anna.id } });
      const grants = await prisma.listGroupAccess.count({
        where: { listId: list.id },
      });
      await expect(page.getByTestId('groupPickerRow')).toHaveCount(
        owned - grants
      );
    } finally {
      await prisma.listGroupAccess.deleteMany({ where: { listId: list.id } });
    }
  });

  /*
    The list sheet's own audience block, which is not the share dialog's. It was
    handed `groupAccess` by the page and never read it, so a `SHARED` list whose
    only readers arrive through a group - no `ListAccess` row at all - printed
    "You have not shared your wishes with anyone yet" directly above a group that
    can open it. The row on the contents page already said otherwise
    (`sharedWithGroupCount`), which is what made the sheet read as a contradiction
    and not merely as a thin summary.

    Each list is created here and deleted in `finally`, rather than borrowed from
    the seed: a seeded list may carry individual grants, and one individual grant
    is enough to hide the defect.
  */
  const withSharedList = async (
    grantGroup: boolean,
    run: (listId: string) => Promise<void>
  ) => {
    const anna = await prisma.account.findUniqueOrThrow({
      where: { email: ANNA },
    });
    const list = await prisma.list.create({
      data: {
        name: `spec-list-${process.pid}-${grantGroup ? 'group' : 'bare'}`,
        ownerId: anna.id,
        visibility: 'SHARED',
      },
    });
    try {
      if (grantGroup) {
        await prisma.listGroupAccess.create({
          data: { listId: list.id, groupId: await groupId() },
        });
      }
      await run(list.id);
    } finally {
      // The grant goes with the list (`onDelete: Cascade`), so one delete is enough.
      await prisma.list.deleteMany({ where: { id: list.id } });
    }
  };

  test('a list reached only through a group does not claim to be shared with nobody', async ({
    page,
  }) => {
    await withSharedList(true, async (listId) => {
      await signIn(page, ANNA);
      await page.goto(`/${lang}/list/${listId}`);

      await expect(page.getByTestId('groupAccessList')).toBeVisible();
      await expect(
        page.getByTestId('groupAccessList').getByText(GROUP_NAME)
      ).toHaveCount(1);
      await expect(page.getByTestId('nobodyYet')).toHaveCount(0);
    });
  });

  test('a shared list nobody has been added to still says so', async ({
    page,
  }) => {
    // The guard for the other direction: the fix must not make the empty sentence
    // unreachable, only conditional on there being no group either.
    await withSharedList(false, async (listId) => {
      await signIn(page, ANNA);
      await page.goto(`/${lang}/list/${listId}`);

      await expect(page.getByTestId('nobodyYet')).toHaveText(
        dict.shareList.nobodyYet
      );
      await expect(page.getByTestId('groupAccessList')).toHaveCount(0);
    });
  });
});

const groupId = async () => {
  const group = await prisma.group.findFirstOrThrow({
    where: { name: GROUP_NAME },
  });
  return group.id;
};