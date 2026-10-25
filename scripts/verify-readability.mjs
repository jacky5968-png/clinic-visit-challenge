import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
const origin = process.env.READABILITY_URL || 'http://127.0.0.1:4173';
const csv = await fs.readFile(new URL('../output/official-quiz.csv',import.meta.url),'utf8');
const rows = Papa.parse(csv,{header:true,skipEmptyLines:true}).data;
const grouped = Map.groupBy(rows,r=>r['產品']);
const eligible = [...grouped].filter(([,q])=>q.length>=5);
const longest = eligible.sort((a,b)=>Math.max(...b[1].map(q=>q['題目'].length))-Math.max(...a[1].map(q=>q['題目'].length)))[0][0];
const report = {origin,product:longest,checks:[],errors:[],completedWidths:[]};
const browser = await chromium.launch({channel:'msedge'});
const failed = [];
async function inspect(page,label) {
  if(await page.locator('.clinic3d-stage').count())await page.locator('.clinic3d-stage').scrollIntoViewIfNeeded();
  await page.waitForTimeout(450);
  const result = await page.evaluate(() => {
    const rgb = v => (v.match(/[\d.]+/g)||[]).map(Number);
    const blend = (fg,bg) => {const a=fg[3]??1;return fg.slice(0,3).map((n,i)=>n*a+bg[i]*(1-a));};
    const lum = c => c.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0);
    const texts=[],bad=[];
    for(const el of document.body.querySelectorAll('*')){
      if(el.closest('svg,script,style') || ![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
      const s=getComputedStyle(el),b=el.getBoundingClientRect();
      if(s.visibility!=='visible'||!b.width||!b.height||b.right<0||b.left>innerWidth)continue;
      let nodes=[],p=el,shown=true;
      while(p){const c=getComputedStyle(p);if(Number(c.opacity)===0)shown=false;nodes.push(rgb(c.backgroundColor));p=p.parentElement;}
      if(!shown)continue;
      let bg=[240,246,255];for(const c of nodes.reverse())bg=blend(c,bg);
      const fg=blend(rgb(s.color),bg),l=[lum(fg),lum(bg)].sort((a,b)=>b-a),ratio=(l[0]+.05)/(l[1]+.05);
      const entry={text:el.textContent.trim().slice(0,65),tag:el.tagName,css:el.className,font:parseFloat(s.fontSize),ratio:Number(ratio.toFixed(2))};
      texts.push(entry);
      if(entry.font<14 || ratio<4.5 || !s.fontFamily.includes('JhengHei'))bad.push(entry);
    }
    const stage=document.querySelector('.clinic3d-stage');
    const boxes=[...document.querySelectorAll('.three-hotspot')].filter(e=>getComputedStyle(e).visibility==='visible').map(e=>{const b=e.getBoundingClientRect();return {text:e.textContent.trim(),x:b.x,y:b.y,r:b.right,b:b.bottom};});
    const overlapping=[];
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
      const a=boxes[i],b=boxes[j];if(Math.min(a.r,b.r)>Math.max(a.x,b.x)&&Math.min(a.b,b.b)>Math.max(a.y,b.y))overlapping.push([a.text,b.text]);
    }
    const blockedPickTargets=[];
    const canvas=document.querySelector('[data-testid="clinic-3d-canvas"]');
    if(canvas){
      const c=canvas.getBoundingClientRect();
      for(const id of ['entrance','reception','waiting','doctor']){
        const value=canvas.dataset['pick'+id];if(!value)continue;
        const point=JSON.parse(value),x=c.x+point.x,y=c.y+point.y;
        if(x<c.left||x>c.right||y<c.top||y>c.bottom||y<0||y>innerHeight)continue;
        const hit=document.elementFromPoint(x,y);
        if(hit?.closest('.three-hotspot'))blockedPickTargets.push(id);
      }
    }
    const outside=stage?boxes.filter(b=>{const s=stage.getBoundingClientRect();return b.x<s.x||b.r>s.right||b.y<s.y||b.b>s.bottom;}):[];
    const stageClipped=Boolean(stage && stage.getBoundingClientRect().width>stage.parentElement.getBoundingClientRect().width+1);
    const clipped=[...document.querySelectorAll('.answer-option,.question-card,.mission-option,.dialogue p,.product-information h2')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className);
    if(blockedPickTargets.length)clipped.push('labels block '+blockedPickTargets.join(','));
    if(stageClipped)clipped.push('clinic3d-stage exceeds container');
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,textCount:texts.length,minFont:Math.min(...texts.map(t=>t.font)),minContrast:Math.min(...texts.map(t=>t.ratio)),bad,overlapping,outside,clipped};
  });
  report.checks.push({label,...result});
  if(result.scrollWidth>result.width || result.bad.length || result.overlapping.length || result.outside.length || result.clipped.length)failed.push({label,...result});
  console.log(label,JSON.stringify({width:result.width,texts:result.textCount,minFont:result.minFont,minContrast:result.minContrast,issues:result.bad.length+result.overlapping.length+result.outside.length+result.clipped.length,overflow:result.scrollWidth-result.width}));
}
try {
  for(const width of [320,390,768,1440]){
    const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',e=>report.errors.push(e.message));
    await page.route('https://docs.google.com/spreadsheets/**',r=>r.fulfill({status:200,contentType:'text/csv; charset=utf-8',body:csv}));
    await page.goto(origin);await page.getByRole('button',{name:'開始遊戲',exact:true}).waitFor();
    await page.waitForTimeout(1000);
    await inspect(page,'home-'+width);
    await page.screenshot({path:`output/playwright/readability-home-${width}.png`,fullPage:true,animations:'disabled'});
    await page.getByRole('button',{name:'遊戲說明',exact:true}).first().click();
    await inspect(page,'help-'+width);await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'開始遊戲',exact:true}).click();
    await page.getByTestId('quiz-source-status').filter({hasText:'80項產品'}).waitFor();
    await page.getByRole('textbox',{name:'搜尋產品'}).fill(longest);
    await page.locator('.product-list-item').filter({has:page.getByRole('heading',{name:longest,exact:true})}).click();
    await inspect(page,'products-'+width);
    await page.screenshot({path:`output/playwright/readability-products-${width}.png`,fullPage:true,animations:'disabled'});
    await page.getByRole('button',{name:'開始拜訪',exact:true}).click();
    await page.locator('canvas[data-renderer="webgl"]').waitFor();
    await inspect(page,'clinic-'+width);
    await page.getByTestId('clinic-map').screenshot({path:`output/playwright/readability-clinic-${width}.png`,animations:'disabled'});
    for(const name of ['俯視診所','放大場景','向右旋轉','重設視角']){
      await page.getByRole('button',{name,exact:true}).click();
      await page.waitForTimeout(400);
      await inspect(page,'camera-'+name+'-'+width);
    }
    await page.getByRole('button',{name:'前往醫師診間',exact:true}).click();
    await page.getByRole('button',{name:'略過移動',exact:true}).click();
    await page.getByRole('button',{name:'進入診間',exact:true}).click();
    await inspect(page,'consultation-'+width);
    await page.getByRole('button',{name:'繼續對話',exact:true}).click();
    await page.getByRole('button',{name:'繼續對話',exact:true}).click();
    await page.getByRole('button',{name:'接受醫師挑戰',exact:true}).click();
    for(let i=0;i<5;i++){
      const prompt=await page.getByTestId('question-prompt').innerText();
      const q=rows.find(q=>q['產品']===longest&&q['題目']===prompt);
      assert(q,'Official question must match unchanged snapshot');
      await inspect(page,'quiz-'+width+'-'+i);
      if(i===0)await page.screenshot({path:`output/playwright/readability-quiz-${width}.png`,fullPage:true,animations:'disabled'});
      let answer=q['正確答案'].trim().charCodeAt(0)-65;
      if(i===0)answer=(answer+1)%4;
      await page.locator('.answer-option').nth(answer).click();
      await inspect(page,'selected-'+width+'-'+i);
      await page.getByRole('button',{name:'確認送出',exact:true}).click();
      await inspect(page,'feedback-'+width+'-'+i);
      await page.getByRole('button',{name:i===4?'查看挑戰結果':'下一題',exact:true}).click();
    }
    await inspect(page,'result-'+width);
    assert.equal((await page.locator('.result-stats .score').innerText()).replace(/\s+/g,' '),'80 分');
    await page.screenshot({path:`output/playwright/readability-result-${width}.png`,fullPage:true,animations:'disabled'});
    await context.close();
    report.completedWidths.push(width);
  }
} finally { await browser.close();await fs.writeFile('output/readability-audit.json',JSON.stringify({...report,failed,allPassed:report.completedWidths.length===4&&!failed.length&&!report.errors.length},null,2)); }
if(failed.length||report.errors.length){console.error('Readability issues',failed.length,report.errors);process.exitCode=1;}
else console.log('All readability checks passed:',report.checks.length);
