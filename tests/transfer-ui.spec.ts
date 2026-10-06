import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import * as de from '@/lib/translations/de.json';
import * as en from '@/lib/translations/en.json';
import * as ru from '@/lib/translations/ru.json';
import { selectedCountLabel } from '@/lib/gift-count';
import type { LanguageCode, Translations } from '@/types';

/*
  THE TRANSFER, AS THE PERSON USING IT SEES IT.

  The other two files that carry this feature are HTTP-only and say so:
  `sharing.spec.ts` asks who may start a transfer, and `gift-fields.spec.ts` asks what
  the wishes look like once one has happened, including that a request sent twice
  lands once. Both stop at the response. This file is the half neither of them can
  reach, and it exists because a green run of those two says nothing about whether
  the sheet sends the right request, keeps its state when the answer is a failure, or
  tells the reader what went wrong:

    - the selection mode, the bar and the long-press that starts a selection;
    - the destination dialog in each of its states;
    - that the sheet sends the SAME attempt name on a second press - the server half
      of "pressing again is safe" is proved over HTTP, but only a browser can show the
      button actually sends it twice under one name;
    - that a refusal code is turned into the right sentence, and that the sheet
      reloads and shrinks its selection rather than leaving a wish nobody can see in
      the batch;
    - that a buyer is shown none of it;
    - the real words in all three shipped languages;
    - that the commit button stays reachable when an account has many lists.

  What is deliberately NOT here: the permission matrix (`sharing.spec.ts`), the
  moved-keeps-the-mark rule (`gift-fields.spec.ts` pins it from the response; the move
  test below checks only that the sheet shows it), and the plural rule itself
  (`tests/unit/gift-count.test.ts`).

  Expected strings come from the dictionaries rather than being written out, and that
  is a choice about what these tests are for. They are about *wiring* - this
  situation shows that sentence - so a copy edit must not break them, while pointing
  a refusal at the wrong key must. The one thing a dictionary cannot tell a test is
  whether the words are good, and no assertion here pretends to.

  Setup goes through the API and the actions go through the page, so the page is what
  is under test and the fixtures are not.
*/

const prisma = new PrismaClient();

const PASSWORD = 'test1234';
const ANNA = 'anna@example.test';
const BEN = 'ben@example.test';

const DICTIONARIES: Record<LanguageCode, Translations> = { de, en, ru };
const dict = DICTIONARIES.de;

type Actor = { context: BrowserContext; page: Page };

/*
  Every list this spec creates is named with this prefix and removed afterwards, for
  the reason `sharing.spec.ts` gives: the suite writes to whatever database it is
  pointed at, and the contents page of the seeded accounts should not grow a row per
  run.
*/
const TEST_LIST_PREFIX = 'e2e-transfer-ui-';
let listCounter = 0;
const createdLists: string[] = [];

test.afterAll(async () => {
  if (createdLists.length > 0) {
    await prisma.gift.deleteMany({ where: { listId: { in: createdLists } } });
    await prisma.listAccess.deleteMany({ where: { listId: { in: createdLists } } });
    await prisma.listGroupAccess.deleteMany({
      where: { listId: { in: createdLists } },
    });
    await prisma.list.deleteMany({ where: { id: { in: createdLists } } });
  }
  await prisma.$disconnect();
});

const signIn = async (browser: Browser, identifier: string): Promise<Actor> => {
  const context = await browser.newContext();
  const response = await context.request.post('/api/auth/login', {
    data: { identifier, password: PASSWORD },
  });
  expect(
    response.ok(),
    `sign-in failed for ${identifier}: ${response.status()} ${await response.text()}`
  ).toBe(true);
  return { context, page: await context.newPage() };
};

const createList = async (
  actor: Actor,
  visibility: 'PRIVATE' | 'SHARED' = 'PRIVATE'
): Promise<string> => {
  const name = `${TEST_LIST_PREFIX}${process.pid}-${(listCounter += 1)}`;
  const response = await actor.context.request.post('/api/lists', {
    data: { name, visibility },
  });
  expect(
    response.ok(),
    `creating ${name} failed: ${response.status()} ${await response.text()}`
  ).toBe(true);
  const id = (await response.json()).list.id as string;
  createdLists.push(id);
  return id;
};

const addGift = async (
  actor: Actor,
  listId: string,
  title: string
): Promise<string> => {
  const response = await actor.context.request.post(`/api/lists/${listId}/gifts`, {
    data: { title },
  });
  expect(
    response.ok(),
    `adding "${title}" failed: ${response.status()} ${await response.text()}`
  ).toBe(true);
  return (await response.json()).gift.id as string;
};

const grant = (actor: Actor, listId: string, email: string) =>
  actor.context.request.post(`/api/lists/${listId}/access`, { data: { email } });

