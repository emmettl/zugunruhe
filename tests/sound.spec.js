import { test, expect } from '@playwright/test';

test('sound is opt-in, cancellable while loading, and independent of the visual clock', async ({ page }) => {
  test.setTimeout(240000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  let requests = 0, release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('**/*.mp3', async route => { requests++; await held; await route.continue(); });
  await page.goto('night.html');
  const toggle = page.locator('#sound-toggle'), widget = page.locator('.study-sound');
  await expect(toggle).toBeVisible(); await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(requests).toBe(0);
  await toggle.click(); await expect(widget).toHaveAttribute('data-state', 'loading');
  await toggle.click(); await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  release();
  await toggle.click(); await expect(widget).toHaveAttribute('data-state', 'playing');
  expect(requests).toBe(1);
  const volume = page.getByRole('slider', { name: 'Sound volume', exact: true });
  await expect(volume).toBeVisible(); await volume.press('ArrowLeft');
  await expect(volume).toHaveValue('64');
  await volume.press('Escape'); await expect(volume).toBeHidden();
  await expect(page.locator('#clock')).toHaveValue('12');
  await page.locator('#clock').press('ArrowRight');
  await expect(page.locator('#clock')).toHaveValue('13');
  await expect(widget).toHaveAttribute('data-state', 'playing');
  await page.locator('#play').click(); await expect(page.locator('#play')).toHaveAttribute('aria-label', 'Pause');
  await page.locator('#play').click(); await expect(widget).toHaveAttribute('data-state', 'playing');
  await toggle.click(); await expect(widget).toHaveAttribute('data-state', 'paused');
  await expect(volume).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const box = await toggle.boundingBox(); expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('link', { name: 'Cloud', exact: true }).click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#sound-volume')).toHaveValue('64'); expect(requests).toBe(1);
  expect(errors).toEqual([]);
});

test('a failed soundtrack fetch leaves a working retry control', async ({ page }) => {
  await page.route('**/*.mp3', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.goto('night.html');
  await page.locator('#sound-toggle').click();
  await expect(page.locator('.study-sound')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#sound-feedback')).toContainText('Tap to try again');
  await expect(page.locator('#sound-toggle')).toBeEnabled();
  await page.unroute('**/*.mp3');
  await page.locator('#sound-toggle').click();
  await expect(page.locator('.study-sound')).toHaveAttribute('data-state', 'playing');
  await page.locator('#sound-toggle').click();
});
