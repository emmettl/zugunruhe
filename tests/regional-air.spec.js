import {test,expect} from '@playwright/test';
test('regional Air changes height, visits stations, returns, and preserves the original comparison',async({page})=>{
 test.setTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 expect((await page.goto('air.html')).status()).toBe(200);
 await expect(page.locator('#play')).toBeEnabled();await expect(page.locator('#clock')).toHaveValue('36');await expect(page.locator('#reading')).toContainText('1–4 km');
 await page.getByRole('button',{name:'Controls',exact:true}).click();
 await page.getByLabel('Height',{exact:true}).selectOption('5');
 await page.getByLabel('Visit a station',{exact:true}).selectOption({label:'Montancy'});
 await expect(page.locator('#view-title')).toHaveText('Montancy');await expect(page.locator('#reading')).toContainText('245°');
 await page.getByRole('button',{name:'Back to previous view'}).click();await expect(page.locator('#view-title')).toHaveText('Across a changing sky.');
 await page.locator('#wind').click();await expect(page.locator('#wind')).toHaveAttribute('aria-pressed','false');await page.locator('#wind').click();
 await page.locator('canvas').press('ArrowRight');await expect(page.locator('#clock')).toHaveValue('37');
 await page.locator('#play').click();await expect.poll(async()=>Number(await page.locator('#clock').inputValue())).toBeGreaterThan(37);
 await page.getByRole('button',{name:'Controls',exact:true}).click();await expect(page.locator('#play')).toHaveAttribute('aria-label','Play');
 await expect(page.getByRole('link',{name:'Original Memmingen comparison ↗'})).toHaveAttribute('href','air-station.html');
 await page.getByRole('button',{name:'About this study ↗',exact:true}).click();await expect(page.locator('#notes')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('#air-controls')).toBeVisible();await page.keyboard.press('Escape');
 if(page.viewportSize().width<=760){await expect(page.locator('#clock')).toHaveCSS('height','56px');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 expect(errors).toEqual([]);
});

test('regional Air accepts direct touch rotation and pinch',async({page,browserName})=>{
 test.skip(browserName!=='chromium','Native multi-touch injection uses Chromium CDP.');
 await page.setViewportSize({width:390,height:844});await page.goto('air.html');await expect(page.locator('#play')).toBeEnabled();
 const canvas=page.locator('canvas');await expect(canvas).toHaveCSS('touch-action','none');
 const box=await canvas.boundingBox(),x=box.x+box.width/2,y=box.y+box.height*.55;
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y}))});
 const label=page.locator('.map-label').last(),before=await label.getAttribute('style');
 await touch('touchStart',[[1,x,y]]);for(let i=1;i<=5;i++)await touch('touchMove',[[1,x+i*10,y]]);await touch('touchEnd',[]);
 await expect(label).not.toHaveAttribute('style',before);
 const rotated=await label.getAttribute('style');
 await touch('touchStart',[[1,x-30,y],[2,x+30,y]]);for(let i=1;i<=5;i++)await touch('touchMove',[[1,x-30-i*8,y],[2,x+30+i*8,y]]);await touch('touchEnd',[]);
 await expect(label).not.toHaveAttribute('style',rotated);await expect(page.locator('#back-to-network')).toBeHidden();await expect(page.locator('#clock')).toHaveValue('36');
 await cdp.detach();
});