const sheetOf = async (
  actor: Actor,
  listId: string
): Promise<
  { id: string; title: string; isPurchased: boolean; canClear: boolean }[]
> => {
  const response = await actor.context.request.get(`/api/lists/${listId}`);
  expect(response.status(), `reading ${listId}`).toBe(200);
  return (await response.json()).gifts;
};

const titlesOf = async (actor: Actor, listId: string) =>
  (await sheetOf(actor, listId)).map((gift) => gift.title).sort();

/** A sheet, open and loaded - the cards are what the page waits for. */
const openSheet = async (
  page: Page,
  listId: string,
  lang: LanguageCode = 'de'
) => {
  await page.goto(`/${lang}/list/${listId}`);
  await expect(page.getByTestId('giftCard').first()).toBeVisible();
};

const enterMode = (page: Page, mode: 'copy' | 'move', lang: LanguageCode = 'de') =>
  page
    .getByRole('button', {
      name:
        mode === 'copy'
          ? DICTIONARIES[lang].listSheet.copy
          : DICTIONARIES[lang].listSheet.move,
      exact: true,
    })
    .click();

const tick = (page: Page, title: string) =>
  page
    .getByTestId('giftCard')
    .filter({ hasText: title })
    .getByTestId('giftSelect')
    .click();

/** The bar's sentence for `count` wishes, worded by the real function and dictionary. */
const expectCount = (page: Page, count: number, lang: LanguageCode = 'de') =>
  expect(page.getByTestId('selectedCount')).toHaveText(
    selectedCountLabel(count, lang, DICTIONARIES[lang].listSheet)
  );

const openDialog = async (page: Page) => {
  await page.getByTestId('chooseTargetButton').click();
  await expect(page.getByTestId('transferDialog')).toBeVisible();
};

const pick = (page: Page, listId: string) =>
  page.getByTestId(`transferTarget-${listId}`).click();

const commitButton = (page: Page, mode: 'copy' | 'move') =>
  page.getByTestId(mode === 'copy' ? 'transferCopyHere' : 'transferMoveHere');

const toast = (page: Page, text: string) =>
  page.locator('[data-sonner-toast]', { hasText: text });

const atList = (page: Page, listId: string) =>
  expect(page).toHaveURL(new RegExp(`/list/${listId}$`));

/**
 * Hold a pointer on one card the way a finger would, without a finger.
 *
 * Synthetic pointer events, because the press is a timer started by `pointerdown` and
 * ended by `pointerup`, and that is all the handler reads. Which pointer it was matters:
 * the long-press is for touch, and a mouse must not start a selection by resting.
 */
const press = (
  page: Page,
  index: number,
  pointerType: 'touch' | 'mouse',
  holdMs: number,
  moveX = 0
) =>
  page.evaluate(
    async ({ index, pointerType, holdMs, moveX }) => {
      const card = document.querySelectorAll('[data-testid=giftCard]')[index];
      const rect = card.getBoundingClientRect();
      const at = (dx: number) => ({
        pointerType,
        button: 0,
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2 + dx,
        clientY: rect.top + rect.height / 2,
        pointerId: 7,
        isPrimary: true,
      });
      card.dispatchEvent(new PointerEvent('pointerdown', at(0)));
      if (moveX) card.dispatchEvent(new PointerEvent('pointermove', at(moveX)));
      await new Promise((resolve) => setTimeout(resolve, holdMs));
      card.dispatchEvent(new PointerEvent('pointerup', at(moveX)));
      await new Promise((resolve) => setTimeout(resolve, 50));
      return (card as HTMLElement).dataset.selected ?? null;
    },
    { index, pointerType, holdMs, moveX }
  );

/** A request that reaches the server and whose answer the page never hears. */
const loseTheFirstReply = async (page: Page) => {
  let calls = 0;
  await page.route('**/gifts/transfer', async (route) => {
    calls += 1;
    if (calls === 1) {
      await route.fetch();
      await route.abort('failed');
      return;
    }
    await route.continue();
  });
};

const recordTransfers = (page: Page) => {
  const sent: { giftIds: string[]; requestId?: string }[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/gifts/transfer')) sent.push(request.postDataJSON());
  });
  return sent;
};

