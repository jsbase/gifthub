import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import * as dict from '@/lib/translations/en.json';

/*
  Accounts, not a shared group credential.

  The two things this spec asserts that the group version could not are both about
  refusals. Under a group model a wrong password was the only failure and it
  toasted; here a refused sign-in renders under the field that caused it, because a
  sign-in that says "no such address" for one input and "wrong password" for the
  other is an oracle for which addresses are registered - and this product's users
  are one family, so that answer is "does my aunt use this". The route answers one
  sentence for both, and this spec holds it to that.

  The second is the duplicate address. Registration has to say "there is already an
  account for this" and say what follows from it, because there is no password
  reset in this product: a duplicate address is otherwise a dead end a person
  cannot see their way out of.
*/

const ANNA = 'anna@example.test';
const PASSWORD = 'test1234';

// A fixed address rather than a generated one, so a re-run is idempotent and the
// duplicate case below is reachable without touching the seeded accounts.
const NEW_ACCOUNT = 'e2e-register@example.test';

const prisma = new PrismaClient();

/*
  The registration test removes its account first.

  A fixed address makes the run repeatable, but it also means the second run meets
  its own leftovers: the route answers `duplicate_email`, the sheet refuses, and the
  test fails on a `waitForNavigation` timeout that says nothing about registration.
  The old group spec had the same shape and worked only because the group it created
  was cleaned up in the same place.

  Scoped to this one address, in dependency order, so the cascade is explicit rather
  than a chain of single deletes that stops working when the schema gains a relation.
*/
test.beforeAll(async () => {
  const existing = await prisma.account.findMany({
    where: { email: { in: [NEW_ACCOUNT] } },
    select: { id: true },
  });
  const ids = existing.map((a) => a.id);
  if (ids.length > 0) {
    await prisma.listAccess.deleteMany({
      where: { OR: [{ accountId: { in: ids } }, { list: { ownerId: { in: ids } } }] },
    });
    await prisma.gift.deleteMany({ where: { list: { ownerId: { in: ids } } } });
    await prisma.list.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.account.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.$disconnect();
});

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

    await page.fill('#identifier', ANNA);
    await page.fill('#password', PASSWORD);

    const submitButton = page.getByTestId('SubmitLogin');

    await Promise.all([
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

  /*
    One field, two identifiers. Both are unique in the database, so one input
    resolves to at most one account and the route never has to ask which of two
    people was meant - which is the whole reason the nickname exists: a display name
    could not do this job, because two accounts are both called Anna.
  */
  test('Login accepts a nickname or an address, in any case', async ({ page }) => {
    for (const identifier of [
      'anna', // the nickname
      'ANNA', // ...uppercased, which is what autocorrect does
      ANNA, // the address
      'Anna@Example.test', // ...with the capitals a phone keyboard supplies
    ]) {
      await page.goto(`${process.env.NEXT_PUBLIC_BASE_URL}`, {
        waitUntil: 'networkidle',
      });
      await page.getByTestId('OpenLogin').click();
      await page.fill('#identifier', identifier);
      await page.fill('#password', PASSWORD);

      await Promise.all([
        page.waitForNavigation({ timeout: 15000, waitUntil: 'load' }),
        page.getByTestId('SubmitLogin').click(),
      ]);

      await expect(page, `"${identifier}" did not sign in`).toHaveURL(/dashboard/);
    }
  });

  test('A refused sign-in says the same thing for an unknown identifier and a wrong password', async ({
    page,
  }) => {
    // Wrong password on an account that exists.
    await page.getByTestId('OpenLogin').click();
    await page.fill('#identifier', ANNA);
    await page.fill('#password', 'definitely-not-the-password');
    await page.getByTestId('SubmitLogin').click();

    const wrongPassword = page.getByTestId('loginPasswordError');
    await expect(wrongPassword).toBeVisible({ timeout: 10000 });
    const wrongPasswordText = await wrongPassword.textContent();

    // And no toast: a refusal is stated where the person is looking, not thrown
    // past them from a corner of the screen.
    await expect(
      page.locator('[data-sonner-toast][data-type="error"]')
    ).toHaveCount(0);

    // Address nobody has. Same status, same sentence.
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByTestId('OpenLogin').click();
    await page.fill('#identifier', 'nobody@example.test');
    await page.fill('#password', PASSWORD);
    await page.getByTestId('SubmitLogin').click();

    const unknownAddress = page.getByTestId('loginPasswordError');
    await expect(unknownAddress).toBeVisible({ timeout: 10000 });

    expect(await unknownAddress.textContent()).toBe(wrongPasswordText);
  });

  test('Register with valid credentials', async ({ page }) => {
    await page.getByTestId('OpenRegister').click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    await page.fill('#newNickname', 'erika');
    await page.fill('#newEmail', NEW_ACCOUNT);
    await page.fill('#newPassword', PASSWORD);
    await page.fill('#confirmPassword', PASSWORD);

    const submitButton = page.getByTestId('SubmitRegister');

    // Registration signs you in: the register route sets the session cookie, so
    // there is no "now go and type the same password again" hop. The old spec
    // expected to be dropped back on the landing page; that hop no longer exists.
    await Promise.all([
      page.waitForNavigation({ timeout: 15000, waitUntil: 'load' }),
      submitButton.click(),
    ]);

    await expect(page).toHaveURL(/\/dashboard/);

    /*
      The header shows a display name, and registration did not ask for one: the
      route derives it from the nickname and capitalises the first letter. So a
      person who typed `erika` is greeted as "Erika" without having been asked to
      type it twice - which is the arrangement that keeps this form at three fields.
    */
    await expect(page.getByTestId('logo')).toContainText('Erika');

    const toast = page.locator('[data-sonner-toast][data-type="success"]');
    await toast.waitFor({ state: 'visible', timeout: 10000 });
    expect(await toast.textContent()).toContain(dict.toasts.registrationSuccess);

    /*
      And the nickname is the handle that signs in, which is the property the whole
      one-field sign-in rests on. Asserted rather than assumed: if the route stored
      something other than the submitted handle, or stored it differently, the loop
      above would still pass.
    */
    await page.context().clearCookies();
    await page.goto(`${process.env.NEXT_PUBLIC_BASE_URL}`, {
      waitUntil: 'networkidle',
    });
    await page.getByTestId('OpenLogin').click();
    await page.fill('#identifier', 'erika');
    await page.fill('#password', PASSWORD);
    await Promise.all([
      page.waitForNavigation({ timeout: 15000, waitUntil: 'load' }),
      page.getByTestId('SubmitLogin').click(),
    ]);
    await expect(page, 'the new nickname must sign in').toHaveURL(/dashboard/);
  });

  test('A refused registration reports an address that is already taken', async ({
    page,
  }) => {
    await page.getByTestId('OpenRegister').click();

    await page.fill('#newNickname', 'annaagain');
    await page.fill('#newEmail', ANNA);
    await page.fill('#newPassword', PASSWORD);
    await page.fill('#confirmPassword', PASSWORD);

    await page.getByTestId('SubmitRegister').click();

    /*
      Two things in one assertion. The message is the one this product has to give:
      there is no password reset, so "that address is taken" without saying what
      follows is a dead end. And the refused field is the address field rather than
      a toast, because a person who just typed an address is looking at the address
      field.
    */
    const emailError = page.getByTestId('registerEmailError');
    await expect(emailError).toBeVisible({ timeout: 10000 });
    expect(await emailError.textContent()).toContain(dict.errors.duplicateEmail);

    // And it stayed on the landing page: a refused registration creates nothing.
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  /*
    The nickname's own two refusals, which are different sentences about different
    problems. A client that could not tell "malformed" from "taken" would answer the
    second with the first and send somebody off to retype something that was never
    wrong.
  */
  test('A nickname that is taken is reported as taken, not as malformed', async ({
    page,
  }) => {
    await page.getByTestId('OpenRegister').click();

    await page.fill('#newNickname', 'anna');
    await page.fill('#newEmail', 'someone-else@example.test');
    await page.fill('#newPassword', PASSWORD);
    await page.fill('#confirmPassword', PASSWORD);
    await page.getByTestId('SubmitRegister').click();

    const nicknameError = page.getByTestId('registerNicknameError');
    await expect(nicknameError).toBeVisible({ timeout: 10000 });
    expect(await nicknameError.textContent()).toContain(
      dict.errors.duplicateNickname
    );
  });

  test('A nickname is refused before it reaches the server', async ({ page }) => {
    await page.getByTestId('OpenRegister').click();

    await page.fill('#newNickname', '!!!');
    await page.fill('#newEmail', 'someone@example.test');
    await page.fill('#newPassword', PASSWORD);
    await page.fill('#confirmPassword', PASSWORD);

    await page.getByTestId('SubmitRegister').click();

    // Live validation on blur, sharing `acceptedNickname` with the route - one rule
    // in one module, because the rule used to be written out twice and a rename on
    // either side compiled.
    const nicknameError = page.getByTestId('registerNicknameError');
    await expect(nicknameError).toBeVisible({ timeout: 10000 });
    expect(await nicknameError.textContent()).toContain(
      dict.errors.invalidNickname
    );
  });

  test('Sign-in refuses a field that is neither a nickname nor an address', async ({
    page,
  }) => {
    await page.getByTestId('OpenLogin').click();
    await page.fill('#identifier', '!!!');
    await page.fill('#password', PASSWORD);
    await page.getByTestId('SubmitLogin').click();

    // The identifier sentence, not the password one: the reader typed something
    // wrong, and telling them their password was rejected would be answering a
    // question they did not ask.
    const identifierError = page.getByTestId('loginIdentifierError');
    await expect(identifierError).toBeVisible({ timeout: 10000 });
    expect(await identifierError.textContent()).toContain(
      dict.errors.invalidIdentifier
    );
    await expect(page.getByTestId('loginPasswordError')).toHaveCount(0);
  });
});