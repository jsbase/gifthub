import { test, expect, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:3000';
const OUT = path.join(process.cwd(), '.shots');
fs.mkdirSync(OUT, { recursive: true });

const GROUP = 'albumgroup';
const PASS = 'test123';

const MEMBERS = [
  {
    name: 'Anna',
    gifts: [
      {
        title: 'Mechanische Tastatur mit Hot-Swap-Schaltern',
        description:
          'Klicky, hot-swappable, ideally brown switches. Nothing wireless, please.',
        url: 'https://example.com/keyboard',
      },
      { title: 'Noise cancelling headphones', description: null, url: 'https://example.com/headphones' },
      { title: 'Desk lamp with warm dimmable light', description: null, url: null },
    ],
    collectLast: 2,
  },
  {
    name: 'Ben',
    gifts: [
      { title: 'Sneakers, Größe 43', description: 'Nicht die mit den Streifen, bitte.', url: 'https://example.com/sneakers' },
      { title: 'Плед из шерсти для дивана', description: null, url: null },
      { title: 'Cookbook: something simple', description: null, url: null },
    ],
    collectLast: 1,
  },
  { name: 'Mia', gifts: [], collectLast: 0 },
];

async function shoot(page, name, full = true) {
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full });
  console.log('shot', name);
}

async function login(page) {
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.getByTestId('OpenLogin').click();
  await page.fill('#groupName', GROUP);
  await page.fill('#password', PASS);
  await page.getByTestId('SubmitLogin').click();
  await page.waitForURL('**/dashboard', { timeout: 20000 });
  await page.waitForTimeout(1400);
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(240000);

test('seed', async ({ page }) => {
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.getByTestId('OpenRegister').click();
  await page.fill('#newGroupName', GROUP);
  await page.fill('#newPassword', PASS);
  await page.fill('#confirmPassword', PASS);
  await page.getByTestId('SubmitRegister').click();
  await page.waitForTimeout(1800);
  if (!(await page.locator('[role="dialog"]').isVisible())) {
    await page.getByTestId('OpenLogin').click();
  }
  await page.fill('#groupName', GROUP);
  await page.fill('#password', PASS);
  await page.getByTestId('SubmitLogin').click();
  await page.waitForURL('**/dashboard', { timeout: 20000 });
  await page.waitForTimeout(1200);

  for (const m of MEMBERS) {
    const res = await page.request.post(`${BASE}/api/members`, { data: { name: m.name } });
    const body = await res.json();
    if (!body.member) {
      console.log('member failed', m.name, res.status(), JSON.stringify(body));
      continue;
    }
    const ids: string[] = [];
    for (const g of m.gifts) {
      const r = await page.request.post(`${BASE}/api/gifts`, {
        data: { ...g, forMemberId: body.member.id },
      });
      const j = await r.json();
      if (j.gift) ids.push(j.gift.id);
    }
    for (let i = 0; i < (m.collectLast || 0); i += 1) {
      const id = ids[ids.length - 1 - i];
      if (!id) continue;
      await page.request.put(`${BASE}/api/gifts/${id}/toggle`, {
        data: { id },
      });
    }
  }
  console.log('seeded');
});

test('capture', async ({ page }) => {
  await login(page);
  await shoot(page, 'a1-dashboard-light');

  // Anna: open cells and collected cells in one sheet.
  await page.getByTestId('showGiftsDialog').first().click();
  await page.waitForTimeout(2000);
  await shoot(page, 'a2-sheet-light');

  // Measure overlay, dialog, and cells
  const m = await page.evaluate(() => {
    const overlay = document.querySelector('[data-testid="dialog-overlay"]');
    const dialog = document.querySelector('[role="dialog"]');
    const cells = document.querySelectorAll('[class*="bg-collected"], [class*="bg-cell"]');
    let openBg = null;
    let collectedBg = null;
    cells.forEach((cell) => {
      const bg = getComputedStyle(cell).backgroundColor;
      if (cell.className.includes('bg-collected') && !collectedBg) collectedBg = bg;
      if (cell.className.includes('bg-cell') && !cell.className.includes('bg-collected') && !openBg) openBg = bg;
    });
    return {
      overlayBg: overlay ? getComputedStyle(overlay).backgroundColor : null,
      dialogBg: dialog ? getComputedStyle(dialog).backgroundColor : null,
      openBg,
      collectedBg,
    };
  });
  console.log('MEASURED ' + JSON.stringify(m));

  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  // The add form.
  await page.getByTestId('showGiftsDialog').first().click();
  await page.waitForTimeout(800);
  await page.getByTestId('addGiftButton').click();
  await page.waitForTimeout(700);
  await shoot(page, 'a3-addform-light');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  // Empty sheet.
  await page.getByTestId('showGiftsDialog').last().click();
  await page.waitForTimeout(800);
  await shoot(page, 'a4-sheet-empty');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Dark.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await shoot(page, 'a5-dashboard-dark');
  await page.getByTestId('showGiftsDialog').first().click();
  await page.waitForTimeout(2000);
  await shoot(page, 'a6-sheet-dark');
  const dm = await page.evaluate(() => {
    const overlay = document.querySelector('[data-testid="dialog-overlay"]');
    const dialog = document.querySelector('[role="dialog"]');
    const cells = document.querySelectorAll('[class*="bg-collected"], [class*="bg-cell"]');
    let openBg = null;
    let collectedBg = null;
    cells.forEach((cell) => {
      const bg = getComputedStyle(cell).backgroundColor;
      if (cell.className.includes('bg-collected') && !collectedBg) collectedBg = bg;
      if (cell.className.includes('bg-cell') && !cell.className.includes('bg-collected') && !openBg) openBg = bg;
    });
    return {
      overlayBg: overlay ? getComputedStyle(overlay).backgroundColor : null,
      dialogBg: dialog ? getComputedStyle(dialog).backgroundColor : null,
      openBg,
      collectedBg,
    };
  });
  console.log('DARK ' + JSON.stringify(dm));
  await page.keyboard.press('Escape');
  await page.emulateMedia({ colorScheme: 'light' });

  // Landing, and the auth sheet.
  await page.goto(`${BASE}/de`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await shoot(page, 'a7-landing-de');
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.getByTestId('OpenLogin').click();
  await page.waitForTimeout(800);
  await shoot(page, 'a8-auth-light', false);
});

test('capture mobile', async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices['iPhone 12'] });
  const mp = await ctx.newPage();
  await mp.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await mp.getByTestId('OpenLogin').click();
  await mp.fill('#groupName', GROUP);
  await mp.fill('#password', PASS);
  await mp.getByTestId('SubmitLogin').click();
  await mp.waitForURL('**/dashboard', { timeout: 20000 });
  await mp.waitForTimeout(1600);
  await mp.screenshot({ path: path.join(OUT, 'a9-dashboard-mobile.png'), fullPage: true });
  await mp.getByTestId('showGiftsDialog').first().click();
  await mp.waitForTimeout(1100);
  await mp.screenshot({ path: path.join(OUT, 'b0-sheet-mobile.png'), fullPage: true });
  const mm = await mp.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };
    return {
      sheet: rect('[role="dialog"]'),
      tick: rect('[data-testid="giftStrikethrough"]'),
      delete: rect('[data-testid="giftDelete"]'),
    };
  });
  console.log('MOBILE ' + JSON.stringify(mm));
  await ctx.close();
});