test.describe('Selecting and sending wishes from a sheet', () => {
  test('a copy: the bar counts, the dialog commits, the sheet goes to the other list', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const sourceId = await createList(anna, 'SHARED');
    const targetId = await createList(anna);
    const flowers = await addGift(anna, sourceId, 'Blumen');
    const chocolate = await addGift(anna, sourceId, 'Schokolade');
    await addGift(anna, sourceId, 'Kerze');
    await grant(anna, sourceId, BEN);
    // Bought by somebody else, so the copy has something it must NOT carry along.
    const marked = await ben.context.request.post(
      `/api/lists/${sourceId}/gifts/${chocolate}/toggle`
    );
    expect(marked.ok()).toBe(true);

    const { page } = anna;
    await openSheet(page, sourceId);
    await enterMode(page, 'copy');

    // The bar is there before anything is ticked, and says so in numbers rather than
    // hiding: zero is a state a reader is in, not an error. The commit is not offered.
    await expect(page.getByTestId('selectionBar')).toBeVisible();
    await expectCount(page, 0);
    await expect(page.getByTestId('chooseTargetButton')).toBeDisabled();

    await tick(page, 'Blumen');
    await expectCount(page, 1);
    await tick(page, 'Schokolade');
    await expectCount(page, 2);
    await expect(page.getByTestId('chooseTargetButton')).toBeEnabled();

    await openDialog(page);
    await expect(page.getByTestId('transferDialogTitle')).toHaveText(
      dict.transferDialog.title
    );
    // Nothing is chosen, so nothing can be sent: one commit, and it waits.
    await expect(commitButton(page, 'copy')).toBeDisabled();
    await expect(commitButton(page, 'copy')).toHaveText(
      dict.transferDialog.copyHere
    );

    await pick(page, targetId);
    await expect(commitButton(page, 'copy')).toBeEnabled();
    await commitButton(page, 'copy').click();

    await expect(toast(page, dict.toasts.giftsCopied)).toBeVisible();
    await atList(page, targetId);

    const arrived = await sheetOf(anna, targetId);
    expect(arrived.map((gift) => gift.title).sort()).toEqual(['Blumen', 'Schokolade']);
    expect(
      arrived.every((gift) => !gift.isPurchased),
      'a copy arrives open, the bought one included'
    ).toBe(true);

    // And the original is exactly as it was, mark and all.
    const original = await sheetOf(anna, sourceId);
    expect(original).toHaveLength(3);
    expect(original.find((gift) => gift.id === chocolate)?.isPurchased).toBe(true);
    expect(original.some((gift) => gift.id === flowers)).toBe(true);

    await anna.context.close();
    await ben.context.close();
  });

  test('a move: the wishes leave, and a bought one arrives bought', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const sourceId = await createList(anna, 'SHARED');
    const targetId = await createList(anna);
    await addGift(anna, sourceId, 'Blumen');
    const chocolate = await addGift(anna, sourceId, 'Schokolade');
    await addGift(anna, sourceId, 'Kerze');
    await grant(anna, sourceId, BEN);
    const marked = await ben.context.request.post(
      `/api/lists/${sourceId}/gifts/${chocolate}/toggle`
    );
    expect(marked.ok(), 'Ben must be able to mark it').toBe(true);

    const { page } = anna;
    await openSheet(page, sourceId);
    await enterMode(page, 'move');
    await tick(page, 'Blumen');
    await tick(page, 'Schokolade');
    await openDialog(page);
    await pick(page, targetId);
    await expect(commitButton(page, 'move')).toHaveText(dict.transferDialog.moveHere);
    await commitButton(page, 'move').click();

    await expect(toast(page, dict.toasts.giftsMoved)).toBeVisible();
    await atList(page, targetId);

    expect(await titlesOf(anna, sourceId)).toEqual(['Kerze']);
    const arrived = await sheetOf(anna, targetId);
    expect(arrived.map((gift) => gift.title).sort()).toEqual(['Blumen', 'Schokolade']);
    // The sheet the reader landed on shows it: the bought wish is on the target as a
    // bought one, and it is not theirs to clear.
    const bought = arrived.find((gift) => gift.title === 'Schokolade');
    expect(bought?.isPurchased).toBe(true);
    expect(bought?.canClear).toBe(false);
    await expect(
      page.getByTestId('giftCard').filter({ hasText: 'Schokolade' })
    ).toBeVisible();

    await anna.context.close();
    await ben.context.close();
  });

  test('cancelling leaves the mode and drops the selection', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);
    const sourceId = await createList(anna);
    await addGift(anna, sourceId, 'Blumen');
    await addGift(anna, sourceId, 'Kerze');

    const { page } = anna;
    await openSheet(page, sourceId);
    await enterMode(page, 'copy');
    await expect(page.getByTestId('giftSelect')).toHaveCount(2);
    await tick(page, 'Blumen');
    await expectCount(page, 1);

    await page.getByTestId('clearSelection').click();
    await expect(page.getByTestId('selectionBar')).toHaveCount(0);
    await expect(page.getByTestId('giftSelect')).toHaveCount(0);
    // Back on the ordinary sheet, and a second go starts from nothing rather than from
    // the wish that was ticked.
    await enterMode(page, 'move');
    await expectCount(page, 0);

    await anna.context.close();
  });

  test('a long press starts a selection on touch, and only on touch', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const sourceId = await createList(anna);
    await addGift(anna, sourceId, 'Blumen');
    await addGift(anna, sourceId, 'Kerze');

    const { page } = anna;
    await openSheet(page, sourceId);

    // Outside the mode the gesture means nothing: no bar appears and nothing is marked.
    expect(await press(page, 0, 'touch', 650)).toBeNull();
    await expect(page.getByTestId('selectionBar')).toHaveCount(0);

    await enterMode(page, 'copy');
    expect(await press(page, 0, 'touch', 650), 'held on touch').toBe('true');
    await expectCount(page, 1);
    expect(await press(page, 1, 'touch', 200), 'released early').toBeNull();
    expect(await press(page, 1, 'touch', 650, 30), 'finger moved off').toBeNull();
    expect(await press(page, 1, 'mouse', 650), 'a mouse resting is not a press').toBeNull();
    // The same gesture again takes the wish back out.
    expect(await press(page, 0, 'touch', 650)).toBeNull();
    await expectCount(page, 0);

    await anna.context.close();
  });

  test('a long press on a control selects the wish and does not press the control', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const listId = await createList(anna);
    await addGift(anna, listId, 'Blumen');

    const { page } = anna;
    // Counted as requests rather than read back from the API: pressing the mark starts a
    // request in the same breath, and a read-back a moment later can run before that
    // request has landed and report a wish that is about to change as unchanged.
    const toggles: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/toggle')) toggles.push(request.url());
    });
    await openSheet(page, listId);

    // Outside any press, a right-click keeps its menu: only a touch hold refuses it.
    const rightClick = await page.evaluate(() => {
      const card = document.querySelector('[data-testid=giftCard]')!;
      const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      card.dispatchEvent(menu);
      return menu.defaultPrevented;
    });
    expect(rightClick, 'a mouse right-click is not ours to refuse').toBe(false);

    await enterMode(page, 'copy');

    /*
      The cell has a mark button of its own and only the checkbox opts out of the press,
      so a thumb held on the cart is a long press on a control. What the browser does as
      the finger lifts is not up to the cell: many touch browsers still deliver a click
      to whatever is underneath, and some raise their own context menu while it is held.
      Both are simulated here, because both are what a browser may do and neither may
      change a wish.
    */
    const held = await page.evaluate(async () => {
      const card = document.querySelector('[data-testid=giftCard]') as HTMLElement;
      const control = card.querySelector('button') as HTMLElement;
      const rect = control.getBoundingClientRect();
      const at = {
        pointerType: 'touch',
        button: 0,
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        pointerId: 9,
        isPrimary: true,
      };
      control.dispatchEvent(new PointerEvent('pointerdown', at));
      await new Promise((resolve) => setTimeout(resolve, 650));
      const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      control.dispatchEvent(menu);
      control.dispatchEvent(new PointerEvent('pointerup', at));
      control.click();
      await new Promise((resolve) => setTimeout(resolve, 150));
      return { selected: card.dataset.selected ?? null, menuRefused: menu.defaultPrevented };
    });

    expect(held.selected, 'the hold selected the wish').toBe('true');
    expect(held.menuRefused, 'and the browser menu did not open over it').toBe(true);
    expect(
      toggles,
      'the click that followed the hold must not have pressed the mark'
    ).toHaveLength(0);
    expect((await sheetOf(anna, listId))[0].isPurchased).toBe(false);

    // The one click is spent, not the control: an ordinary tap on it afterwards works.
    await page.getByTestId('giftCard').first().locator('button').first().click();
    await expect.poll(() => toggles.length).toBe(1);
    await expect
      .poll(async () => (await sheetOf(anna, listId))[0].isPurchased)
      .toBe(true);

    await anna.context.close();
  });

  test('the dialog offers the lists you own, and not the one you are on', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const sourceId = await createList(anna);
    const targetId = await createList(anna);
    await addGift(anna, sourceId, 'Blumen');
    // Somebody else's list that Anna can read. A destination is gated by ownership, so
    // offering it would be offering a row the server refuses.
    const bensId = await createList(ben, 'SHARED');
    // Asserted, because the "is not offered" checks below are only a claim if Anna really
    // can read this list: a grant that failed unnoticed would make them true for the
    // wrong reason - the same hole `sharing.spec.ts` had on its destination test.
    const granted = await grant(ben, bensId, ANNA);
    expect(
      granted.ok(),
      `Ben must be able to put Anna on his list: ${granted.status()} ${await granted.text()}`
    ).toBe(true);

    const { page } = anna;
    await openSheet(page, sourceId);
    await enterMode(page, 'copy');
    await tick(page, 'Blumen');
    await openDialog(page);

    await expect(page.getByTestId(`transferTarget-${targetId}`)).toBeVisible();
    await expect(page.getByTestId(`transferTarget-${sourceId}`)).toHaveCount(0);
    await expect(page.getByTestId(`transferTarget-${bensId}`)).toHaveCount(0);
    // The dialog is titled by the sheet the wishes are leaving.
    await expect(page.getByTestId('transferDialog')).toContainText(
      (await prisma.list.findUniqueOrThrow({ where: { id: sourceId } })).name
    );

    await anna.context.close();
    await ben.context.close();
  });
});

