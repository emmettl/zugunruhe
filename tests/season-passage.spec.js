import { test, expect } from '@playwright/test';

test('the passage holds real dates, drifts slowly, and opens the original data view', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('season.html?station=demem&date=2018-10-17&period=autumn');
  await expect(page.locator('#passage-play')).toBeEnabled();
  await expect(page.locator('#passage-error')).toBeHidden();
  await expect(page.locator('#passage-date-label')).toHaveText('17 October');
  await expect(page.locator('#passage-play')).toHaveAttribute('aria-label', 'Drift through nights');
  await expect(page.locator('#passage-world canvas')).toBeVisible();
  await page.locator('#passage-world canvas').press('ArrowLeft');
  await expect(page.locator('#passage-date-label')).toHaveText('16 October');
  await page.locator('#passage-play').click();
  const start = Number(await page.locator('#passage-clock').inputValue());
  await expect.poll(async () => Number(await page.locator('#passage-clock').inputValue())).toBeGreaterThan(start);
  await page.locator('#passage-read').click();
  await expect(page.locator('#passage-play')).toHaveAttribute('aria-label', 'Drift through nights');
  await expect(page.locator('#passage-inspect')).toBeVisible();
  await expect(page.locator('#passage-data-inspect')).toHaveAttribute('href', /season-data.html\?station=demem&date=2018-10-/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#passage-read')).toBeFocused();
  await page.locator('#passage-view').click();
  await expect(page.locator('#passage-view')).toHaveText('Step within');
  await page.locator('#passage-explore').click();
  await page.locator('#passage-season').selectOption('spring');
  await expect(page.locator('#passage-controls')).toBeHidden();
  await expect(page.locator('#passage-period')).toHaveText('SPRING / 2018');
  await page.locator('#passage-explore').click();
  await page.locator('#passage-station').selectOption('frmtc');
  await expect(page.locator('#passage-place')).toHaveText('Montancy');
  await expect(page.locator('#passage-controls')).toBeHidden();
  await page.reload();
  await expect(page.locator('#passage-place')).toHaveText('Montancy');
  await expect(page.locator('#passage-period')).toHaveText('SPRING / 2018');
  await page.locator('#passage-read').click();
  await page.locator('#passage-data-inspect').click();
  await expect(page).toHaveURL(/season-data.html/);
  await expect(page.locator('#season-station')).toHaveValue('frmtc');
  await expect(page.locator('#season-station')).toBeEnabled();
  await page.locator('#enter-season').click();
  await expect(page).toHaveURL(/\/season.html/);
  await expect(page.locator('#passage-place')).toHaveText('Montancy');
  expect(errors).toEqual([]);
});

test('missing seasons remain empty, and reduced motion permits deliberate exploration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('season.html?station=demem&date=2018-07-15&period=year');
  await expect(page.locator('#passage-play')).toBeEnabled();
  await expect(page.locator('#passage-state')).toHaveText('No usable observation for this night');
  await page.locator('#passage-read').click();
  await expect(page.locator('#passage-reading')).toContainText('Insufficient observations');
  await expect(page.locator('#passage-reading')).toContainText('0 of 48');
  await page.keyboard.press('Escape');
  await page.locator('#passage-world canvas').press('Space');
  await expect(page.locator('#passage-play')).toHaveAttribute('aria-label', 'Pause drift');
  await page.locator('#passage-world canvas').press('p');
  await expect(page.locator('#passage-play')).toHaveAttribute('aria-label', 'Drift through nights');
  for (const width of [390, 320, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('unavailable station downloads retain the current passage', async ({ page }) => {
  await page.goto('season.html');
  await expect(page.locator('#passage-play')).toBeEnabled();
  await page.route('**/frmtc-*.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.locator('#passage-explore').click();
  await page.locator('#passage-station').selectOption('frmtc');
  await expect(page.locator('#passage-error')).toContainText('could not load');
  await expect(page.locator('#passage-station')).toHaveValue('demem');
  await expect(page.locator('#passage-place')).toHaveText('Memmingen');
  await page.unroute('**/frmtc-*.json');
  await page.locator('#passage-station').selectOption('frmtc');
  await expect(page.locator('#passage-place')).toHaveText('Montancy');
  await expect(page.locator('#passage-error')).toBeHidden();
});
