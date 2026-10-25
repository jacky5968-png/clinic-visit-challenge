import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
const csv=await fs.readFile('output/official-quiz.csv','utf8');
const checked=[];let allPassed=false;
try{
 for(const [width,reduced] of [[1440,false],[768,false],[390,false],[320,false],[390,true]].filter(c=>!process.argv[2]||c[0]===+process.argv[2])){
  const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500,reducedMotion:reduced?'reduce':'no-preference'});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://docs.google.com/spreadsheets/**',r=>r.fulfill({status:200,contentType:'text/csv',body:csv}));
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button',{name:'開始遊戲',exact:true}).click();
  await page.getByRole('button',{name:'開始拜訪',exact:true}).click();
  const canvas=page.getByTestId('clinic-3d-canvas'),stage=page.getByTestId('clinic-map'),bubble=page.getByTestId('scene-speech');
  await page.waitForFunction(()=>document.querySelector('[data-testid="clinic-3d-canvas"]')?.getAttribute('data-renderer')==='webgl');
  async function checkLayout(){
   await page.waitForTimeout(200);
   const sb=await stage.boundingBox(),b=await bubble.boundingBox();
   assert(b.x>=sb.x-1&&b.y>=sb.y-1&&b.x+b.width<=sb.x+sb.width+1&&b.y+b.height<=sb.y+sb.height+1,'bubble inside scene');
   const overlap=(a,c)=>Math.min(a.x+a.width,c.x+c.width)-Math.max(a.x,c.x)>2&&Math.min(a.y+a.height,c.y+c.height)-Math.max(a.y,c.y)>2;
   const cb=await canvas.boundingBox();
   for(const id of ['pharmacist','registration']){
    const p=JSON.parse(await canvas.getAttribute('data-staff'+id));
    if(overlap(b,{x:cb.x+p.x-20,y:cb.y+p.y-25,width:40,height:50})){await stage.screenshot({path:'output/playwright/scene-speech-failure.png'});console.log({width,phase:await bubble.getAttribute('data-speaker'),b,cb,p,id});throw Error('bubble leaves staff face clear');}
   }

   const people=JSON.parse(await canvas.getAttribute('data-people-areas'));
   assert.equal(people.length,4,'all four people protected');
   for(const p of people){
    assert(!overlap(b,{x:cb.x+p.left,y:cb.y+p.top,width:p.width,height:p.height}),p.id+' silhouette clear');
   }
   const actor=JSON.parse(await bubble.getAttribute('data-anchor'));
   assert(Number.isFinite(actor.x+actor.y));
   for(const label of await page.locator('.three-hotspot').all()){
    if(await label.isVisible())assert(!overlap(b,await label.boundingBox()),'bubble leaves navigation button clear');
   }
   assert(await bubble.evaluate(el=>el.scrollWidth<=el.clientWidth),'no clipped dialogue text');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page horizontal overflow');
  }
  for(const [id,name] of [['pharmacist','藥師'],['registration','掛號人員']]){
   await canvas.scrollIntoViewIfNeeded();
   const cb=await canvas.boundingBox(),p=JSON.parse(await canvas.getAttribute('data-staff'+id));
   await page.mouse.click(cb.x+p.x,cb.y+p.y);
   await page.getByRole('button',{name:'略過移動',exact:true}).click();
   await bubble.waitFor();assert.equal(await bubble.getAttribute('data-speaker'),'staff');
   await bubble.getByRole('heading',{name,exact:true}).waitFor();
   await page.waitForFunction(()=>document.querySelector('.scene-speech-text')?.textContent?.includes('早安'));
   assert((await bubble.getByRole('heading').innerText()).includes(name));
   await checkLayout();
   if(width===1440 && id==='pharmacist'){for(const w of [390,320,768,1440]){await page.setViewportSize({width:w,height:1000});await checkLayout();}}
   await stage.screenshot({path:'output/playwright/scene-speech-'+id+'-'+width+(reduced?'-reduced':'')+'.png'});
   await bubble.getByRole('button',{name:'回應',exact:true}).click();
   assert.equal(await bubble.getAttribute('data-speaker'),'representative');
   assert.equal(await bubble.getByRole('heading').innerText(),'你');
   assert((await bubble.locator('.scene-speech-text').innerText()).includes('早安'));
   await checkLayout();
   await stage.screenshot({path:'output/playwright/scene-reply-'+id+'-'+width+(reduced?'-reduced':'')+'.png'});
   await page.getByRole('button',{name:'向左旋轉',exact:true}).click();await checkLayout();
   await page.getByRole('button',{name:'放大場景',exact:true}).click();await checkLayout();
   await page.getByRole('button',{name:'俯視診所',exact:true}).click();await checkLayout();
   await page.getByRole('button',{name:'重設視角',exact:true}).click();await checkLayout();
   await bubble.getByRole('button',{name:'繼續聊聊',exact:true}).click();
   assert.equal(await bubble.getAttribute('data-speaker'),'staff');
   await page.waitForFunction(()=>document.querySelector('.scene-speech-text')?.textContent?.includes('好久不見'));
   await bubble.getByText('拜訪提醒',{exact:true}).click();
   await checkLayout();assert((await bubble.locator('details p').innerText()).length>10);
   await stage.screenshot({path:'output/playwright/scene-note-'+id+'-'+width+(reduced?'-reduced':'')+'.png'});
   await bubble.getByRole('button',{name:'關閉診所互動對話',exact:true}).click();
   await bubble.waitFor({state:'hidden'});
   await canvas.focus();await canvas.press(id==='pharmacist'?'e':'Enter');await bubble.waitFor();
   await bubble.getByRole('button',{name:'關閉診所互動對話',exact:true}).click();
   checked.push({width,reduced,staff:name,anchoredBubble:true,reply:true,nextGreeting:true,rotation:true,zoom:true,topView:true,reminder:true,keyboard:true,layout:true});
  }
  assert.deepEqual(errors,[]);await context.close();console.log(width,reduced,'passed');
 }
 allPassed=checked.length===10;
}finally{await browser.close();await fs.writeFile('output/scene-speech-audit.json',JSON.stringify({checked,allPassed},null,2));}