test.describe('The destination dialog, in the states it can be in', () => {
  const isListIndex = (url: URL) => url.pathname === '/api/lists';

  test('a lists request that fails shows a sentence and a way to retry', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const sourceId = await createList(anna);
    const targetId = await createList(anna);
    await addGift(anna, sourceId, 'Blumen');

    const { page } = anna;
    // Slow and then refused, so both the waiting state and the failed one are on screen
    // long enough to be looked at; the retry is let through.
    let calls = 0;
    await page.route(isListIndex, async (route) => {
      calls += 1;
      if (calls === 1) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await route.abort('failed');
        return;
      }
      await route.continue();
    });

    await openSheet(page, sourceId);
    await enterMode(page, 'copy');
    await tick(page, 'Blumen');
    await openDialog(page);

    await expect(page.getByTestId('transferDialogLoading')).toBeVisible();
    await expect(commitButton(page, 'copy')).toBeDisabled();

    // A failed request, not an account with no lists: the sentence is about the
    // request and the "make a list" invitation is not shown.
    await expect(page.getByTestId('transferDialogError')).toContainText(
      dict.transferDialog.error
    );
    await expect(page.getByTestId('transferDialogNoLists')).toHaveCount(0);

    await page.getByTestId('transferDialogRetry').click();
    await expect(page.getByTestId(`transferTarget-${targetId}`)).toBeVisible();
    await expect(page.getByTestId('transferDialogError')).toHaveCount(0);

    await anna.context.close();
  });

  test('an account with no other list is invited to make one, and cannot commit', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const sourceId = await createList(anna);
    await addGift(anna, sourceId, 'Blumen');

    const { page } = anna;
    await page.route(isListIndex, (route) =>
      route.fulfill({ json: { owned: [], shared: [] } })
    );

    await openSheet(page, sourceId);
    await enterMode(page, 'move');
    await tick(page, 'Blumen');
    await openDialog(page);

    await expect(page.getByTestId('transferDialogNoLists')).toHaveText(
      dict.listBoard.noLists
    );
    await expect(page.getByTestId('transferDialogError')).toHaveCount(0);
    await expect(commitButton(page, 'move')).toBeDisabled();

    await anna.context.close();
  });

  test('while the request is in flight the button says so and nothing can be changed', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const sourceId = await createList(anna);
    const targetId = await createList(anna);
    await addGift(anna, sourceId, 'Blumen');

    const { page } = anna;
    await page.route('**/gifts/transfer', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await openSheet(page, sourceId);
    await enterMode(page, 'copy');
    await tick(page, 'Blumen');
    await openDialog(page);
    await pick(page, targetId);
    await commitButton(page, 'copy').click();

    // The pressed button is what swaps to its own progress wording, and it and the
    // rows are inert until the answer comes - a second press would be a second attempt.
    await expect(commitButton(page, 'copy')).toHaveText(dict.transferDialog.copying);
    await expect(commitButton(page, 'copy')).toBeDisabled();
    await expect(page.getByTestId(`transferTarget-${targetId}`)).toBeDisabled();

    await expect(toast(page, dict.toasts.giftsCopied)).toBeVisible();
    await atList(page, targetId);

    await anna.context.close();
  });
});

