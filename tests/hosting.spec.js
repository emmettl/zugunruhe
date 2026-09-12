import { test,expect } from '@playwright/test';

async function mobileSettings(page){
  if(page.viewportSize().width<=760){
    const settings=page.locator('.mobile-settings');
    if(!await settings.evaluate(e=>e.open))await page.getByRole('button',{name:'Controls',exact:true}).click();
  }
}
async function checkMobileAccess(page,cloud=false){
  if(page.viewportSize().width>760)return;
  await expect(page.locator('.mobile-settings')).not.toHaveAttribute('open','');
  const measure=()=>page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth>innerWidth,
    small:[...document.querySelectorAll('button,select,summary,input[type=range],header a')]
      .filter(e=>e.getBoundingClientRect().height>0&&e.getBoundingClientRect().height<44).map(e=>e.id||e.textContent.trim()),
  }));
  expect(await measure()).toEqual({overflow:false,small:[]});
  expect(await page.locator(cloud?'.stage':'main').evaluate(e=>e.getBoundingClientRect().height)).toBeGreaterThan(page.viewportSize().height*.6);
  expect(await page.locator(cloud?'#app > .playback':'footer').evaluate(e=>e.getBoundingClientRect().height)).toBeLessThanOrEqual(105);
  await mobileSettings(page);
  expect(await measure()).toEqual({overflow:false,small:[]});
  const original=page.viewportSize();await page.setViewportSize({width:320,height:568});
  expect(await measure()).toEqual({overflow:false,small:[]});
  await page.setViewportSize({width:844,height:390});
  expect(await measure()).toEqual({overflow:false,small:[]});
  await page.setViewportSize(original);
  const opener=page.locator(cloud?'#about':'#notes-button'),dialog=page.locator(cloud?'#source-notes':'#notes');
  await opener.click();await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-labelledby',/.+-title/);
  await page.keyboard.press('Tab');
  expect(await dialog.evaluate(e=>e.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(opener).toBeFocused();
  const move=page.getByRole('button',{name:'Move view',exact:true});
  await move.click();await expect(page.getByRole('button',{name:'Done moving',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Done moving',exact:true}).click();
  await expect(page.getByRole('button',{name:'Controls',exact:true})).toBeVisible();
}

for(const [file,title] of [['','Zugunruhe · Layers'],['network.html','Zugunruhe · Archipelago'],['continent.html?clouds=total','Zugunruhe · Continent ablaze'],['studies/01-layers/','Zugunruhe · Layers'],['studies/02-archipelago/','Zugunruhe · Archipelago']]){
  test(`renders ${file||'cloud'} under the edition prefix`,async({page})=>{
    // Software WebGL can take several minutes for the full Sea keyboard sequence.
    // Leave room for every assertion even on slower shared runners.
    if(file.includes('continent'))test.setTimeout(600000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const response=await page.goto(file||'./');expect(response.status()).toBe(200);
    await expect(page).toHaveTitle(title);await expect(page.locator('canvas').first()).toBeVisible();
    if(file.includes('network')||file.includes('continent')||file.includes('02-archipelago')){
      await expect(page.locator('#camera-height')).toContainText('km above Earth');
      await expect(page.locator('#graphics-error')).toBeHidden();
    }else await expect(page.locator('#clock')).not.toBeEmpty();
    for(const href of await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')).filter(h=>h.startsWith('/'))))expect(href).toMatch(/^\/zugunruhe\//);
    if(!file.startsWith('studies/')){
      await checkMobileAccess(page,!file);
      const timeline=page.locator(file?'#clock':'#time'),canvas=page.locator('canvas').first();
      await canvas.press('Home');await expect(timeline).toHaveValue('0');
      await canvas.press('ArrowRight');await expect(timeline).toHaveValue('1');
      await timeline.press('Shift+ArrowRight');await expect(timeline).toHaveValue('7');
      await timeline.press('End');await expect(timeline).toHaveValue('144');
      await timeline.press('ArrowRight');await expect(timeline).toHaveValue('144');
      await timeline.press('Home');await canvas.press('Space');
      await expect(page.locator('#play')).toHaveAttribute('aria-label',/^Pause/);
      await canvas.press('p');await expect(page.locator('#play')).toHaveAttribute('aria-label','Play');
      if(file.includes('continent')){
        await mobileSettings(page);
        const position=await timeline.inputValue();
        await page.locator('#luminosity').press('ArrowRight');
        await expect(timeline).toHaveValue(position);
        await expect(page.locator('#luminosity')).toHaveValue('1.6');
      }
    }
    expect(errors).toEqual([]);
  });
}
test('cloud, islands and sea link correctly; station descent returns to the previous view',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');await page.getByRole('navigation',{name:'Studies'}).getByRole('link',{name:'Islands',exact:true}).click();
  await expect(page).toHaveURL(/\/zugunruhe\/network.html$/);
  await page.getByRole('navigation',{name:'Studies'}).getByRole('link',{name:'Sea',exact:true}).click();
  await expect(page).toHaveURL(/\/zugunruhe\/continent.html$/);
  await expect(page.locator('#camera-height')).toHaveText('1,200 km above Earth');
  await mobileSettings(page);
  await page.getByLabel('Visit a station',{exact:true}).selectOption({label:'Memmingen · demem'});
  await expect(page.getByRole('button',{name:'← Back to previous view',exact:true})).toBeVisible();
  await expect(page.locator('#camera-height')).toHaveText(/^\d{2,3} km above Earth$/);
  await page.getByRole('button',{name:'← Back to previous view',exact:true}).click();
  await expect(page.locator('#camera-height')).toHaveText('1,200 km above Earth');
  await expect(page.getByRole('button',{name:'← Back to previous view',exact:true})).toBeHidden();
  expect(errors).toEqual([]);
});

// Keep the new path shader smoke separate from the lengthy Sea keyboard sequence.
test('Currents renders and retains playback, comparison and study navigation',async({page})=>{
  test.setTimeout(300000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const response=await page.goto('currents.html?palette=aquatic&clouds=total');expect(response.status()).toBe(200);
  await expect(page).toHaveTitle('Zugunruhe · Currents');
  await expect(page.locator('#camera-height')).toContainText('km above Earth');
  await expect(page.locator('#graphics-error')).toBeHidden();
  await page.locator('canvas').press('Space');await expect(page.locator('#play')).toHaveAttribute('aria-label','Pause');
  await page.locator('canvas').press('ArrowLeft');await expect(page.locator('#play')).toHaveAttribute('aria-label','Play');
  await checkMobileAccess(page);
  await mobileSettings(page);
  await page.getByLabel('Travelling threads',{exact:true}).uncheck();
  await expect(page.getByLabel('Travelling threads',{exact:true})).not.toBeChecked();
  await page.getByLabel('Travelling threads',{exact:true}).check();
  await expect(page.getByRole('navigation',{name:'Studies'}).getByRole('link',{name:'Sea',exact:true})).toHaveAttribute('href',/\/zugunruhe\/continent.html$/);
  expect(errors).toEqual([]);
});
