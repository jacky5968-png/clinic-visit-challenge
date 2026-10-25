import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import Papa from 'papaparse';
const csv=fs.readFileSync('tests/fixtures/seven-stage-source.csv','utf8');
const rows=Papa.parse<Record<string,string>>(csv.replace(/^\uFEFF/,''),{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim()}).data;
const stages=[
 {id:'new-training',name:'新訓中心',npc:'外勤主管',tags:['新人必修'],target:'新訓考場',action:'與外勤主管交流',challenge:'開始新人必修考驗'},
 {id:'product-names',name:'認識產品',npc:'產品教官',tags:['商品名測驗'],target:'產品教學區',action:'與產品教官交流',challenge:'開始商品名測驗'},
 {id:'ent',name:'耳鼻喉科診所',npc:'林醫師',tags:['呼吸系統'],target:'醫師診間',action:'進入診間',challenge:'接受醫師挑戰'},
 {id:'pharmacy-client',name:'生達大藥局',npc:'謝藥師',tags:['自費'],target:'藥局櫃台',action:'與謝藥師交流',challenge:'接受藥師挑戰'},
 {id:'gastro',name:'胃腸科診所',npc:'王醫師',tags:['胃腸藥'],target:'醫師診間',action:'進入診間',challenge:'接受醫師挑戰'},
 {id:'orthopedics',name:'骨科診所',npc:'李醫師',tags:['肌肉骨骼'],target:'醫師診間',action:'進入診間',challenge:'接受醫師挑戰'},
 {id:'family',name:'家醫科診所',npc:'陳醫師',tags:['糖尿病','高血壓','高血脂','泌尿科','痛風'],target:'醫師診間',action:'進入診間',challenge:'接受醫師挑戰'},
];
const legacy='{"version":1,"completed":[{"missionId":"cheng-xin","productName":"原紀錄","productKey":"keep","completedAt":1}]}';
async function start(page:Page){
 await page.route('https://docs.google.com/spreadsheets/**',r=>r.fulfill({status:200,contentType:'text/csv',body:csv}));
 await page.goto('/');await page.getByRole('button',{name:'開始遊戲',exact:true}).click();
 await expect(page.getByTestId('quiz-source-status')).toContainText(new Set(rows.map(r=>r['產品'].trim())).size+'項');
}
function expectedBanks(index:number){
 return [...new Set(rows.filter(r=>(r['顯示分類']?.trim()||r['藥理分類']?.trim()||'').split(/[|｜]/).some(c=>stages[index].tags.includes(c.trim()))).map(r=>r['產品'].trim()))];
}
async function checkBanks(page:Page,index:number){
 await expect(page.getByRole('heading',{name:'第'+(index+1)+'關：'+stages[index].name,exact:true})).toBeVisible();
 const expected=expectedBanks(index),pager=page.getByRole('navigation',{name:'產品卡片分頁'});
 if(!await pager.count()){await expect(page.locator('.product-list-item h3')).toHaveText(expected);return;}
 while(await pager.getByRole('button',{name:'上一頁',exact:true}).isEnabled())await pager.getByRole('button',{name:'上一頁',exact:true}).click();
 const actual:string[]=[];
 for(;;){
  actual.push(...await page.locator('.product-list-item h3').allTextContents());
  if(!await pager.getByRole('button',{name:'下一頁',exact:true}).isEnabled())break;
  await pager.getByRole('button',{name:'下一頁',exact:true}).click();
 }
 expect(actual).toEqual(expected);
 // Restore the selected topic's page so the subsequent visit tests keep their selection visible.
 const selected=await page.locator('.product-detail h2').innerText(),selectedPage=Math.max(0,Math.floor(expected.indexOf(selected)/9));
 while(await pager.getByRole('button',{name:'上一頁',exact:true}).isEnabled())await pager.getByRole('button',{name:'上一頁',exact:true}).click();
 for(let n=0;n<selectedPage;n++)await pager.getByRole('button',{name:'下一頁',exact:true}).click();
}
async function enter(page:Page,index:number,reduced=false){
 await page.getByRole('button',{name:'開始第'+(index+1)+'關',exact:true}).click();
 await expect.poll(async()=>await page.locator('.active-visit-profile').isVisible()||await page.getByTestId('island-travel-status').isVisible()).toBe(true);
 if(await page.getByTestId('island-travel-status').isVisible())await page.getByRole('button',{name:'略過移動',exact:true}).click();
 await expect(page.locator('.active-visit-profile')).toContainText(stages[index].npc);
 await page.getByRole('button',{name:'前往'+stages[index].target,exact:true}).click();
 if(!reduced)await page.getByRole('button',{name:'略過移動',exact:true}).click();
 // Arrival opens the conversation without a second interaction click.

 const bubble=page.getByTestId('doctor-scene-speech'),canvas=page.getByTestId('clinic-3d-canvas');
 if(await canvas.count()){
  await expect(canvas).toHaveAttribute('data-doctor',stages[index].npc);
  await expect(bubble).toContainText(stages[index].npc);
  await page.waitForTimeout(200);
  const b=(await bubble.boundingBox())!,cb=(await canvas.boundingBox())!,sb=(await page.getByTestId('clinic-map').boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(sb.x-1);expect(b.y).toBeGreaterThanOrEqual(sb.y-1);
  expect(b.x+b.width).toBeLessThanOrEqual(sb.x+sb.width+1);expect(b.y+b.height).toBeLessThanOrEqual(sb.y+sb.height+1);
  const overlap=(a:{x:number;y:number;width:number;height:number},c:typeof a)=>Math.min(a.x+a.width,c.x+c.width)-Math.max(a.x,c.x)>2&&Math.min(a.y+a.height,c.y+c.height)-Math.max(a.y,c.y)>2;
  const people=JSON.parse((await canvas.getAttribute('data-people-areas'))!) as {left:number;top:number;width:number;height:number}[];
  expect(people).toHaveLength(index===3?3:4);
  for(const p of people)expect(overlap(b,{x:cb.x+p.left,y:cb.y+p.top,width:p.width,height:p.height})).toBe(false);
  for(const button of await page.locator('.three-hotspot').all())if(await button.isVisible())expect(overlap(b,(await button.boundingBox())!)).toBe(false);
  if(test.info().title.startsWith('seven stages:'))await page.getByTestId('clinic-map').screenshot({path:'output/playwright/seven-scene-'+(index+1)+'-'+test.info().project.name+'.png',animations:'disabled'});
 }
 await page.getByRole('button',{name:'繼續對話',exact:true}).click();
 await page.getByRole('button',{name:'繼續對話',exact:true}).click();
 await page.getByRole('button',{name:stages[index].challenge,exact:true}).click();
 await expect(page.getByTestId('question-prompt')).toBeVisible();
}
async function answer(page:Page,bank:string,wrongFirst=false){
 const seen=new Set<string>();
 for(let i=0;i<10;i++){
  const prompt=await page.getByTestId('question-prompt').innerText();
  expect(seen.has(prompt)).toBe(false);seen.add(prompt);
  const r=rows.find(r=>r['產品'].trim()===bank&&r['題目'].trim()===prompt);
  expect(r,'question belongs to selected original bank').toBeTruthy();
  const correct=r!['正確答案'].trim().toUpperCase().charCodeAt(0)-65;
  const options=['A','B','C','D'].map(letter=>r!['選項 '+letter]?.trim()||r!['選項'+letter]?.trim());
  const buttons=page.getByRole('group',{name:'答案選項'}).getByRole('button');
  for(let k=0;k<4;k++)await expect(buttons.nth(k)).toContainText(options[k]);
  await expect(page.getByRole('button',{name:'確認送出',exact:true})).toBeDisabled();
  await buttons.nth(wrongFirst&&i===0?(correct+1)%4:correct).click();
  await page.getByRole('button',{name:'確認送出',exact:true}).click();
  await expect(buttons.first()).toBeDisabled();
  await expect(page.getByText('正確答案：'+String.fromCharCode(65+correct)+'．'+options[correct],{exact:true})).toBeVisible();
  await page.getByRole('button',{name:i===9?'查看挑戰結果':'下一題',exact:true}).click();
 }
 await expect(page.locator('.result-stats .score')).toHaveText(wrongFirst?'90 分':'100 分');
}

test('seven stages: ten questions, five distinct products, replay deduplication and sequential unlock',async({page},info)=>{
 test.setTimeout(900000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(value=>{if(!localStorage.getItem('field-training-v5-missions'))localStorage.setItem('field-training-v5-missions',value);},legacy);
 await start(page);
 for(let i=0;i<7;i++){if(i===0)await expect(page.getByTestId('stage-'+stages[i].id)).toBeEnabled();else await expect(page.getByTestId('stage-'+stages[i].id)).toBeDisabled();}
 for(let index=0;index<7;index++){
  await checkBanks(page,index);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if([0,1,3,6].includes(index))await page.screenshot({path:'output/playwright/seven-stage-'+(index+1)+'-'+info.project.name+'.png',fullPage:true,animations:'disabled'});
  if(index===0){
   const chosen=await page.locator('.product-detail h2').innerText();
   await enter(page,index);
   await answer(page,chosen,true);
   await expect(page.getByText('七關進度：0 / 7關已通關',{exact:true})).toBeVisible();
   await expect(page.getByRole('button',{name:/下一關：/})).toHaveCount(0);
   await expect(page.getByTestId('result-qualified-count')).toContainText('已合格 0 項');
   await page.getByRole('button',{name:'繼續挑戰本關其他產品／主題',exact:true}).click();
  }
  for(let productIndex=0;productIndex<5;productIndex++){
   const chosen=await page.locator('.product-detail h2').innerText();
   await enter(page,index);await answer(page,chosen);
   await expect(page.getByTestId('result-qualified-count')).toContainText('已合格 '+(productIndex+1)+' 項');
   if(productIndex<4){
    await expect(page.getByRole('button',{name:/下一關：/})).toHaveCount(0);
    await page.getByRole('button',{name:'繼續挑戰本關其他產品／主題',exact:true}).click();
    if(index===0&&productIndex===0){
     await page.locator('.product-list-item').filter({has:page.getByRole('heading',{name:chosen,exact:true})}).click();
     await enter(page,index);await answer(page,chosen);
     await expect(page.getByTestId('result-qualified-count')).toContainText('已合格 1 項');
     await expect(page.getByText('此產品／主題先前已合格，重複挑戰不增加合格數。',{exact:true})).toBeVisible();
     await page.getByRole('button',{name:'繼續挑戰本關其他產品／主題',exact:true}).click();
    }
   }
  }
  if(index<6){
   await expect(page.getByText('七關進度：'+(index+1)+' / 7關已通關',{exact:true})).toBeVisible();
   await page.getByRole('button',{name:'下一關：'+stages[index+1].name,exact:true}).click();
   await expect(page.getByTestId('stage-'+stages[index+1].id)).toBeEnabled();
   if(index<5)await expect(page.getByTestId('stage-'+stages[index+2].id)).toBeDisabled();
  }
 }
 await expect(page.getByText('恭喜完成七個關卡！',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('field-training-v5-missions'))).toBe(legacy);
 const records=await page.evaluate(()=>JSON.parse(localStorage.getItem('field-training-seven-stages-v2')!).completed);
 expect(records).toHaveLength(35);
 expect(records.every((r:{questionCount:number;correctCount:number})=>r.questionCount===10&&r.correctCount===10)).toBe(true);
 await page.reload();await page.getByRole('button',{name:'開始遊戲',exact:true}).click();
 await expect(page.getByTestId('mission-progress-count')).toContainText('7 / 7');
 expect(errors).toEqual([]);
});

test('source failures and wrongly classified imports cannot substitute a stage bank',async({page})=>{
 await page.route('https://docs.google.com/spreadsheets/**',r=>r.abort());
 await page.goto('/');await page.getByRole('button',{name:'開始遊戲',exact:true}).click();
 await expect(page.getByText('此關尚無可用題庫',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'開始第1關',exact:true})).toHaveCount(0);
 await page.locator('.csv-panel summary').click();
 const wrong='產品,藥理分類,題目,選項A,選項B,選項C,選項D,正確答案\n測試題庫,商品名測驗,測試題,A,B,C,D,A';
 await page.locator('input[type=file]').setInputFiles({name:'wrong-category.csv',mimeType:'text/csv',buffer:Buffer.from(wrong)});
 await expect(page.getByText('此關尚無可用題庫',{exact:true})).toBeVisible();
 await page.unroute('https://docs.google.com/spreadsheets/**');
 await page.route('https://docs.google.com/spreadsheets/**',r=>r.fulfill({status:200,contentType:'text/csv',body:csv}));
 await page.getByRole('button',{name:'重新讀取正式題庫',exact:true}).click();
 await checkBanks(page,0);
});

test('3D walking, camera, same-scene dialogue and return remain available',async({page},info)=>{
 await start(page);await page.getByRole('button',{name:'開始第1關',exact:true}).click();
 const canvas=page.getByTestId('clinic-3d-canvas');
 await expect(canvas).toHaveAttribute('data-renderer','webgl');
 await canvas.focus();const before=+(await canvas.getAttribute('data-actor-x'))!;
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(220);await page.keyboard.up('ArrowLeft');
 await expect.poll(async()=>+(await canvas.getAttribute('data-actor-x'))!).not.toBe(before);
 await page.getByRole('button',{name:'向右旋轉',exact:true}).click();
 await page.getByRole('button',{name:'放大場景',exact:true}).click();
 await canvas.evaluate(el=>el.setAttribute('data-same-scene','keep'));
 await page.getByRole('button',{name:'前往新訓考場',exact:true}).click();
 await page.getByRole('button',{name:'略過移動',exact:true}).click();
 const bubble=page.getByTestId('doctor-scene-speech');
 await expect(bubble).toContainText('外勤主管');
 await expect(canvas).toHaveAttribute('data-same-scene','keep');
 await page.getByTestId('clinic-map').screenshot({path:'output/playwright/seven-training-dialogue-'+info.project.name+'.png',animations:'disabled'});
 await page.getByRole('button',{name:'返回診所探索',exact:true}).click();
 await expect(bubble).toHaveCount(0);await expect(canvas).toHaveAttribute('data-same-scene','keep');
});

test('reduced motion and WebGL fallback keep the training challenge usable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await start(page);
 const chosen=await page.locator('.product-detail h2').innerText();
 await enter(page,0,true);await answer(page,chosen);
 await page.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:unknown[]){if(type.includes('webgl'))return null;return old.call(this,type,...args as []);} as typeof old;});
 await page.reload();await page.getByRole('button',{name:'開始遊戲',exact:true}).click();
 await page.getByTestId('stage-new-training').click();
 await page.getByRole('button',{name:'開始第1關',exact:true}).click();
 await expect(page.getByTestId('3d-fallback')).toBeVisible();
 await page.getByRole('button',{name:'前往新訓考場',exact:true}).click();
 await page.getByRole('button',{name:'繼續對話',exact:true}).click();
 await page.getByRole('button',{name:'繼續對話',exact:true}).click();
 await page.getByRole('button',{name:'開始新人必修考驗',exact:true}).click();
 await expect(page.getByTestId('question-prompt')).toBeVisible();
});

test('storage write failures retain in-session unlock without crashing',async({page})=>{
 test.setTimeout(180000);
 await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error('storage unavailable');};});
 await start(page);
 for(let i=0;i<5;i++){
  const chosen=await page.locator('.product-detail h2').innerText();
  await enter(page,0);await answer(page,chosen);
  if(i<4)await page.getByRole('button',{name:'繼續挑戰本關其他產品／主題',exact:true}).click();
 }
 await page.getByRole('button',{name:'下一關：認識產品',exact:true}).click();
 await checkBanks(page,1);
 await expect(page.getByTestId('stage-product-names')).toBeEnabled();
});