test.describe('When the answer is lost, pressing again is safe', () => {
  for (const mode of ['copy', 'move'] as const) {
    test(`a ${mode} whose reply never arrives can be sent again`, async ({
      browser,
    }) => {
      const anna = await signIn(browser, ANNA);
      const sourceId = await createList(anna);
      const targetId = await createList(anna);
      await addGift(anna, sourceId, 'Blumen');
      await addGift(anna, sourceId, 'Kerze');

      const { page } = anna;
      const sent = recordTransfers(page);
      await loseTheFirstReply(page);

      await openSheet(page, sourceId);
      await enterMode(page, mode);
      await tick(page, 'Blumen');
      await tick(page, 'Kerze');
      await openDialog(page);
      await pick(page, targetId);
      await commitButton(page, mode).click();

      // The page heard nothing, so it says the batch failed - and keeps everything the
      // reader had: the dialog, the chosen row and the selection. Pressing again is one
      // tap, which is the whole reason it does not throw them away.
      await expect(toast(page, dict.toasts.giftsTransferFailed)).toBeVisible();
      await expect(page.getByTestId('transferDialog')).toBeVisible();
      await expect(page.getByTestId(`transferTarget-${targetId}`)).toBeChecked();
      await expectCount(page, 2);
      // Server-side it had already happened: that is what makes this a lost reply and
      // not a failure.
      expect(await prisma.gift.count({ where: { listId: targetId } })).toBe(2);

      await expect(commitButton(page, mode)).toBeEnabled();
      await commitButton(page, mode).click();

      await expect(
        toast(page, mode === 'copy' ? dict.toasts.giftsCopied : dict.toasts.giftsMoved)
      ).toBeVisible();
      await atList(page, targetId);

      expect(sent).toHaveLength(2);
      expect(sent[0].requestId, 'the sheet names the attempt').toBeTruthy();
      expect(
        sent[1].requestId,
        'and the second press is the SAME attempt, not a new one'
      ).toBe(sent[0].requestId);

      expect(
        await prisma.gift.count({ where: { listId: targetId } }),
        'two wishes were sent, so two are there - not four'
      ).toBe(2);
      expect(await prisma.gift.count({ where: { listId: sourceId } })).toBe(
        mode === 'copy' ? 2 : 0
      );

      await anna.context.close();
    });
  }

  test('a fresh batch after a success is a new attempt', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);
    const sourceId = await createList(anna);
    const targetId = await createList(anna);
    await addGift(anna, sourceId, 'Blumen');

    const { page } = anna;
    const sent = recordTransfers(page);

    // The same wish copied onto the same list twice, as two separate decisions. The
    // attempt name must not outlive a success, or the second copy is silently skipped
    // and "I want flowers again" stops working.
    for (let round = 0; round < 2; round += 1) {
      await openSheet(page, sourceId);
      await enterMode(page, 'copy');
      await tick(page, 'Blumen');
      await openDialog(page);
      await pick(page, targetId);
      await commitButton(page, 'copy').click();
      await atList(page, targetId);
    }

    expect(sent).toHaveLength(2);
    expect(sent[1].requestId).not.toBe(sent[0].requestId);
    expect(await prisma.gift.count({ where: { listId: targetId } })).toBe(2);

    await anna.context.close();
  });
});

