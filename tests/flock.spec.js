import { test, expect } from '@playwright/test';

test('flock renders and supports viewpoints, pause, traces, disturbance and notes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('flock.html');
  await expect(page).toHaveTitle('Zugunruhe · Flock');
  await expect(page.locator('#flock-world canvas')).toBeVisible();
  await expect(page.locator('#flock-error')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Flock', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Follow one', exact: true }).click();
  await expect(page.locator('#flock-study')).toHaveAttribute('data-camera', 'follow');
  const bird = await page.locator('#flock-state').textContent();
  await page.getByRole('button', { name: 'Another bird' }).click();
  await expect(page.locator('#flock-state')).not.toHaveText(bird);
  await page.getByRole('button', { name: 'Fly among', exact: true }).click();
  await expect(page.locator('#flock-study')).toHaveAttribute('data-camera', 'within');
  await page.getByRole('button', { name: 'Traces', exact: true }).click();
  await expect(page.locator('#flock-trails')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Disturb', exact: true }).click();
  await page.locator('#flock-world canvas').dispatchEvent('pointermove', { clientX: 180, clientY: 350, pointerType: 'mouse' });
  await page.getByRole('button', { name: 'Pause flock' }).click();
  await expect(page.locator('#flock-study')).toHaveAttribute('data-playing', 'false');
  await page.locator('#flock-world canvas').press('1');
  await expect(page.locator('#flock-study')).toHaveAttribute('data-camera', 'watch');
  await page.locator('#flock-world canvas').press('Space');
  await expect(page.locator('#flock-study')).toHaveAttribute('data-playing', 'true');
  await page.getByRole('button', { name: 'About the flock' }).click();
  await expect(page.locator('#flock-notes')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#flock-notes')).toBeHidden();
  await expect(page.locator('#flock-about')).toBeFocused();
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('reduced motion starts flight paused and permits explicit play', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('flock.html');
  await expect(page.locator('#flock-study')).toHaveAttribute('data-playing', 'false');
  await page.getByRole('button', { name: 'Play flock' }).click();
  await expect(page.locator('#flock-study')).toHaveAttribute('data-playing', 'true');
});

test('a click or tap sounds a note and sends a ripple; orbit drags stay silent', async ({ page, isMobile }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('flock.html');
  const canvas = page.locator('#flock-world canvas'), study = page.locator('#flock-study');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox(), x = box.x + box.width * .5, y = box.y + box.height * .44;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 35, y + 15, { steps: 4 }); await page.mouse.up();
  await expect(study).not.toHaveAttribute('data-strikes', /\d/);
  if (isMobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
  await expect(study).toHaveAttribute('data-strikes', '1');
  await expect(study).toHaveAttribute('data-note', '66');
  await page.getByRole('button', { name: 'Mute click notes' }).click();
  await expect(page.locator('#flock-sound')).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(350); // Cross the intentional click debounce window.
  await canvas.press('n');
  await expect(study).toHaveAttribute('data-strikes', '2');
  await expect(study).toHaveAttribute('data-note', '66');
  await page.getByRole('button', { name: 'Unmute click notes' }).click();
  await page.getByRole('button', { name: 'Pause flock' }).click();
  await page.waitForTimeout(350);
  await canvas.press('n');
  await expect(study).toHaveAttribute('data-note', '69');
  await expect(study).toHaveAttribute('data-playing', 'false');
  expect(errors).toEqual([]);
});

test('responsive soundtrack is opt-in, follows measured motion and stops independently', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('flock.html');
  const study = page.locator('#flock-study');
  await expect(study).toHaveAttribute('data-score', 'off');
  await expect(study).toHaveAttribute('data-agitation', /0\.\d+/);
  await page.getByRole('button', { name: 'Start responsive soundtrack' }).click();
  await expect(study).toHaveAttribute('data-score', 'playing');
  await expect.poll(async () => Number(await study.getAttribute('data-musical-activity'))).toBeGreaterThan(.01);
  await page.getByRole('button', { name: 'Mute click notes' }).click();
  await expect(study).toHaveAttribute('data-score', 'playing');
  await page.getByRole('button', { name: 'Pause flock' }).click();
  const held = await study.getAttribute('data-agitation');
  await page.waitForTimeout(400);
  await expect(study).toHaveAttribute('data-agitation', held);
  await expect(study).toHaveAttribute('data-score', 'playing');
  await page.getByRole('button', { name: 'Stop responsive soundtrack' }).click();
  await expect(study).toHaveAttribute('data-score', 'off');
  await page.getByRole('button', { name: 'Start responsive soundtrack' }).click();
  await expect(study).toHaveAttribute('data-score', 'playing');
  await page.getByRole('button', { name: 'About the flock' }).click();
  await expect(study).toHaveAttribute('data-score', 'off');
  expect(errors).toEqual([]);
});
