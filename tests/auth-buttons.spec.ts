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

/*
  The clause about the nickname, which the sign-in sheet reads out with its title
  instead of printing under the field for as long as the sheet is open.

  Taken as the description's first sentence rather than written out here, because
  this file asserts the dictionary and never a literal: a copy change would
  otherwise leave a string behind in a test that the sheet no longer prints, and
  the failure would point at the test rather than at the copy.
*/
const NICKNAME_SENTENCE = `${dict.loginDescription.split('.')[0]}.`;

const prisma = new PrismaClient();

/*
  The registration test removes its account first.

  A fixed address makes the run repeatable, but it also means the second run meets
  its own leftovers: the route answers `duplicate_email`, the sheet refuses, and the
  test fails on a `waitForNavigation` timeout that says nothing about registration.
  The old group spec had the same shape and worked only because the group it created
  was cleaned up in the same place.

  Scoped to this one address, in dependency order, so the cascade is explicit rather
  than a chain of single deletes that stops working when the schema gains a relation -
  and `Account` has gained two relations since that sentence was written. Every row
  that points at this account, at one of its lists, or at one of its groups goes before
  the row it points at, which puts the two tables that span a pair in front of both
  parents: `listGroupAccess` references a list *and* a group, and `groupMember`
  references a group *and* an account. Emptied after either parent they are foreign-key
  violations rather than a clean reset.
*/
test.beforeAll(async () => {
  const existing = await prisma.account.findMany({
    where: { email: { in: [NEW_ACCOUNT] } },
    select: { id: true },
  });
  const ids = existing.map((a) => a.id);
  if (ids.length > 0) {
    await prisma.gift.deleteMany({ where: { list: { ownerId: { in: ids } } } });
    await prisma.listGroupAccess.deleteMany({
      where: {
        OR: [
          { list: { ownerId: { in: ids } } },
          { group: { ownerId: { in: ids } } },
        ],
      },
    });
    await prisma.listAccess.deleteMany({
      where: {
        OR: [
          { accountId: { in: ids } },
          { list: { ownerId: { in: ids } } },
        ],
      },
    });
    await prisma.list.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.groupMember.deleteMany({
      where: {
        OR: [
          { accountId: { in: ids } },
          { group: { ownerId: { in: ids } } },
        ],
      },
    });
    await prisma.group.deleteMany({ where: { ownerId: { in: ids } } });
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

    const dialog = page.getByTestId('dialogContent');
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

    await page.getByTestId('loginIdentifier').fill(ANNA);
    await page.getByTestId('loginPassword').fill(PASSWORD);

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
      await page.getByTestId('loginIdentifier').fill(identifier);
      await page.getByTestId('loginPassword').fill(PASSWORD);

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
    await page.getByTestId('loginIdentifier').fill(ANNA);
    await page.getByTestId('loginPassword').fill('definitely-not-the-password');
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
    await page.getByTestId('loginIdentifier').fill('nobody@example.test');
    await page.getByTestId('loginPassword').fill(PASSWORD);
    await page.getByTestId('SubmitLogin').click();

    const unknownAddress = page.getByTestId('loginPasswordError');
    await expect(unknownAddress).toBeVisible({ timeout: 10000 });

    expect(await unknownAddress.textContent()).toBe(wrongPasswordText);
  });

  test('Register with valid credentials', async ({ page }) => {
    await page.getByTestId('OpenRegister').click();

    const dialog = page.getByTestId('dialogContent');
    await expect(dialog).toBeVisible();

    await page.getByTestId('registerNickname').fill('erika');
    await page.getByTestId('registerEmail').fill(NEW_ACCOUNT);
    await page.getByTestId('registerPassword').fill(PASSWORD);
    await page.getByTestId('registerConfirmPassword').fill(PASSWORD);

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
    await page.getByTestId('loginIdentifier').fill('erika');
    await page.getByTestId('loginPassword').fill(PASSWORD);
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

    await page.getByTestId('registerNickname').fill('annaagain');
    await page.getByTestId('registerEmail').fill(ANNA);
    await page.getByTestId('registerPassword').fill(PASSWORD);
    await page.getByTestId('registerConfirmPassword').fill(PASSWORD);

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

    await page.getByTestId('registerNickname').fill('anna');
    await page.getByTestId('registerEmail').fill('someone-else@example.test');
    await page.getByTestId('registerPassword').fill(PASSWORD);
    await page.getByTestId('registerConfirmPassword').fill(PASSWORD);
    await page.getByTestId('SubmitRegister').click();

    const nicknameError = page.getByTestId('registerNicknameError');
    await expect(nicknameError).toBeVisible({ timeout: 10000 });
    expect(await nicknameError.textContent()).toContain(
      dict.errors.duplicateNickname
    );
  });

  test('A nickname is refused before it reaches the server', async ({ page }) => {
    await page.getByTestId('OpenRegister').click();

    await page.getByTestId('registerNickname').fill('!!!');
    await page.getByTestId('registerEmail').fill('someone@example.test');
    await page.getByTestId('registerPassword').fill(PASSWORD);
    await page.getByTestId('registerConfirmPassword').fill(PASSWORD);

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

  /*
    The two password refusals, and the slot between them.

    "Too short" is about the first field alone. "These two do not match" is about the
    pair, and it has to be said under both of them - which is why `RegisterFormProps`
    grew a second slot rather than one paragraph being split into two. A person fixing
    a mismatch is looking at both boxes; a person told only under the first has no way
    to know the sentence was about the pair.

    So both halves are asserted, and the second pair is the one that matters: it is the
    assertion that the split is real. A form with one slot that happened to render
    `confirmPasswordError` into the password paragraph would pass a test checking that
    a mismatch is reported somewhere.
  */
  test('A password under the minimum is said under the first field alone', async ({
    page,
  }) => {
    await page.getByTestId('OpenRegister').click();

    await page.getByTestId('registerNickname').fill('kurzpw');
    await page.getByTestId('registerEmail').fill('someone@example.test');
    // Both fields the same short string, so the only thing wrong here is the length.
    // Two *different* short strings would fail on length first and never reach the
    // mismatch branch, which is the next test's job and not this one's.
    await page.getByTestId('registerPassword').fill('kurz');
    await page.getByTestId('registerConfirmPassword').fill('kurz');

    await page.getByTestId('SubmitRegister').click();

    const passwordError = page.getByTestId('registerPasswordError');
    await expect(passwordError).toBeVisible({ timeout: 10000 });
    expect(await passwordError.textContent()).toContain(dict.errors.weakPassword);
    await expect(
      page.getByTestId('registerConfirmPasswordError'),
      'a length verdict belongs to the first field, not to the pair'
    ).toHaveCount(0);
  });

  test('Two different passwords are said under the second field alone', async ({
    page,
  }) => {
    await page.getByTestId('OpenRegister').click();

    await page.getByTestId('registerNickname').fill('mismatch');
    await page.getByTestId('registerEmail').fill('someone@example.test');
    // Both long enough to clear the length gate, because the gates run in the order
    // the fields are printed and the length check is first - which is the point of the
    // order: a reader who filled the sheet top to bottom is told about the topmost
    // thing they still have to fix rather than one further down.
    await page.getByTestId('registerPassword').fill(PASSWORD);
    await page.getByTestId('registerConfirmPassword').fill('test5678');

    await page.getByTestId('SubmitRegister').click();

    const confirmError = page.getByTestId('registerConfirmPasswordError');
    await expect(confirmError).toBeVisible({ timeout: 10000 });
    expect(await confirmError.textContent()).toContain(
      dict.errors.passwordMismatch
    );
    await expect(
      page.getByTestId('registerPasswordError'),
      'a mismatch is about the pair, so it must not be charged to the first field'
    ).toHaveCount(0);
  });

  /*
    `invalid_email` against `duplicate_email`. "That is not an address" and "that
    address is already taken" are two different sentences about two different problems,
    and a client that could not tell them apart answered the second with the first -
    sending somebody off to retype something that was never wrong, which reads as
    though the address itself were the problem.
  */
  test('An address that is not an address is refused before it reaches the server', async ({
    page,
  }) => {
    await page.getByTestId('OpenRegister').click();

    // The nickname gate runs first, so it has to be a usable one - otherwise the sheet
    // would stop at `registerNicknameError` and the assertion below would pass for the
    // wrong reason if it were written loosely enough to see any error on the page.
    await page.getByTestId('registerNickname').fill('keineadresse');
    await page.getByTestId('registerEmail').fill('not-an-address');
    await page.getByTestId('registerPassword').fill(PASSWORD);
    await page.getByTestId('registerConfirmPassword').fill(PASSWORD);

    await page.getByTestId('SubmitRegister').click();

    const emailError = page.getByTestId('registerEmailError');
    await expect(emailError).toBeVisible({ timeout: 10000 });
    expect(await emailError.textContent()).toContain(dict.errors.invalidEmail);
  });

  test('Sign-in refuses a field that is neither a nickname nor an address', async ({
    page,
  }) => {
    await page.getByTestId('OpenLogin').click();
    await page.getByTestId('loginIdentifier').fill('!!!');
    await page.getByTestId('loginPassword').fill(PASSWORD);
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

  /*
    Where the nickname sentence is, and what a field is described by.

    It used to be a paragraph printed under the identifier field for as long as
    the sheet was open, with `aria-describedby` pointing at it, and it is now in
    the sheet's description - which the dialog reads out with the title, once. The
    count is the assertion rather than a presence check, because "the hint is gone"
    and "the hint now lives in the description" are different claims: a hint that
    survived beside the description prints one sentence twice, one of them standing
    between the reader and the field they came to fill.

    `aria-describedby` is asserted in both of its states, which is the whole
    subtlety. "Nothing describes this field yet" is half the design, and on its own
    it is satisfied just as well by a build that had deleted the attribute outright
    - a sheet that says nothing to a screen reader at the one moment it has
    something to say. So the second half follows: after a formally invalid
    identifier the field is described by that error and by nothing else. Which
    sentence that refusal carries is the existing `invalidIdentifier` test's job;
    this one runs the same refusal only to read the attribute, which is the half
    of it that test cannot see.

    The third claim is the exit, and it is here for the same reason the absent
    attribute is: `loginCreateAccount` is missing from a sheet in which nothing has
    been refused, so the control cannot be mistaken for something the app offers
    whoever opens it.
  */
  test(
    'The nickname sentence is printed once, the field described only by a refusal, and the exit waits for one',
    async ({ page }) => {
      await page.getByTestId('OpenLogin').click();

      const dialog = page.getByTestId('dialogContent');
      await expect(dialog).toBeVisible();

      /*
        Visible before it is denied anything: a negative attribute assertion is also
        satisfied by an element that is not on the page at all, so without this the
        two assertions about `aria-describedby` below would pass against a sheet
        with no field on it.
      */
      const identifier = page.getByTestId('loginIdentifier');
      await expect(identifier).toBeVisible();

      // The DOM's text rather than the rendered text, so a soft line break inside
      // the description cannot split the clause that is being counted.
      const sheetText = (await dialog.textContent()) ?? '';

      expect(
        sheetText.split(dict.loginDescription).length - 1,
        'the sheet reads its description once, with the title'
      ).toBe(1);
      expect(
        sheetText.split(NICKNAME_SENTENCE).length - 1,
        'the sentence about the nickname belongs to that description and to nothing else'
      ).toBe(1);

      await expect(
        identifier,
        'a field described by a constant describes nothing about what was typed'
      ).not.toHaveAttribute('aria-describedby');

      // And no way out before anything has been refused: this button answers a
      // refusal, and printing it in front of a reader who has not failed yet is a
      // suggestion about whether they have an account.
      await expect(page.getByTestId('loginCreateAccount')).toHaveCount(0);

      await page.getByTestId('loginIdentifier').fill('!!!');
      await page.getByTestId('loginPassword').fill(PASSWORD);
      await page.getByTestId('SubmitLogin').click();

      await expect(page.getByTestId('loginIdentifierError')).toBeVisible({
        timeout: 10000,
      });
      await expect(identifier).toHaveAttribute(
        'aria-describedby',
        'loginIdentifierError'
      );
    }
  );

  test(
    'A wrong password is refused with the one sentence and a way into registration',
    async ({ page }) => {
      /*
        Counted rather than read off the render. A `<button>` with no type inside a
        form re-posts it, so an exit that had lost its `type` would send the very
        credentials that were just refused a second time, from a control whose label
        says "create an account". What the assertions below see is the second answer
        and not the second request: it fills the shared `passwordError` slot and the
        register sheet prints `registerPasswordError` in a form the refusal has
        nothing to do with - and if that answer never comes back at all, the sheet
        prints nothing and the credentials have still gone out twice. This is the one
        assertion here that measures the request instead of what it leaves behind.
      */
      let signInRequests = 0;
      page.on('request', (request) => {
        if (request.url().includes('/api/auth/login')) signInRequests += 1;
      });

      await page.getByTestId('OpenLogin').click();
      await page.getByTestId('loginIdentifier').fill(ANNA);
      await page.getByTestId('loginPassword').fill('definitely-not-the-password');
      await page.getByTestId('SubmitLogin').click();

      /*
        The sentence, and which one it is. The route answers an unknown identifier
        and a wrong password with the same 401 on purpose, so the wording that is
        true of both is the only wording this sheet may print; nothing here decides
        which of the two the reader got wrong, because the product does not know
        either.
      */
      const passwordError = page.getByTestId('loginPasswordError');
      await expect(passwordError).toBeVisible({ timeout: 10000 });
      expect(await passwordError.textContent()).toContain(
        dict.errors.loginRejected
      );

      // Printed under the failure it answers, in the dictionary's own words.
      const exit = page.getByTestId('loginCreateAccount');
      await expect(exit).toBeVisible();
      await expect(exit).toContainText(dict.errors.createAccountInstead);

      await exit.click();

      /*
        A real door, and a clean one. The sign-in sheet closes and the registration
        sheet is there with its own submit - and the verdict did not follow the
        reader into it, because both sheets read the same error slots: a refusal
        left standing would be waiting under a password field in a form that has
        nothing to do with it.
      */
      await expect(page.getByTestId('SubmitRegister')).toBeVisible();
      await expect(page.getByTestId('SubmitLogin')).toHaveCount(0);
      await expect(page.getByTestId('registerPasswordError')).toHaveCount(0);

      expect(
        signInRequests,
        'the exit must not re-post the credentials it was printed under'
      ).toBe(1);
    }
  );

  /*
    The next two tests are the only ones here that touch the network, and they
    need the service worker out of the way. `public/sw.js` declines `/api/`, so
    Chromium and Firefox let `page.route` reach the request anyway - but WebKit
    hands the fetch to the registered worker first, the request never reaches the
    network stack Playwright is intercepting, and both tests fail on a page that
    is behaving correctly. Blocking the worker for these two tests costs nothing:
    neither of them is about the worker.
   */
  test.describe('the two branches that need the network', () => {
    test.use({ serviceWorkers: 'block' });

    test(
      'A sign-in that never reached the server is answered as a lost connection',
      async ({ page }) => {
        /*
        The network is the only way into this branch, and it is a deliberate one:
        nothing in the app fails on demand, and the two branches above are about
        what the server *said*, which is the one thing a dead connection cannot
        say. Aborted rather than answered with a status, because a status would
        make this test about the sentence for a status - which the next test owns.
      */
        await page.route('**/api/auth/login', (route) => route.abort());

        await page.getByTestId('OpenLogin').click();
        await page.getByTestId('loginIdentifier').fill(ANNA);
        await page.getByTestId('loginPassword').fill(PASSWORD);
        await page.getByTestId('SubmitLogin').click();

        const passwordError = page.getByTestId('loginPasswordError');
        await expect(passwordError).toBeVisible({ timeout: 10000 });
        expect(await passwordError.textContent()).toContain(
          dict.errors.loginOffline
        );

        // And no way out of it: this failure is on this side of the wire, and an
        // offer to register does not answer "try again".
        await expect(page.getByTestId('loginCreateAccount')).toHaveCount(0);
      }
    );

    test(
      'A sign-in the server failed is answered differently from a refusal',
      async ({ page }) => {
        /*
        Fulfilled with a JSON body, and that is load-bearing: `login()` throws on a
        body it cannot parse, and the `catch` answers `loginOffline`. A bare
        `status: 500` would therefore land in the sentence the previous test owns -
        passing or failing for a reason that has nothing to do with the 5xx branch.
      */
      await page.route('**/api/auth/login', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({}),
        })
      );

      await page.getByTestId('OpenLogin').click();
      await page.getByTestId('loginIdentifier').fill(ANNA);
      await page.getByTestId('loginPassword').fill(PASSWORD);
      await page.getByTestId('SubmitLogin').click();

      const passwordError = page.getByTestId('loginPasswordError');
      await expect(passwordError).toBeVisible({ timeout: 10000 });
      expect(await passwordError.textContent()).toContain(
        dict.errors.loginServerError
      );

      /*
        The server broke rather than the values, and the two want opposite advice:
        a refusal is answered by doing something else, a fault by doing the same
        thing again in a moment. The exit into registration follows the sentence
        and not the other way round - showing it after a fault would suggest the
        reader has no account, which is exactly the thing this sheet may not say.
      */
      await expect(page.getByTestId('loginCreateAccount')).toHaveCount(0);
    }
  );
  });
});