test.describe('When the server refuses, the reader is told why', () => {
  test('a wish that is gone: the sentence, a reload, a smaller selection, and a way on', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const sourceId = await createList(anna);
    const targetId = await createList(anna);
    await addGift(anna, sourceId, 'Blumen');
    const gone = await addGift(anna, sourceId, 'Kerze');
    await addGift(anna, sourceId, 'Buch');

    const { page } = anna;
    await openSheet(page, sourceId);
    await enterMode(page, 'copy');
    await tick(page, 'Blumen');
    await tick(page, 'Kerze');
    await expectCount(page, 2);
    await openDialog(page);
    await pick(page, targetId);

    // Somebody deletes one of the two while they are ticked here.
    const deleted = await anna.context.request.delete(
      `/api/lists/${sourceId}/gifts/${gone}`
    );
    expect(deleted.ok()).toBe(true);

    await commitButton(page, 'copy').click();
    await expect(toast(page, dict.toasts.giftsTransferNotFound)).toBeVisible();

    // The sheet behind the dialog reloaded, and the wish that is no longer on it is no
    // longer in the batch. Without that the bar would keep counting a wish nobody can
    // untick, and every further press would be refused for it.
    await expectCount(page, 1);
    await expect(page.getByTestId('giftSelect')).toHaveCount(2);
    await expect(page.getByTestId('transferDialog')).toBeVisible();
    await expect(page.getByTestId(`transferTarget-${targetId}`)).toBeChecked();

    await commitButton(page, 'copy').click();
    await expect(toast(page, dict.toasts.giftsCopied)).toBeVisible();
    await atList(page, targetId);
    expect(await titlesOf(anna, targetId)).toEqual(['Blumen']);

    await anna.context.close();
  });

  test('a destination that is gone: the sentence, and it is no longer offered', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const sourceId = await createList(anna);
    const doomedId = await createList(anna);
    const survivorId = await createList(anna);
    await addGift(anna, sourceId, 'Blumen');

    const { page } = anna;
    await openSheet(page, sourceId);
    await enterMode(page, 'copy');
    await tick(page, 'Blumen');
    await openDialog(page);
    await pick(page, doomedId);
    await expect(commitButton(page, 'copy')).toBeEnabled();

    const deleted = await anna.context.request.delete(`/api/lists/${doomedId}`);
    expect(deleted.ok()).toBe(true);

    await commitButton(page, 'copy').click();
    await expect(toast(page, dict.toasts.giftsTransferNotFound)).toBeVisible();

    // The picker was reloaded, the list that is gone is not in it, and - the part that
    // is easy to miss - the button is not left armed for a choice that no longer
    // exists, which would send the reader into the same refusal again.
    await expect(page.getByTestId(`transferTarget-${doomedId}`)).toHaveCount(0);
    await expect(page.getByTestId(`transferTarget-${survivorId}`)).toBeVisible();
    await expect(commitButton(page, 'copy')).toBeDisabled();
    await expectCount(page, 1);

    await pick(page, survivorId);
    await commitButton(page, 'copy').click();
    await atList(page, survivorId);
    expect(await titlesOf(anna, survivorId)).toEqual(['Blumen']);

    await anna.context.close();
  });

  test('more wishes than one batch may carry: the sentence, nothing moved, and the limit works', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const sourceId = await createList(anna);
    const targetId = await createList(anna);

    // Straight into the table: a hundred and one `POST`s would make this the slowest
    // fixture in the suite for a state it only needs to count.
    await prisma.gift.createMany({
      data: Array.from({ length: 101 }, (_, index) => ({
        title: `Wunsch ${index + 1}`,
        listId: sourceId,
      })),
    });

    const { page } = anna;
    await openSheet(page, sourceId);
    await enterMode(page, 'move');
    await page.evaluate(() => {
      document
        .querySelectorAll<HTMLInputElement>('[data-testid=giftSelect]')
        .forEach((box) => {
          if (!box.checked) box.click();
        });
    });
    await expectCount(page, 101);
    await openDialog(page);
    await pick(page, targetId);
    await commitButton(page, 'move').click();

    await expect(toast(page, dict.toasts.giftsTransferTooMany)).toBeVisible();
    await expect(page.getByTestId('transferDialog')).toBeVisible();
    await expectCount(page, 101);
    expect(await prisma.gift.count({ where: { listId: sourceId } })).toBe(101);
    expect(await prisma.gift.count({ where: { listId: targetId } })).toBe(0);

    // One fewer is the limit, and the same dialog gets it through.
    await page.getByTestId('transferCancel').click();
    await page.getByTestId('giftSelect').last().click();
    await expectCount(page, 100);
    await openDialog(page);
    await pick(page, targetId);
    await commitButton(page, 'move').click();
    await atList(page, targetId);
    expect(await prisma.gift.count({ where: { listId: sourceId } })).toBe(1);
    expect(await prisma.gift.count({ where: { listId: targetId } })).toBe(100);

    await anna.context.close();
  });
});

