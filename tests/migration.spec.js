import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const data = JSON.parse(fs.readFileSync(new URL('../data/processed/migration-storks.json', import.meta.url)));
const pageURL = 'migration.html?bird=linus-b&at=2018-09-12T12:00:00Z';

test('holds one recorded observation through space/time, stepping and reload', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(pageURL);
  await expect(page.locator('#migration-value')).toHaveText('36.2636° N');
  await page.getByRole('button', { name: 'Hold this observation' }).click();
  const reading = await page.locator('#migration-fix-detail').textContent();
  await expect(page.locator('#migration-observation-kind')).toHaveText('HELD IN THE LIGHT');
  await page.locator('#migration-dimension').click();
  await expect(page.locator('#migration-stage')).toHaveAttribute('data-view', 'time');
  await expect(page.locator('#migration-stage')).toHaveAttribute('data-transitioning', 'true');
  await expect(page.locator('#migration-stage')).toHaveAttribute('data-transitioning', 'false');
  await expect(page.locator('#migration-fix-detail')).toHaveText(reading);
  await page.locator('#migration-dimension').click();
  await expect(page.locator('#migration-stage')).toHaveAttribute('data-view', 'space');
  await expect(page.locator('#migration-stage')).toHaveAttribute('data-transitioning', 'true');
  await expect(page.locator('#migration-stage')).toHaveAttribute('data-transitioning', 'false');
  await page.getByRole('button', { name: 'Next recorded position', exact: true }).click();
  await expect(page.locator('#migration-fix-detail')).not.toHaveText(reading);
  const nextReading = await page.locator('#migration-fix-detail').textContent();
  await page.reload();
  await expect(page.locator('#migration-fix-detail')).toHaveText(nextReading);
  await page.locator('#migration-bird').selectOption('all');
  await expect(page.locator('#migration-value')).toHaveText('Fifteen journeys.');
  await expect(page.locator('#migration-next')).toBeDisabled();
  expect(errors).toEqual([]);
});

test('gaps remain open and exact observations can be reached with a keyboard', async ({ page }) => {
  const t = data.tracks.find(t => t.id === 'redrunner');
  const index = t.fixes.findIndex((f, i) => i && f[0] - t.fixes[i - 1][0] > 10 * 3600);
  const at = new Date((t.fixes[index - 1][0] + 5 * 3600) * 1000).toISOString();
  await page.goto(`migration.html?bird=redrunner&at=${encodeURIComponent(at)}`);
  await expect(page.locator('#migration-value')).toHaveText('Between recordings.');
  await expect(page.locator('#migration-pin')).toBeDisabled();
  await page.locator('#migration-world').press('ArrowRight');
  await expect(page.locator('#migration-observation-kind')).toHaveText('HELD IN THE LIGHT');
  const actual = new URL(page.url()).searchParams.get('at');
  expect(Math.abs(Date.parse(actual) / 1000 - t.fixes[index][0])).toBeLessThan(.0011);
  await page.goto('migration.html?bird=wendelina&at=2018-09-28T12:00:00Z');
  await expect(page.locator('#migration-fix-detail')).toHaveText('This recording has ended.');
});

test('playback advances, notes pause it, and reduced motion retains controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(pageURL);
  const before = Number(await page.locator('#migration-clock').inputValue());
  await page.locator('#migration-play').click();
  await expect.poll(async () => Number(await page.locator('#migration-clock').inputValue())).toBeGreaterThan(before + 500);
  await page.locator('#migration-about').click();
  await expect(page.locator('#migration-play')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#migration-notes')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#migration-about')).toBeFocused();
  await page.locator('#migration-dimension').click();
  await expect(page.locator('#migration-stage')).toHaveAttribute('data-transitioning', 'false');
  await page.locator('#migration-sparks').click();
  await expect(page.locator('#migration-sparks')).toHaveAttribute('aria-pressed', 'false');
});

test('controls fit narrow widths and notes remain accessible', async ({ page }) => {
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 }); await page.goto(pageURL);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const controls = await page.locator('.migration-actions').boundingBox();
    const header = await page.locator('header').boundingBox();
    expect(controls.y).toBeGreaterThan(header.y + header.height);
    await page.locator('#migration-about').click();
    await expect(page.locator('#migration-notes')).toBeVisible(); await page.keyboard.press('Escape');
  }
});
