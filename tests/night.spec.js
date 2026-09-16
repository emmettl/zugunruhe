import { test,expect } from '@playwright/test';

test('Night joins the chapters and hands the camera back after exploration',async({page})=>{
  test.setTimeout(300000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const response=await page.goto('night.html');expect(response.status()).toBe(200);
  await expect(page).toHaveTitle('Zugunruhe · A night in passage');
  const clock=page.locator('#clock'),play=page.locator('#play'),canvas=page.locator('canvas');
  await expect(play).toBeEnabled();await expect(play).toHaveAttribute('aria-label','Play');await expect(clock).toHaveValue('12');
  await expect(page.getByRole('link',{name:'Night',exact:true})).toHaveAttribute('aria-current','page');
  await play.click();await expect.poll(async()=>Number(await clock.inputValue())).toBeGreaterThan(12);
  const box=await canvas.boundingBox();
  await page.mouse.move(box.x+box.width*.45,box.y+box.height*.6);await page.mouse.down();
  await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6,{steps:5});await page.mouse.up();
  await expect(play).toHaveAttribute('aria-label','Play');
  await expect(page.locator('#status')).toHaveText('Exploring · time paused');
  const stopped=await clock.inputValue();
  await page.getByRole('button',{name:'Continue journey',exact:true}).click();
  await expect(play).toHaveAttribute('aria-label','Pause');
  await expect.poll(async()=>Number(await clock.inputValue())).toBeGreaterThan(Number(stopped));
  await canvas.press('End');await expect(clock).toHaveValue('126');await expect(page.locator('#chapter')).toHaveText('TOWARD MORNING');
  await page.getByRole('button',{name:'Controls',exact:true}).click();
  await page.getByRole('button',{name:'Islands',exact:true}).click();
  await expect(clock).toHaveValue('42');await expect(page.locator('#chapter')).toHaveText('AN ARCHIPELAGO');
  await page.getByRole('button',{name:'Controls',exact:true}).click();await page.getByRole('button',{name:'A sea',exact:true}).click();
  await expect(clock).toHaveValue('72');await expect(page.locator('#chapter')).toHaveText('A SEA');
  await clock.press('Shift+ArrowRight');
  for(let i=0;i<4;i++)await clock.press('ArrowRight');
  await expect(clock).toHaveValue('82');
  await expect(page.locator('#view-subtitle')).toHaveText('An estimated field across Western Europe.');
  await expect(page.locator('#evidence')).toHaveText('Estimated field · temporal interpolation');
  if(page.viewportSize().width<=760){
    await expect(clock).toHaveCSS('height','56px');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.getByRole('button',{name:'Controls',exact:true}).click();
  await page.getByLabel('Light',{exact:true}).selectOption('aquatic');
  await page.getByRole('button',{name:'About this night ↗',exact:true}).click();
  await expect(page.locator('#notes')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('#notes')).toBeHidden();
  await expect(page.locator('#night-controls')).toBeVisible();
  await page.getByRole('button',{name:'Close controls',exact:true}).click();
  expect(errors).toEqual([]);
});

test.describe('reduced motion',()=>{
  test.use({reducedMotion:'reduce'});
  test('the clock advances while the chosen camera view stays still',async({page})=>{
    await page.goto('night.html');
    await expect(page.locator('#play')).toBeEnabled();
    const label=page.locator('.map-label').last();
    // The shell changes the canvas height on startup. ResizeObserver updates the
    // projection before the next draw updates labels, so allow both frames before
    // recording the still view. A full-size label alone can be from the old layout.
    await page.evaluate(async()=>{
      await document.fonts.ready;
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    });
    await expect.poll(()=>label.evaluate(e=>parseFloat(e.style.left))).toBeGreaterThan(20);
    const pose=await label.getAttribute('style');
    await page.locator('#play').click();
    await expect.poll(async()=>Number(await page.locator('#clock').inputValue())).toBeGreaterThan(12.3);
    await expect(label).toHaveAttribute('style',pose);
  });
});

test('a held playback click survives animation frames', async ({ page }) => {
  await page.goto('night.html');
  const play = page.locator('#play'); await expect(play).toBeEnabled();
  const text = await play.evaluateHandle(button => button.firstChild);
  const box = await play.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  // Replacing the pressed text on each frame can cancel WebKit's pending click.
  expect(await text.evaluate(node => node.isConnected)).toBe(true);
  await page.mouse.up();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  await play.click(); await expect(play).toHaveAttribute('aria-label', 'Play');
});
