import {useMemo,useState} from 'react';
import {ArrowUpRight,CheckCircle2,ChevronDown,ClipboardList,LockKeyhole,Search} from 'lucide-react';
import type {Product,Question} from '../types';
import {sevenStages,type StageId} from '../data/sevenStages';
import {allowedInStage} from '../data/stageRules';
import {stageUnlocked,type StageQualifications} from '../engine/stageProgress';
import {availableQuestionCount} from '../engine/quiz';
import {PRODUCTS_TO_PASS_STAGE,QUESTION_COUNT} from '../config/challenge';
import '../styles/qualification-overview.css';
const normalizeSearch=(text:string)=>text.normalize('NFKC').trim().toLowerCase();

export function QualificationOverview({products,bank,qualifications,completed,selectedStageId,loading,busy,onChoose}:{
 products:Product[];bank:Question[];qualifications:StageQualifications;completed:StageId[];
 selectedStageId:StageId;loading:boolean;busy:boolean;onChoose:(stageId:StageId,productId:string)=>void;
}){
 const [expanded,setExpanded]=useState<Set<StageId>>(()=>new Set());
 const [searchText,setSearchText]=useState(''),[onlyPending,setOnlyPending]=useState(false);
 const [filterExpansion,setFilterExpansion]=useState<Partial<Record<StageId,boolean>>>({});
 const stages=useMemo(()=>sevenStages.map((stage,index)=>{
  const qualifiedNames=new Set(qualifications[stage.id].map(r=>r.productName));
  const items=products.filter(p=>allowedInStage(p,stage)).map(product=>({product,count:availableQuestionCount(bank,product.id)}));
  const qualified=items.filter(item=>qualifiedNames.has(item.product.name));
  return {stage,next:sevenStages[index+1],qualified,pending:items.filter(item=>!qualifiedNames.has(item.product.name)),
   remaining:Math.max(0,PRODUCTS_TO_PASS_STAGE-qualified.length),eligible:items.filter(item=>item.count>=QUESTION_COUNT).length,
   unlocked:stageUnlocked(stage.id,completed),passed:completed.includes(stage.id)};
 }),[products,bank,qualifications,completed]);
 const query=normalizeSearch(searchText),filterActive=Boolean(query)||onlyPending;
 const filteredStages=stages.map(data=>{
  const matches=(item:typeof data.qualified[number])=>normalizeSearch(item.product.name).includes(query);
  const visibleQualified=onlyPending?[]:data.qualified.filter(matches),visiblePending=data.pending.filter(matches);
  return {...data,visibleQualified,visiblePending,matchCount:visibleQualified.length+visiblePending.length};
 });
 const matchCount=filteredStages.reduce((count,data)=>count+data.matchCount,0);
 const matchingStageCount=filteredStages.filter(data=>data.matchCount>0).length;
 const availableMatches=filteredStages.filter(data=>data.unlocked).reduce((count,data)=>count+[...data.visibleQualified,...data.visiblePending].filter(item=>item.count>=QUESTION_COUNT).length,0);
 const initialLoading=loading&&!products.some(p=>!p.demo);
 function updateFilters(text:string,pending:boolean){setSearchText(text);setOnlyPending(pending);setFilterExpansion({});}
 function toggle(id:StageId,open:boolean){
  if(filterActive)setFilterExpansion(current=>({...current,[id]:!open}));
  else setExpanded(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next;});
 }
 function expandAll(open:boolean){
  if(filterActive)setFilterExpansion(Object.fromEntries(sevenStages.map(stage=>[stage.id,open])));
  else setExpanded(open?new Set(sevenStages.map(stage=>stage.id)):new Set());
 }
 return <section className="qualification-overview" aria-labelledby="qualification-overview-title" data-testid="qualification-overview">
  <details>
   <summary className="qualification-overview-heading">
    <ClipboardList size={25} aria-hidden="true"/>
    <div><span className="qualification-overview-eyebrow">YOUR QUALIFICATION PROGRESS</span><h2 id="qualification-overview-title">七關合格進度總覽</h2></div>
    <span className="qualification-overview-total">{completed.length}／7 關通關</span>
    <ChevronDown className="qualification-overview-chevron" size={21} aria-hidden="true"/>
   </summary>
   <div className="qualification-overview-body" aria-busy={loading}>
    <p className="qualification-overview-description">每項{QUESTION_COUNT}題全對才合格；每關任選{PRODUCTS_TO_PASS_STAGE}項不同產品／主題合格即可通關，不必完成全部名單。</p>
    <div className="qualification-overview-tools"><p>點開關卡查看完整名單。可直接選擇已開放、題數足夠的項目，再按開始前往場景。</p>
     <div><button type="button" onClick={()=>expandAll(true)}>展開全部名單</button><button type="button" onClick={()=>expandAll(false)}>收合全部名單</button></div>
    </div>
    <div className="qualification-overview-filters">
     <label className="qualification-overview-search"><span>產品／主題搜尋</span><span className="qualification-search-input"><Search size={19} aria-hidden="true"/><input type="search" value={searchText} onChange={event=>updateFilters(event.currentTarget.value,onlyPending)} aria-label="搜尋總覽產品／主題" aria-controls="qualification-overview-grid" placeholder="輸入產品或主題名稱"/></span></label>
     <label className="qualification-pending-filter"><input type="checkbox" checked={onlyPending} onChange={event=>updateFilters(searchText,event.currentTarget.checked)}/><span>只看尚未合格</span></label>
     <button type="button" className="qualification-clear-filters" disabled={!searchText&&!onlyPending} onClick={()=>updateFilters('',false)}>清除篩選</button>
    </div>
    {initialLoading?<p role="status" className="qualification-overview-loading">正在讀取題庫，合格名單載入後會自動更新。</p>:<>
     {loading&&<p role="status" className="qualification-overview-loading">題庫更新中，完成後會重新核對名單。</p>}
     {filterActive&&<p className="qualification-filter-status" data-testid="qualification-filter-status" role="status" aria-live="polite" aria-atomic="true">符合篩選 {matchCount} 項（{matchingStageCount} 關），其中 {availableMatches} 項已開放且題數足夠。各關實際合格數與解鎖條件不受篩選影響。</p>}
     {filterActive&&matchCount===0&&<p className="qualification-filter-empty" role="status">找不到符合條件的產品／主題。請更換關鍵字，或按「清除篩選」恢復完整名單。</p>}
     <div className="qualification-overview-grid" id="qualification-overview-grid">
      {filteredStages.map(({stage,next,qualified,pending,remaining,eligible,unlocked,passed,visibleQualified,visiblePending,matchCount:stageMatchCount})=>{
       const open=filterActive?(filterExpansion[stage.id]??stageMatchCount>0):expanded.has(stage.id);
       return <details key={stage.id} open={open}
       className={'qualification-stage '+(passed?'is-passed ':unlocked?'is-open ':'is-locked ')+(selectedStageId===stage.id?'is-current':'')}
       data-testid={'qualification-stage-'+stage.id}>
       <summary onClick={event=>{event.preventDefault();toggle(stage.id,open);}} aria-label={'第'+stage.stageNumber+'關 '+stage.clinic+'，已合格'+qualified.length+'項，尚差'+remaining+'項，'+(filterActive?'符合篩選'+stageMatchCount+'項，':'')+(unlocked?'可查看名單與選擇題庫':'待解鎖，可查看名單')}>
        <div className="qualification-stage-title"><span className="qualification-stage-number">{String(stage.stageNumber).padStart(2,'0')}</span><h3>{stage.clinic}</h3>
         <span className="qualification-stage-state">{passed?<><CheckCircle2 size={15}/>已通關</>:unlocked?'已開放':<><LockKeyhole size={14}/>待解鎖</>}</span>
        </div>
        <div className="qualification-stage-count"><b>已合格 {qualified.length} 項</b><span>至少 {PRODUCTS_TO_PASS_STAGE} 項</span></div>
        <progress value={Math.min(qualified.length,PRODUCTS_TO_PASS_STAGE)} max={PRODUCTS_TO_PASS_STAGE} aria-label={'第'+stage.stageNumber+'關合格進度'} aria-valuetext={'已合格'+qualified.length+'項，尚差'+remaining+'項'}/>
        <p className="qualification-stage-gap">{remaining>0?'還差 '+remaining+' 項合格':'本關合格數已達標'}{!unlocked?' · 先通過第'+(stage.stageNumber-1)+'關':passed?' · 可繼續加強':' · 繼續累積'}</p>
        <span className="qualification-stage-expand">{open?'收合名單':filterActive?'查看符合名單':'查看已合格／尚未合格名單'}{filterActive&&' · '+stageMatchCount+' 項'}<ChevronDown size={16} aria-hidden="true"/></span>
       </summary>
       <div className={'qualification-stage-body '+(visibleQualified.length?'has-qualified':'no-qualified')}>
        <p className="qualification-unlock-note">{passed?(next?'已解鎖第'+next.stageNumber+'關：'+next.clinic:'七關已全數通關。'):!unlocked?'須先通過第'+(stage.stageNumber-1)+'關，才能挑戰本關。':next?'本關通關後開放第'+next.stageNumber+'關：'+next.clinic:'本關通關後，即完成七關挑戰。'}</p>
        <p className="qualification-stage-categories">限定題庫：{stage.allowedCategories.join('、')}</p>
        {!loading&&eligible<PRODUCTS_TO_PASS_STAGE&&<p className="qualification-shortage">目前僅 {eligible} 項題數足夠，需至少{PRODUCTS_TO_PASS_STAGE}項才能通關。</p>}
        {filterActive&&stageMatchCount===0?<p className="qualification-filter-empty">本關沒有符合篩選的產品／主題。</p>:(onlyPending?[{label:'尚未合格',items:visiblePending,total:pending.length,passed:false}]:[{label:'已合格',items:visibleQualified,total:qualified.length,passed:true},{label:'尚未合格',items:visiblePending,total:pending.length,passed:false}]).map(group=><div key={group.label} className={'qualification-group '+(group.passed?'qualified':'pending')}>
         <h4>{group.label}<span>{query?'符合 '+group.items.length+'／共 '+group.total:group.items.length} 項</span></h4>
         {group.items.length?<ul>{group.items.map(({product,count})=>{
          const ready=count>=QUESTION_COUNT,canChoose=unlocked&&ready&&!busy;
          return <li key={product.id}><button type="button" className="qualification-item" disabled={!canChoose}
           aria-label={'選擇第'+stage.stageNumber+'關題庫：'+product.name} onClick={()=>onChoose(stage.id,product.id)}>
           <span><strong>{product.name}</strong><small>{count} 題 · {group.passed?'已合格':!ready?'題數不足，至少需'+QUESTION_COUNT+'題':unlocked?'可選擇挑戰':'待解鎖後挑戰'}</small></span>
           {group.passed?<CheckCircle2 size={18} aria-hidden="true"/>:canChoose?<ArrowUpRight size={18} aria-hidden="true"/>:!unlocked?<LockKeyhole size={16} aria-hidden="true"/>:null}
          </button></li>;
         })}</ul>:<p className="qualification-empty">{query?'沒有符合搜尋的'+group.label+'項目。':group.passed?'尚無合格項目。':qualified.length?'本關所有產品／主題均已合格。':'目前沒有本關分類的題庫，請重新讀取或匯入指定分類題庫。'}</p>}
        </div>)}
       </div>
      </details>;})}
     </div>
     <p className="qualification-overview-footnote">名單依目前題庫與本機新版合格紀錄同步，不會修改原題庫。尚未合格包含未挑戰或仍須重新合格的項目。</p>
    </>}
   </div>
  </details>
 </section>;
}
