import { test, expect } from '@playwright/test';

test('one station/date anchors an animated round trip between space and time', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('season.html?station=demem&date=2018-09-29&period=autumn');
  await expect(page.locator('#passage-dimension')).toBeEnabled();
  await page.locator('#passage-read').click();
  const reading = await page.locator('#passage-reading').textContent();
  await page.keyboard.press('Escape');
  await page.locator('#passage-dimension').click();
  await expect(page.locator('#season-passage')).toHaveAttribute('data-transitioning', 'true');
  await expect(page.locator('#passage-clock')).toBeDisabled();
  await expect(page.locator('#passage-dimension')).toBeEnabled();
  await expect(page.locator('#season-passage')).toHaveAttribute('data-view', 'space');
  await expect(page.locator('#passage-date-label')).toHaveText('29 September');
  await expect(page.locator('.season-anchor-label')).toHaveText('Memmingen');
  await page.locator('#passage-read').click();
  await expect(page.locator('#passage-reading')).toHaveText(reading);
  await page.keyboard.press('Escape');
  await page.locator('#passage-explore').click();
  await expect(page.locator('#passage-availability')).toContainText('34 of 37');
  await page.locator('#passage-station').selectOption('frmtc');
  await expect(page.locator('#passage-place')).toHaveText('Montancy');
  await page.locator('#passage-dimension').click();
  await expect(page.locator('#passage-dimension')).toBeEnabled();
  await expect(page.locator('#season-passage')).toHaveAttribute('data-view', 'time');
  await expect(page.locator('#passage-date-label')).toHaveText('29 September');
  await page.locator('#passage-world canvas').press('Shift+ArrowRight');
  await expect(page.locator('#passage-date-label')).toHaveText('6 October');
  await page.locator('#passage-dimension').click();
  await expect(page.locator('#passage-dimension')).toBeEnabled();
  await expect(page).toHaveURL(/view=space/);
  await page.reload();
  await expect(page.locator('#season-passage')).toHaveAttribute('data-view', 'space');
  await expect(page.locator('#passage-place')).toHaveText('Montancy');
  await expect(page.locator('#passage-date-label')).toHaveText('6 October');
  // The anchor label is placed just below its geographic marker. Tapping that
  // actual canvas position exercises selection without exposing renderer state.
  const anchor = await page.locator('.season-anchor-label').boundingBox();
  await page.mouse.click(anchor.x + anchor.width / 2, anchor.y - 9);
  await expect(page.locator('#season-passage')).toHaveAttribute('data-view', 'time');
  await expect(page.locator('#passage-dimension')).toBeEnabled();
  await expect(page.locator('#passage-date-label')).toHaveText('6 October');
  expect(errors).toEqual([]);
});

test('incomplete geography loading preserves time and can be retried', async ({ page }) => {
  await page.goto('season.html?date=2018-09-29');
  await expect(page.locator('#passage-dimension')).toBeEnabled();
  await page.route('**/frmtc-*.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.locator('#passage-dimension').click();
  await expect(page.locator('#passage-error')).toContainText('could not fully load');
  await expect(page.locator('#season-passage')).toHaveAttribute('data-view', 'time');
  await expect(page.locator('#passage-date-label')).toHaveText('29 September');
  await page.unroute('**/frmtc-*.json');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#passage-dimension').click();
  await expect(page.locator('#season-passage')).toHaveAttribute('data-view', 'space');
  await expect(page.locator('#season-passage')).toHaveAttribute('data-transitioning', 'false');
  await expect(page.locator('#passage-error')).toBeHidden();
  await page.locator('#passage-world canvas').press('Home');
  await page.locator('#passage-read').click();
  await expect(page.locator('#passage-inspect')).toBeVisible();
  await page.keyboard.press('Escape');
  for (const width of [390, 320, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
