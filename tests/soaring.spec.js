import { test, expect } from '@playwright/test';

test('soaring supports viewpoints, held pause, restart, notes, sound and responsive layout', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('soaring.html');
  await expect(page).toHaveTitle('Zugunruhe · Soaring');
  const study = page.locator('#soaring-study');
  await expect(page.locator('#soaring-world canvas')).toBeVisible();
  await expect(page.locator('#soaring-error')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Soaring', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect.poll(async () => Number(await study.getAttribute('data-time'))).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Follow one', exact: true }).click();
  await expect(study).toHaveAttribute('data-camera', 'follow');
  await page.getByRole('button', { name: 'Another bird' }).click();
  await expect(study).toHaveAttribute('data-bird', '2');
  await page.getByRole('button', { name: 'With the air', exact: true }).click();
  await expect(study).toHaveAttribute('data-camera', 'air');
  for (const name of ['Lift', 'Traces']) { await page.getByRole('button', { name, exact: true }).click(); await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true'); }
  // A held click must survive animation/UI updates, including on WebKit.
  const pause = page.getByRole('button', { name: 'Pause soaring' });
  await pause.scrollIntoViewIfNeeded(); const box = await pause.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(400); await page.mouse.up();
  await expect(study).toHaveAttribute('data-playing', 'false');
  await page.waitForTimeout(200); const held = await study.getAttribute('data-time');
  await page.waitForTimeout(350); await expect(study).toHaveAttribute('data-time', held);
  await expect(study).toHaveAttribute('data-score', 'off');
  await page.getByRole('button', { name: 'Start soaring soundtrack' }).click();
  await expect(study).toHaveAttribute('data-score', 'playing');
  await expect(study).toHaveAttribute('data-playing', 'false');
  await page.getByRole('button', { name: 'About this study' }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await expect(study).toHaveAttribute('data-score', 'off');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#soaring-about')).toBeFocused();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(study).toHaveAttribute('data-time', '0.00'); await expect(study).toHaveAttribute('data-bird', '1');
  await expect(study).toHaveAttribute('data-camera', 'watch');
  for (const width of [320, 390, 900, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const heading = await page.locator('.soaring-heading').boundingBox(), caption = await page.locator('.soaring-caption').boundingBox();
    if (width <= 760) expect(heading.y + heading.height).toBeLessThanOrEqual(caption.y);
    for (const button of await page.locator('.soaring-toolbar button').all()) {
      const bounds = await button.boundingBox(); expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    }
  }
  await page.locator('#soaring-world canvas').press('Space'); await expect(study).toHaveAttribute('data-playing', 'true');
  await page.locator('#soaring-world canvas').press('3'); await expect(study).toHaveAttribute('data-camera', 'air');
  expect(errors).toEqual([]);
});

test('reduced motion begins paused and opens recorded journeys under the deployment prefix', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('soaring.html');
  await expect(page.locator('#soaring-study')).toHaveAttribute('data-playing', 'false');
  await expect(page.locator('#soaring-study')).toHaveAttribute('data-time', '0.00');
  await page.getByRole('button', { name: 'Play soaring' }).click();
  await expect.poll(async () => Number(await page.locator('#soaring-study').getAttribute('data-time'))).toBeGreaterThan(0);
  const href = await page.getByRole('link', { name: 'Follow recorded storks' }).evaluate(a => a.href);
  expect(new URL(href).pathname).toBe('/zugunruhe/migration.html');
  expect((await page.request.get(href)).status()).toBe(200);
});
