import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const csv=await fs.readFile('output/official-quiz.csv','utf8');
const browser=await chromium.launch({channel:'msedge'});
const checked=[];let allPassed=false;
try{
 for(const [width,reduced,fallback] of [[1440,false,false],[390,false,false],[320,false,false],[390,true,false],[390,false,true]]){
  const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500,reducedMotion:reduced?'reduce':'no-preference'});
  if(fallback)await context.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(String(type).includes('webgl'))return null;return old.call(this,type,...args);};});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://docs.google.com/spreadsheets/**',r=>r.fulfill({status:200,contentType:'text/csv',body:csv}));
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button',{name:'開始遊戲',exact:true}).click();
  await page.getByRole('button',{name:'開始拜訪',exact:true}).click();
  const canvas=page.getByTestId('clinic-3d-canvas');
  if(!fallback)await page.waitForFunction(()=>document.querySelector('[data-testid="clinic-3d-canvas"]')?.getAttribute('data-renderer')==='webgl');
  const card=page.getByRole('region',{name:'診所互動對話'});
  for(const [id,location,name] of [['pharmacist','reception','藥師'],['registration','waiting','掛號人員']]){
   if(fallback)await page.getByRole('button',{name:'前往'+(id==='pharmacist'?'藥局':'掛號櫃台'),exact:true}).click();
   else{
    await canvas.scrollIntoViewIfNeeded();
    const b=await canvas.boundingBox(),p=JSON.parse(await canvas.getAttribute('data-staff'+id));
    await page.mouse.click(b.x+p.x,b.y+p.y);
   }
   const skip=page.getByRole('button',{name:'略過移動',exact:true});
   await skip.waitFor();await skip.click();await card.waitFor();
   assert((await card.locator('.staff-chat-bubble:not(.representative)').innerText()).includes('早安'),name+' first greeting');
   assert((await card.locator('.staff-chat-bubble.representative').innerText()).includes('早安'),name+' rep reply');
   if(!fallback){
    await page.waitForFunction(({id,reduced})=>{
     const c=document.querySelector('[data-testid="clinic-3d-canvas"]');
     const s=JSON.parse(c?.getAttribute('data-staff-motion')||'[]').find(x=>x.id===id);
     return s?.speaking&&(reduced?s.wave===0&&s.nod===0:Math.abs(s.nod)>.01&&s.wave>.2);
    },{id,reduced});
    if(!reduced)await page.waitForFunction(id=>{
     const s=JSON.parse(document.querySelector('[data-testid="clinic-3d-canvas"]').getAttribute('data-staff-motion')).find(x=>x.id===id);
     return Math.abs(Math.atan2(Math.sin(s.yaw-s.targetYaw),Math.cos(s.yaw-s.targetYaw)))<.02;
    },id);
   }
   await card.getByRole('button',{name:'繼續聊聊',exact:true}).click();
   assert((await card.locator('.staff-chat-bubble:not(.representative)').innerText()).includes('好久不見'),name+' repeat greeting');
   if(!fallback&&!reduced)await page.waitForFunction(id=>Math.abs(JSON.parse(document.querySelector('[data-testid="clinic-3d-canvas"]').getAttribute('data-staff-motion')).find(x=>x.id===id).nod)>.01,id);
   await card.getByText('拜訪提醒',{exact:true}).click();
   assert((await card.locator('details p').innerText()).length>10);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await card.locator('.staff-chat-bubble:not(.representative),.staff-chat-bubble.representative,details').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth)));
   const suffix=width+'-'+(reduced?'reduced':fallback?'fallback':'motion');
   await page.locator(fallback?'.clinic-explorer':'.clinic3d-explorer').screenshot({path:'output/playwright/animated-'+id+'-'+suffix+'.png'});
   await card.getByRole('button',{name:'關閉診所互動對話',exact:true}).click();
   await card.waitFor({state:'hidden'});
   if(!fallback){
    await canvas.focus();await canvas.press(id==='pharmacist'?'e':'Enter');await card.waitFor();
    assert((await card.locator('.staff-chat-bubble:not(.representative)').innerText()).includes('怎麼那麼久沒來')||id==='pharmacist'&&(await card.locator('.staff-chat-bubble:not(.representative)').innerText()).includes('哈囉'));
    await card.getByRole('button',{name:'關閉診所互動對話',exact:true}).click();
   }
   checked.push({width,reduced,fallback,staff:name,greeting:true,repeat:true,reminder:true,noOverflow:true});
  }

  if(!fallback&&!reduced&&width!==320){
   await page.getByRole('button',{name:'小地圖：藥局',exact:true}).click();
   await page.getByRole('button',{name:'略過移動',exact:true}).click();
   await card.getByRole('button',{name:'關閉診所互動對話',exact:true}).click();
   const walkTo=async target=>{
    let waved=false;
    await canvas.focus();
    for(let i=0;i<100;i++){
     const p=await canvas.evaluate(el=>({x:+el.dataset.actorX,z:+el.dataset.actorZ,a:+el.dataset.azimuth}));
     const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);
     if(d<.14)return waved;
     const h=dx*Math.cos(p.a)-dz*Math.sin(p.a),v=dx*Math.sin(p.a)+dz*Math.cos(p.a),m=Math.max(Math.abs(h),Math.abs(v));
     const keys=[];if(Math.abs(h)>m*.4)keys.push(h>0?'ArrowRight':'ArrowLeft');if(Math.abs(v)>m*.4)keys.push(v>0?'ArrowDown':'ArrowUp');
     for(const k of keys)await page.keyboard.down(k);
     await page.waitForTimeout(Math.min(100,Math.max(25,d/2.35*800)));
     for(const k of keys)await page.keyboard.up(k);
     const staff=JSON.parse(await canvas.getAttribute('data-staff-motion')).find(x=>x.id==='pharmacist');
     waved ||=staff.nearby&&staff.wave>.2;
    }
    throw new Error('manual approach failed');
   };
   await walkTo({x:-.15,z:.75});
   await card.waitFor({state:'hidden'});
   const waved=await walkTo({x:-2.5,z:.75});assert(waved,'wave on manual approach before dialogue');
   await card.waitFor({state:'hidden'});
   await page.waitForTimeout(2000);
   const idle=JSON.parse(await canvas.getAttribute('data-staff-motion')).find(x=>x.id==='pharmacist');
   assert.equal(idle.wave,0);assert.equal(idle.nod,0);
   assert(Math.abs(Math.atan2(Math.sin(idle.yaw-idle.targetYaw),Math.cos(idle.yaw-idle.targetYaw)))<.02);
   await canvas.press('e');await card.waitFor();
   assert((await card.locator('.staff-chat-bubble:not(.representative)').innerText()).length>5);
   checked.push({width,manualApproach:true,waveBeforeDialogue:true,stationaryGesturesStop:true,nearbyKey:true});
  }
  assert.deepEqual(errors,[]);
  await context.close();console.log(width,reduced,fallback,'passed');
 }
 allPassed=checked.length===12;
}finally{await browser.close();await fs.writeFile('output/staff-animation-audit.json',JSON.stringify({checked,allPassed},null,2));}
