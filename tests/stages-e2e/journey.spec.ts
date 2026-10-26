import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import Papa from 'papaparse';
const csv=fs.readFileSync('tests/fixtures/seven-stage-source.csv','utf8');
const rows=Papa.parse<Record<string,string>>(csv.replace(/^\uFEFF/,''),{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim()}).data;
const stages=[
 {id:'new-training',name:'新訓中心',tags:['新人必修']},
 {id:'product-names',name:'認識產品',tags:['商品名測驗']},
 {id:'ent',name:'耳鼻喉科診所',tags:['呼吸系統']},
 {id:'pharmacy-client',name:'生達大藥局',tags:['自費']},
 {id:'gastro',name:'胃腸科診所',tags:['胃腸藥']},
 {id:'orthopedics',name:'骨科診所',tags:['肌肉骨骼']},
 {id:'internal-medicine',name:'內科診所',tags:['泌尿科','痛風','抗血栓','循環系統']},
 {id:'family',name:'家醫科診所',tags:['糖尿病','高血壓','高血脂']},
];
async function start(page:Page){await page.route('https://docs.google.com/spreadsheets/**',r=>r.fulfill({status:200,contentType:'text/csv',body:csv}));await page.goto('/');await page.getByRole('button',{name:'開始遊戲',exact:true}).click();await expect(page.getByTestId('island-map-canvas')).toHaveAttribute('data-renderer','webgl');}
async function openBank(page:Page,index:number){await page.getByTestId('stage-'+stages[index].id).click();await expect(page.getByTestId('stage-brief-dialog')).toBeVisible();await expect(page.locator('.stage-bank-section')).toBeHidden();await expect(page.getByTestId('island-travel-status')).toHaveCount(0);await page.getByRole('button',{name:'選擇本關題庫',exact:true}).click();await expect(page.getByRole('heading',{name:'第'+(index+1)+'關：'+stages[index].name,exact:true})).toBeVisible();await expect(page.getByTestId('stage-brief-dialog')).toHaveCount(0);}
async function enter(page:Page,index:number){
 await page.getByRole('button',{name:'開始第'+(index+1)+'關',exact:true}).click();
 await expect.poll(async()=>await page.locator('.active-visit-profile').isVisible()||await page.getByTestId('island-travel-status').isVisible()).toBe(true);
 if(await page.getByTestId('island-travel-status').isVisible())await page.getByRole('button',{name:'略過移動',exact:true}).click();
 await expect(page.locator('.active-visit-profile')).toContainText(stages[index].name);
 const stops=page.locator('.minimap-destinations button');await expect(stops.nth(2)).toHaveAttribute('aria-disabled','true');await stops.nth(0).click();
 for(let i=0;i<2;i++){const talk=page.getByTestId('scene-speech');await expect(talk).toBeVisible();await talk.getByRole('button',{name:'回應',exact:true}).click();await expect(talk).toHaveAttribute('data-speaker','representative');await talk.getByRole('button',{name:'完成對話',exact:true}).click();await expect(talk).toBeHidden();}
 const doctor=page.getByTestId('doctor-scene-speech');await expect(doctor).toBeVisible();for(let i=0;i<2;i++){await doctor.getByRole('button',{name:'繼續對話',exact:true}).click();await expect(doctor.locator('.doctor-scene-step')).toHaveText((i+2)+' / 3');}await doctor.locator('.scene-speech-next').click();await expect(page.getByTestId('question-prompt')).toBeVisible();
}
async function answer(page:Page,product:string,wrongFirst=false){
 const seen=new Set<string>();
 for(let i=0;i<10;i++){const prompt=(await page.getByTestId('question-prompt').innerText()).trim(),row=rows.find(r=>r['產品'].trim()===product&&r['題目'].trim()===prompt);expect(row).toBeTruthy();expect(seen.has(prompt)).toBe(false);seen.add(prompt);const correct=row!['正確答案'].trim().toUpperCase().charCodeAt(0)-65,options=page.locator('.answer-option');for(let k=0;k<4;k++)await expect(options.nth(k)).toContainText(row!['選項 '+String.fromCharCode(65+k)]?.trim()||row!['選項'+String.fromCharCode(65+k)]?.trim());await options.nth(wrongFirst&&i===0?(correct+1)%4:correct).click();await page.getByRole('button',{name:'確認送出',exact:true}).click();await expect(options.first()).toBeDisabled();await page.getByRole('button',{name:i===9?'查看挑戰結果':'下一題',exact:true}).click();}
 await expect(page.locator('.result-stats .score')).toHaveText(wrongFirst?'90 分':'100 分');
}
test('all islands open immediately; explicit briefing confirmation precedes the original category bank',async({page})=>{
 await start(page);await expect(page.locator('.island-itinerary')).toHaveCount(0);await expect(page.locator('.stage-bank-section')).toBeHidden();
 for(let i=stages.length-1;i>=0;i--){await expect(page.getByTestId('stage-'+stages[i].id)).toBeEnabled();await openBank(page,i);const expected=[...new Set(rows.filter(r=>(r['顯示分類']?.trim()||r['藥理分類']?.trim()||'').split(/[|｜]/).some(t=>stages[i].tags.includes(t.trim()))).map(r=>r['產品'].trim()))],actual:string[]=[];for(;;){actual.push(...await page.locator('.product-card h3').allTextContents());const next=page.getByRole('button',{name:'下一頁',exact:true});if(!await next.count()||!await next.isEnabled())break;await next.click();}expect(actual).toEqual(expected);await page.getByRole('button',{name:'返回八島選關',exact:true}).click();}
});
test('a first visit may qualify on island eight; one product is stored without locking other islands',async({page})=>{
 test.setTimeout(120000);await start(page);await openBank(page,7);const chosen=await page.locator('.product-information h2').innerText();await enter(page,7);await answer(page,chosen);await expect(page.getByTestId('result-qualified-count')).toContainText('1 項合格紀錄');await page.getByRole('button',{name:'選擇關卡／題庫',exact:true}).click();for(const stage of stages)await expect(page.getByTestId('stage-'+stage.id)).toBeEnabled();await page.reload();await page.getByRole('button',{name:'開始遊戲',exact:true}).click();await expect(page.getByTestId('stage-family')).toContainText('已合格 1 項');
});
test('90 points stays unqualified while every island remains freely selectable',async({page})=>{
 test.setTimeout(120000);await start(page);await openBank(page,0);const chosen=await page.locator('.product-information h2').innerText();await enter(page,0);await answer(page,chosen,true);await expect(page.getByTestId('result-qualified-count')).toContainText('0 項合格紀錄');await page.getByRole('button',{name:'選擇關卡／題庫',exact:true}).click();for(const stage of stages)await expect(page.getByTestId('stage-'+stage.id)).toBeEnabled();
});
