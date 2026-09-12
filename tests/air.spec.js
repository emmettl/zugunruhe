import {test,expect} from '@playwright/test';
test('Air compares the same height and time across nights with accessible flow controls',async({page})=>{
 test.setTimeout(300000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 expect((await page.goto('air.html')).status()).toBe(200);
 await expect(page.locator('#play')).toBeEnabled();await expect(page.locator('#clock')).toHaveValue('48');
 await expect(page.locator('#reading')).toContainText('231°');await expect(page.locator('#reading')).toContainText('131°');
 await page.locator('#wind').click();await expect(page.locator('#wind')).toHaveAttribute('aria-pressed','false');
 await page.locator('#wind').click();await expect(page.locator('#wind')).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Controls',exact:true}).click();
 await page.getByLabel('Night',{exact:true}).selectOption('2');
 await expect(page.locator('#clock')).toHaveValue('48');await expect(page.getByLabel('Height',{exact:true})).toHaveValue('5');
 await page.getByLabel('Height',{exact:true}).selectOption('-1');
 await page.getByRole('button',{name:'Close controls',exact:true}).click();await expect(page.locator('#reading')).toBeHidden();
 await page.locator('canvas').press('ArrowRight');await expect(page.locator('#clock')).toHaveValue('49');
 await page.locator('#play').click();await expect.poll(async()=>Number(await page.locator('#clock').inputValue())).toBeGreaterThan(49);
 await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('aria-label','Play');
 if(page.viewportSize().width<=760){await expect(page.locator('#clock')).toHaveCSS('height','56px');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.getByRole('button',{name:'Controls',exact:true}).click();await page.getByRole('button',{name:'About this study ↗',exact:true}).click();
 await expect(page.locator('#notes')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#air-controls')).toBeVisible();
 expect(errors).toEqual([]);
});
