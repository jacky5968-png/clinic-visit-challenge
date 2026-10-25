import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const csv=await fs.readFile('output/official-quiz.csv','utf8');
const browser=await chromium.launch({channel:'msedge'});
const checked=[];
let complete=false;
try{
  for(const width of [1440,768,390,320]){
    const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    await page.route('https://docs.google.com/spreadsheets/**',r=>r.fulfill({status:200,contentType:'text/csv',body:csv}));
    await page.goto('http://127.0.0.1:4173/');
    await page.getByRole('button',{name:'開始遊戲',exact:true}).waitFor();
    await page.locator('.hero-visual').screenshot({path:`output/playwright/staff-home-${width}.png`,animations:'disabled'});
    await page.getByRole('button',{name:'開始遊戲',exact:true}).click();
    await page.getByRole('button',{name:'開始拜訪',exact:true}).click();
    const canvas=page.getByTestId('clinic-3d-canvas');
    await page.waitForFunction(()=>document.querySelector('[data-testid="clinic-3d-canvas"]')?.getAttribute('data-renderer')==='webgl');
    assert.equal(await canvas.getAttribute('data-staff-count'),'2');
    assert.deepEqual(JSON.parse(await canvas.getAttribute('data-staff-names')),['藥師','掛號人員']);
    await page.getByTestId('clinic-map').screenshot({path:`output/playwright/staff-clinic-${width}.png`,animations:'disabled'});
    for(const [id,speaker,action,key] of [
      ['pharmacist','藥師','與藥師互動','E'],
      ['registration','掛號人員','與掛號人員互動','Enter']
    ]){
      await canvas.scrollIntoViewIfNeeded();
      const box=await canvas.boundingBox(),p=JSON.parse(await canvas.getAttribute('data-staff'+id));
      const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName,{x:box.x+p.x,y:box.y+p.y});
      assert.equal(hit,'CANVAS',speaker+' face must not be covered by labels');
      await page.mouse.click(box.x+p.x,box.y+p.y);
      await page.locator('[data-testid="map-player"].walking').waitFor();
      await page.getByRole('button',{name:'略過移動',exact:true}).click();
      const card=page.getByRole('region',{name:'診所互動對話'});
      await card.waitFor();assert((await card.innerText()).includes(speaker),speaker+' person click');
      await page.getByRole('button',{name:'關閉診所互動對話',exact:true}).click();
      await canvas.focus();await canvas.press(key);await card.waitFor();
      assert((await card.innerText()).includes(speaker),speaker+' nearby keyboard interaction');
      const button=page.getByRole('button',{name:action,exact:true});
      assert.equal(await button.isEnabled(),true);
      assert((await button.innerText()).includes('與'+speaker+'對話'));
      await page.getByRole('button',{name:'關閉診所互動對話',exact:true}).click();
      await button.click();await card.waitFor();
      assert((await card.innerText()).includes(speaker),speaker+' button interaction');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      assert(await page.locator('.minimap-destinations button > span').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth)), 'minimap numbers must stay on one line');
      await page.locator('.clinic3d-explorer').screenshot({path:`output/playwright/staff-talk-${id}-${width}.png`,animations:'disabled'});
      checked.push({width,speaker,visibleFace:true,personClick:true,nearbyKey:key,dialogueButton:true});
      console.log(width,speaker,'visible face, person click, key and button passed');
    }
    await context.close();
  }
  complete=true;
}finally{await browser.close();await fs.writeFile('output/clinic-staff-audit.json',JSON.stringify({checked,allPassed:complete&&checked.length===8},null,2));}
