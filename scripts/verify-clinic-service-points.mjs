import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const csv=await fs.readFile('output/official-quiz.csv','utf8');
const browser=await chromium.launch({channel:'msedge'});
const checked=[];
try{
  for(const [name,width] of [['desktop',1440],['mobile',390]]){
    const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    await page.route('https://docs.google.com/spreadsheets/**',r=>r.fulfill({status:200,contentType:'text/csv',body:csv}));
    await page.goto('http://127.0.0.1:4173/');
    await page.getByRole('button',{name:'開始遊戲',exact:true}).waitFor();
    await page.locator('.hero-visual').screenshot({path:`output/playwright/service-points-home-${name}.png`,animations:'disabled'});
    await page.getByRole('button',{name:'開始遊戲',exact:true}).click();
    await page.getByRole('button',{name:'開始拜訪',exact:true}).click();
    const canvas=page.getByTestId('clinic-3d-canvas');
    await page.waitForFunction(()=>document.querySelector('[data-testid="clinic-3d-canvas"]')?.getAttribute('data-renderer')==='webgl');
    await page.getByRole('button',{name:'前往藥局',exact:true}).waitFor();
    await page.getByRole('button',{name:'前往掛號櫃台',exact:true}).waitFor();
    await page.getByTestId('clinic-map').screenshot({path:`output/playwright/service-points-${name}.png`,animations:'disabled'});
    for(const [id,place,speaker,action] of [
      ['reception','藥局','藥師','與藥師互動'],
      ['waiting','掛號櫃台','掛號人員','與掛號人員互動']
    ]){
      await canvas.scrollIntoViewIfNeeded();
      const box=await canvas.boundingBox(),p=JSON.parse(await canvas.getAttribute('data-pick'+id));
      await page.mouse.click(box.x+p.x,box.y+p.y);
      await page.locator('[data-testid="map-player"].walking').waitFor();
      await page.getByRole('button',{name:'略過移動',exact:true}).click();
      const card=page.getByRole('region',{name:'診所互動對話'});
      await card.waitFor();assert((await card.innerText()).includes(speaker),place+' physical pick');
      await page.waitForFunction(id=>document.querySelector('[data-testid="clinic-3d-canvas"]')?.getAttribute('data-nearby')===id,id);
      await page.getByRole('button',{name:'關閉診所互動對話',exact:true}).click();
      await canvas.focus();await canvas.press('E');await card.waitFor();
      assert((await card.innerText()).includes(speaker),place+' E interaction');
      const button=page.getByRole('button',{name:action,exact:true});
      assert.equal(await button.isEnabled(),true);
      await page.locator('.clinic3d-explorer').screenshot({path:`output/playwright/service-points-${id}-${name}.png`,animations:'disabled'});
      checked.push({device:name,place,physicalPick:true,nearbyInteraction:true,interactionButton:true});
      console.log(name,place,'physical pick and E interaction passed');
    }
    await context.close();
  }
}finally{await browser.close();await fs.writeFile('output/clinic-service-points-audit.json',JSON.stringify({checked,allPassed:checked.length===4},null,2));}