test.describe('What a buyer is shown', () => {
  test('none of it: no verbs, no boxes, and a long press starts nothing', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const listId = await createList(anna, 'SHARED');
    await addGift(anna, listId, 'Blumen');
    await addGift(anna, listId, 'Kerze');
    await grant(anna, listId, BEN);

    const { page } = ben;
    await openSheet(page, listId);

    // Absent, not greyed out: a buyer cannot tell an inert control from a broken one,
    // and the server would refuse every one of them anyway (`sharing.spec.ts`).
    await expect(
      page.getByRole('button', { name: dict.listSheet.copy, exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: dict.listSheet.move, exact: true })
    ).toHaveCount(0);
    await expect(page.getByTestId('giftSelect')).toHaveCount(0);

    expect(await press(page, 0, 'touch', 650)).toBeNull();
    await expect(page.getByTestId('selectionBar')).toHaveCount(0);

    await anna.context.close();
    await ben.context.close();
  });
});

test.describe('The words, in every language the product ships', () => {
  for (const lang of ['de', 'en', 'ru'] as const) {
    test(`${lang}: the verbs, the count, the title and a refusal come from the right keys`, async ({
      browser,
    }) => {
      const words = DICTIONARIES[lang];
      const anna = await signIn(browser, ANNA);
      const sourceId = await createList(anna);
      const doomedId = await createList(anna);
      await addGift(anna, sourceId, 'Blumen');

      const { page } = anna;
      await openSheet(page, sourceId, lang);
      await enterMode(page, 'copy', lang);
      await expectCount(page, 0, lang);
      await tick(page, 'Blumen');
      await expectCount(page, 1, lang);

      await openDialog(page);
      await expect(page.getByTestId('transferDialogTitle')).toHaveText(
        words.transferDialog.title
      );
      await pick(page, doomedId);
      await expect(commitButton(page, 'copy')).toHaveText(words.transferDialog.copyHere);

      // A refusal, because it is the one sentence that has to be picked by code and so
      // the one a wrong key would hide behind a plausible-looking toast.
      await anna.context.request.delete(`/api/lists/${doomedId}`);
      await commitButton(page, 'copy').click();
      await expect(toast(page, words.toasts.giftsTransferNotFound)).toBeVisible();

      await anna.context.close();
    });
  }
});

