import { test } from '@playwright/test';

const BASE = 'http://localhost:3000';
const GROUP = 'shotgroup';
const PASS = 'test123';

test.setTimeout(120000);

function lum(rgb: number[]) {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}
function ratio(a: number[], b: number[]) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const parse = (s: string) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

test('measure wishlist', async ({ page }) => {
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.getByTestId('OpenLogin').click();
  await page.fill('#groupName', GROUP);
  await page.fill('#password', PASS);
  await page.getByTestId('SubmitLogin').click();
  await page.waitForURL('**/dashboard', { timeout: 20000 });
  await page.waitForTimeout(1200);

  await page.getByTestId('showGiftsDialog').nth(1).click();
  await page.waitForTimeout(900);

  const boxes = page.getByTestId('giftStrikethrough');
  const n = await boxes.count();
  await boxes.nth(n - 1).click();
  await page.waitForTimeout(1200);

  const m = await page.evaluate(() => {
    const px = (el: Element | null, prop: string) =>
      el ? getComputedStyle(el)[prop] : null;
    const rect = (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };
    const title = document.querySelector('[data-testid="giftTitle"]');
    const bought = document.querySelector('.line-through');
    const box = document.querySelector('[data-testid="giftStrikethrough"]');
    const del = document.querySelector('[data-testid="giftDelete"]');
    const desc = document.querySelector('[data-testid="giftCard"] p, [data-testid="giftCard"] .text-\\[0\\.8125rem\\]');
    return {
      dialogBg: px(document.querySelector('[role="dialog"]'), 'backgroundColor'),
      dialogW: rect('[role="dialog"]'),
      dialogH: rect('[role="dialog"]'),
      titleSize: px(title, 'fontSize'),
      titleWeight: px(title, 'fontWeight'),
      titleColor: px(title, 'color'),
      titleDeco: px(title, 'textDecorationLine'),
      titleDecoThickness: px(title, 'textDecorationThickness'),
      titleDecoColor: px(title, 'textDecorationColor'),
      boughtRowBg: px(bought?.closest('li'), 'backgroundColor'),
      openRowBg: px(document.querySelector('li:not(:has(.line-through))'), 'backgroundColor'),
      boxBg: px(box, 'backgroundColor'),
      boxBorder: px(box, 'borderColor'),
      boxSize: rect('[data-testid="giftStrikethrough"]'),
      delSize: rect('[data-testid="giftDelete"]'),
      descSize: px(desc, 'fontSize'),
      descColor: px(desc, 'color'),
      linkSize: px(document.querySelector('[data-testid="giftCard"] a'), 'fontSize'),
      addBtn: rect('[data-testid="addGiftButton"]'),
    };
  });

  console.log('MEASURED ' + JSON.stringify(m, null, 2));

  const rowBg = parse(m.boughtRowBg || 'rgb(255,255,255)');
  const strike = parse(m.titleDecoColor || 'rgb(0,0,0)');
  const boxBg = parse(m.boxBg || 'rgb(255,255,255)');
  console.log('CONTRAST strike-on-boughtRow ' + ratio(strike, rowBg).toFixed(2) + ':1');
  console.log('CONTRAST tick-fill-on-surface ' + ratio(boxBg, parse(m.dialogBg || 'rgb(255,255,255)')).toFixed(2) + ':1');
  console.log('CONTRAST boughtTitle-on-row ' + ratio(parse(m.titleColor || 'rgb(0,0,0)'), rowBg).toFixed(2) + ':1');
  console.log('CONTRAST desc-on-dialog ' + ratio(parse(m.descColor || 'rgb(0,0,0)'), parse(m.dialogBg || 'rgb(255,255,255)')).toFixed(2) + ':1');
});
