import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const questions=JSON.parse(await fs.readFile('src/data/questions.json','utf8'));
const browser=await chromium.launch({channel:'msedge'});
const checked=[];let allPassed=false;
try{
 for(const [width,reduced,fallback] of [[1440,false,false],[768,false,false],[390,false,false],[320,false,false],[390,true,false],[390,false,true]]){
  const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500,reducedMotion:reduced?'reduce':'no-preference'});
  if(fallback)await context.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(String(type).includes('webgl'))return null;return old.call(this,type,...args);};});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://docs.google.com/spreadsheets/**',r=>r.abort());
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button',{name:'開始遊戲',exact:true}).click();
  await page.getByRole('button',{name:'開始拜訪',exact:true}).click();
  const canvas=page.getByTestId('clinic-3d-canvas'),stage=page.getByTestId('clinic-map'),bubble=page.getByTestId('doctor-scene-speech');
  if(!fallback)await page.waitForFunction(()=>document.querySelector('[data-testid="clinic-3d-canvas"]')?.getAttribute('data-renderer')==='webgl');
  await page.getByRole('button',{name:'前往醫師診間',exact:true}).click();
  if(!reduced) await page.getByRole('button',{name:'略過移動',exact:true}).click();
  await page.getByRole('button',{name:'進入診間',exact:true}).waitFor();
  const snapshot=async()=>canvas.evaluate(el=>({x:+el.dataset.actorX,z:+el.dataset.actorZ,zoom:+el.dataset.zoom,angle:+el.dataset.azimuth,token:el.dataset.continuity}));
  if(!fallback){
   await canvas.evaluate(el=>{el.dataset.continuity='same-clinic-canvas';});
   await page.getByRole('button',{name:'向右旋轉',exact:true}).click();
   await page.getByRole('button',{name:'放大場景',exact:true}).click();
   await page.waitForTimeout(200);
  }
  const before=fallback?null:await snapshot();
  await page.getByRole('button',{name:'進入診間',exact:true}).click();
  await page.getByText('「你好，今天想介紹什麼產品？」',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'接受醫師挑戰',exact:true}).count(),0);
  async function layout(){
   await page.waitForTimeout(200);
   const sb=await stage.boundingBox(),b=await bubble.boundingBox(),cb=await canvas.boundingBox();
   assert(b.x>=sb.x-1&&b.y>=sb.y-1&&b.x+b.width<=sb.x+sb.width+1&&b.y+b.height<=sb.y+sb.height+1,'doctor bubble inside scene');
   const overlaps=(a,c)=>Math.min(a.x+a.width,c.x+c.width)-Math.max(a.x,c.x)>2&&Math.min(a.y+a.height,c.y+c.height)-Math.max(a.y,c.y)>2;
   const people=JSON.parse(await canvas.getAttribute('data-people-areas'));
   assert.equal(people.length,4);
   for(const p of people)assert(!overlaps(b,{x:cb.x+p.left,y:cb.y+p.top,width:p.width,height:p.height}),p.id+' body clear');
   for(const button of await page.locator('.three-hotspot').all())if(await button.isVisible())assert(!overlaps(b,await button.boundingBox()),'location label clear');
   assert(await bubble.evaluate(el=>el.scrollWidth<=el.clientWidth),'doctor text fits');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page fits');
  }
  if(!fallback){
   await bubble.waitFor();assert.deepEqual(await snapshot(),before,'same canvas, actor and camera on entering dialogue');
   await layout();
   await stage.screenshot({path:'output/playwright/doctor-greeting-'+width+(reduced?'-reduced':'')+'.png'});
   await canvas.focus();await canvas.press('ArrowDown');await canvas.press('e');await canvas.press('Enter');
   assert.deepEqual(await snapshot(),before,'walking and reenter blocked during dialogue');
   await page.getByRole('button',{name:'向左旋轉',exact:true}).click();await layout();
   await page.getByRole('button',{name:'俯視診所',exact:true}).click();await layout();
   const beforeReturn=await snapshot();
   await page.getByRole('button',{name:'返回診所探索',exact:true}).click();
   await bubble.waitFor({state:'hidden'});
   assert.deepEqual(await snapshot(),beforeReturn,'return keeps canvas, actor and camera');
   await page.getByRole('button',{name:'進入診間',exact:true}).click();await bubble.waitFor();
   await page.getByText('「你好，今天想介紹什麼產品？」',{exact:true}).waitFor();await layout();
  }
  await page.getByRole('button',{name:'繼續對話',exact:true}).click();
  await page.getByText('「醫師您好，今天想向您介紹這項產品。」',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'接受醫師挑戰',exact:true}).count(),0);
  if(!fallback){assert.equal(await bubble.getAttribute('data-speaker'),'representative');await layout();await stage.screenshot({path:'output/playwright/doctor-reply-'+width+(reduced?'-reduced':'')+'.png'});}
  await page.getByRole('button',{name:'繼續對話',exact:true}).click();
  await page.getByText('「好的，我想先了解幾個問題。」',{exact:true}).waitFor();
  if(!fallback){assert.equal(await bubble.getAttribute('data-speaker'),'doctor');await layout();await stage.screenshot({path:'output/playwright/doctor-invitation-'+width+(reduced?'-reduced':'')+'.png'});}
  else await page.locator('.map-panel').screenshot({path:'output/playwright/doctor-fallback-390.png'});
  await page.getByRole('button',{name:'接受醫師挑戰',exact:true}).click();
  await page.getByTestId('question-prompt').waitFor();
  assert.equal(await canvas.count(),0,'scene disposed on quiz entry');
  const complete=width===1440||width===390&&!reduced;
  if(complete){
   for(let i=0;i<5;i++){
    const prompt=await page.getByTestId('question-prompt').innerText(),q=questions.find(q=>q.prompt===prompt);assert(q);
    await page.getByRole('group',{name:'答案選項'}).getByRole('button').nth(q.correctIndex).click();
    await page.getByRole('button',{name:'確認送出',exact:true}).click();
    await page.getByRole('button',{name:i===4?'查看挑戰結果':'下一題',exact:true}).click();
   }
   assert.equal((await page.locator('.result-stats .score').innerText()).replace(/\s+/g,' '),'100 分');
  }
  assert.deepEqual(errors,[]);
  checked.push({width,reduced,fallback,originalThreeLines:true,sameCanvas:!fallback,returnToExplore:!fallback,bodyAndButtonsClear:!fallback,quizEntry:true,completed100:complete});
  await context.close();console.log(width,reduced,fallback,'passed');
 }
 allPassed=checked.length===6;
}finally{await browser.close();await fs.writeFile('output/doctor-scene-audit.json',JSON.stringify({checked,allPassed},null,2));}
