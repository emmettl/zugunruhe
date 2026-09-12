import { test,expect } from '@playwright/test';
for(const [file,title] of [['','Zugunruhe · Layers'],['network.html','Zugunruhe · Archipelago'],['continent.html?clouds=total','Zugunruhe · Continent ablaze'],['studies/01-layers/','Zugunruhe · Layers'],['studies/02-archipelago/','Zugunruhe · Archipelago']]){
  test(`renders ${file||'cloud'} under the edition prefix`,async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const response=await page.goto(file||'./');expect(response.status()).toBe(200);
    await expect(page).toHaveTitle(title);await expect(page.locator('canvas').first()).toBeVisible();
    if(file.includes('network')||file.includes('continent')||file.includes('02-archipelago')){
      await expect(page.locator('#camera-height')).toContainText('km above Earth');
      await expect(page.locator('#graphics-error')).toBeHidden();
    }else await expect(page.locator('#clock')).not.toBeEmpty();
    for(const href of await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')).filter(h=>h.startsWith('/'))))expect(href).toMatch(/^\/zugunruhe\//);
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
  await page.getByLabel('Visit a station',{exact:true}).selectOption({label:'Memmingen · demem'});
  await expect(page.getByRole('button',{name:'← Back to previous view',exact:true})).toBeVisible();
  await expect(page.locator('#camera-height')).toHaveText(/^\d{2,3} km above Earth$/);
  await page.getByRole('button',{name:'← Back to previous view',exact:true}).click();
  await expect(page.locator('#camera-height')).toHaveText('1,200 km above Earth');
  await expect(page.getByRole('button',{name:'← Back to previous view',exact:true})).toBeHidden();
  expect(errors).toEqual([]);
});
