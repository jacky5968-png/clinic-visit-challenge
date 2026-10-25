import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
const checked=[];let allPassed=false;
try{
 for(const [width,reduced] of [[1440,false],[390,false],[320,false],[390,true]]){
  const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500,reducedMotion:reduced?'reduce':'no-preference'});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://docs.google.com/spreadsheets/**',r=>r.abort());
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button',{name:'開始遊戲',exact:true}).click();
  await page.getByRole('button',{name:'開始拜訪',exact:true}).click();
  const canvas=page.getByTestId('clinic-3d-canvas'),stage=page.getByTestId('clinic-map'),bubble=page.getByTestId('doctor-scene-speech');
  await page.waitForFunction(()=>document.querySelector('[data-testid="clinic-3d-canvas"]')?.getAttribute('data-renderer')==='webgl');
  const motion=async()=>JSON.parse(await canvas.getAttribute('data-doctor-motion'));
  const initial=await motion();
  await page.getByRole('button',{name:'前往醫師診間',exact:true}).click();
  if(!reduced)await page.getByRole('button',{name:'略過移動',exact:true}).click();
  await page.getByRole('button',{name:'進入診間',exact:true}).waitFor();
  const aligned=()=>page.waitForFunction(()=>{
   const p=JSON.parse(document.querySelector('[data-testid="clinic-3d-canvas"]').getAttribute('data-doctor-motion'));
   return p.attending&&Math.abs(Math.atan2(Math.sin(p.yaw-p.targetYaw),Math.cos(p.yaw-p.targetYaw)))<.02;
  });
  await aligned();const beforeMove=await motion();
  await canvas.focus();await page.keyboard.down('ArrowLeft');await page.waitForTimeout(200);await page.keyboard.up('ArrowLeft');
  await aligned();const tracked=await motion();
  assert(Math.abs(tracked.targetYaw-beforeMove.targetYaw)>.03,'doctor follows visitor position');
  assert.equal(tracked.talking,false,'proximity does not skip into conversation');
  assert.equal(await bubble.count(),0);
  const preserved=p=>{assert.deepEqual(p.position,initial.position);assert.equal(p.rootYaw,initial.rootYaw);assert.deepEqual(p.legs,initial.legs);};
  preserved(tracked);
  await canvas.press('e');await bubble.waitFor();
  async function nod(sequence,listening){
   await page.waitForFunction(({sequence,listening,reduced})=>{
    const p=JSON.parse(document.querySelector('[data-testid="clinic-3d-canvas"]').getAttribute('data-doctor-motion'));
    return p.talking&&p.sequence===sequence&&p.listening===listening&&(reduced?p.nod===0&&p.lean===0&&p.hand===0:p.gestureAge>.15&&p.gestureAge<1.2&&p.nod>.01);
   },{sequence,listening,reduced});
   const p=await motion();preserved(p);return p;
  }
  const speaking=await nod(0,false);
  await stage.screenshot({path:'output/playwright/doctor-motion-speaking-'+width+(reduced?'-reduced':'')+'.png'});
  await bubble.getByRole('button',{name:'繼續對話',exact:true}).click();
  const listening=await nod(1,true);
  if(!reduced)assert(listening.hand<.015,'listening hand returns to rest');
  await stage.screenshot({path:'output/playwright/doctor-motion-listening-'+width+(reduced?'-reduced':'')+'.png'});
  await bubble.getByRole('button',{name:'繼續對話',exact:true}).click();
  await nod(2,false);
  await page.waitForFunction(()=>{
   const p=JSON.parse(document.querySelector('[data-testid="clinic-3d-canvas"]').getAttribute('data-doctor-motion'));
   return p.talking&&!p.active&&p.nod===0&&p.lean===0&&p.hand===0;
  });
  const idle=await motion();preserved(idle);
  const b=await bubble.boundingBox(),cb=await canvas.boundingBox();
  const overlap=(a,c)=>Math.min(a.x+a.width,c.x+c.width)-Math.max(a.x,c.x)>2&&Math.min(a.y+a.height,c.y+c.height)-Math.max(a.y,c.y)>2;
  for(const p of JSON.parse(await canvas.getAttribute('data-people-areas')))assert(!overlap(b,{x:cb.x+p.left,y:cb.y+p.top,width:p.width,height:p.height}),p.id+' silhouette clear');
  for(const button of await page.locator('.three-hotspot').all())if(await button.isVisible())assert(!overlap(b,await button.boundingBox()),'label clear');
  await bubble.getByRole('button',{name:'返回診所探索',exact:true}).click();await bubble.waitFor({state:'hidden'});
  await canvas.focus();await page.keyboard.down('ArrowDown');await page.waitForTimeout(800);await page.keyboard.up('ArrowDown');
  await page.waitForFunction(()=>{
   const p=JSON.parse(document.querySelector('[data-testid="clinic-3d-canvas"]').getAttribute('data-doctor-motion'));
   return !p.attending&&!p.active&&p.bodyYaw===0&&p.headYaw===0&&p.nod===0&&p.lean===0&&p.hand===0;
  });
  preserved(await motion());assert.deepEqual(errors,[]);
  checked.push({width,reduced,turnOnApproach:true,tracksVisitor:true,speakingNod:true,listeningNod:true,repeatedTurn:true,finiteGestures:true,seatAndLegsFixed:true,returnToRest:true,bubbleClear:true,speaking,listening});
  await context.close();console.log(width,reduced,'passed');
 }
 allPassed=checked.length===4;
}finally{await browser.close();await fs.writeFile('output/doctor-motion-audit.json',JSON.stringify({checked,allPassed},null,2));}