test.describe('The destination dialog with many lists', () => {
  const box = async (locator: Locator) => {
    const found = await locator.boundingBox();
    expect(found, 'the element must be on screen to be measured').not.toBeNull();
    return found!;
  };

  /*
    Measured only once the sheet has stopped moving. It comes in with an animation - a
    zoom on a desktop, a slide up from the bottom edge on a phone - and a box read
    mid-flight is a box 150px below where it ends up, which reads as exactly the
    failure this is looking for. The first version of this measured too early and
    reported a commit button at 817px on a 667px screen.
  */
  const settled = (page: Page) =>
    page
      .getByTestId('transferDialog')
      .evaluate((element) =>
        Promise.all(element.getAnimations().map((animation) => animation.finished))
      );

  const viewports = [
    { name: 'a desktop window', width: 1280, height: 800 },
    { name: 'a small phone', width: 375, height: 667 },
  ];

  for (const viewport of viewports) {
    test(`only the list scrolls, and the commit stays in the dialog on ${viewport.name}`, async ({
      browser,
    }) => {
      const anna = await signIn(browser, ANNA);
      const sourceId = await createList(anna);
      await addGift(anna, sourceId, 'Blumen');
      // Enough rows that they cannot all fit at these heights, whatever else the account
      // happens to own.
      for (let index = 0; index < 8; index += 1) await createList(anna);

      const { page } = anna;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openSheet(page, sourceId);
      await enterMode(page, 'copy');
      await tick(page, 'Blumen');
      await openDialog(page);

      const list = page.getByTestId('transferTargetList');
      await expect(list).toBeVisible();
      await settled(page);

      /*
        The two things a reader needs at the moment of choosing: the sentence that says
        what is being filed, and the button that files it. Both are measured against the
        dialog's own box rather than against the viewport, because the failure this pins
        was a button that sat inside the viewport and outside the sheet - clipped by the
        sheet's edge, visible as a sliver, and only reachable by scrolling the whole body.
      */
      const dialog = await box(page.getByTestId('transferDialog'));
      const title = await box(page.getByTestId('transferDialogTitle'));
      const commit = await box(commitButton(page, 'copy'));
      expect(title.y).toBeGreaterThanOrEqual(dialog.y);
      expect(commit.y + commit.height).toBeLessThanOrEqual(dialog.y + dialog.height);
      expect(commit.y + commit.height).toBeLessThanOrEqual(viewport.height);

      expect(
        await list.evaluate((element) => element.scrollHeight > element.clientHeight),
        'with this many rows the list is the thing that scrolls'
      ).toBe(true);
      expect(
        await page
          .locator('[data-testid=transferDialog] .sheet-body')
          .evaluate((element) => element.scrollHeight > element.clientHeight + 1),
        'and the dialog body is not'
      ).toBe(false);

      // Scroll the list to its end: the title and the button must not have moved, and the
      // last row must be reachable.
      await list.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      const titleAfter = await box(page.getByTestId('transferDialogTitle'));
      const commitAfter = await box(commitButton(page, 'copy'));
      expect(Math.abs(titleAfter.y - title.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(commitAfter.y - commit.y)).toBeLessThanOrEqual(1);
      const listBox = await box(list);
      const lastRow = await box(list.locator('li').last());
      expect(lastRow.y + lastRow.height).toBeLessThanOrEqual(listBox.y + listBox.height + 1);

      await anna.context.close();
    });
  }

  test('with a few lists nothing scrolls and nothing collapses', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);
    const sourceId = await createList(anna);
    await addGift(anna, sourceId, 'Blumen');
    await createList(anna);
    await createList(anna);

    const { page } = anna;
    // The real answer, cut down to two rows, whatever else the account owns.
    await page.route(
      (url) => url.pathname === '/api/lists',
      async (route) => {
        const real = await route.fetch();
        const body = await real.json();
        await route.fulfill({
          response: real,
          json: { ...body, owned: body.owned.slice(0, 2) },
        });
      }
    );
    await page.setViewportSize({ width: 1280, height: 800 });
    await openSheet(page, sourceId);
    await enterMode(page, 'copy');
    await tick(page, 'Blumen');
    await openDialog(page);

    const list = page.getByTestId('transferTargetList');
    await expect(list.locator('li')).toHaveCount(2);
    await settled(page);
    // The list is exactly its rows: the dialog hugs its content above `sm`, and a list
    // given `flex-1` there collapses to nothing, which is the failure this is for.
    const listBox = await list.boundingBox();
    expect(listBox!.height).toBeGreaterThan(100);
    expect(
      await list.evaluate((element) => element.scrollHeight > element.clientHeight + 1)
    ).toBe(false);
    const dialog = await page.getByTestId('transferDialog').boundingBox();
    expect(dialog!.height).toBeLessThan(800 * 0.85);

    await anna.context.close();
  });
});
