import {useMemo,useState} from 'react';
import {ArrowUpRight,CheckCircle2,ChevronDown,ClipboardList,Search} from 'lucide-react';
import type {Product,Question} from '../types';
import {sevenStages,type StageId} from '../data/sevenStages';
import {allowedInStage} from '../data/stageRules';
import type {StageQualifications} from '../engine/stageProgress';
import {availableQuestionCount} from '../engine/quiz';
import {QUESTION_COUNT} from '../config/challenge';
import '../styles/qualification-overview.css';
const normalize=(text:string)=>text.normalize('NFKC').trim().toLowerCase();
export function QualificationOverview({products,bank,qualifications,selectedStageId,loading,busy,onChoose}:{products:Product[];bank:Question[];qualifications:StageQualifications;completed:StageId[];selectedStageId:StageId;loading:boolean;busy:boolean;onChoose:(stageId:StageId,productId:string)=>void;}){
 const [expanded,setExpanded]=useState<Set<StageId>>(()=>new Set()),[search,setSearch]=useState(''),[onlyPending,setOnlyPending]=useState(false);
 const [overrides,setOverrides]=useState<Partial<Record<StageId,boolean>>>({});
 const stages=useMemo(()=>sevenStages.map(stage=>{const names=new Set(qualifications[stage.id].map(r=>r.productName));const items=products.filter(p=>allowedInStage(p,stage)).map(product=>({product,count:availableQuestionCount(bank,product.id),qualified:names.has(product.name)}));return {stage,items,qualified:items.filter(i=>i.qualified)};}),[products,bank,qualifications]);
 const query=normalize(search),filtered=Boolean(query)||onlyPending,total=stages.reduce((n,s)=>n+s.qualified.length,0);
 const results=stages.map(data=>({...data,visible:data.items.filter(i=>(!onlyPending||!i.qualified)&&normalize(i.product.name).includes(query))}));
 const matches=results.reduce((n,s)=>n+s.visible.length,0);
 function update(text:string,pending:boolean){setSearch(text);setOnlyPending(pending);setOverrides({});}
 function toggle(id:StageId,open:boolean){if(filtered)setOverrides(v=>({...v,[id]:!open}));else setExpanded(v=>{const n=new Set(v);if(n.has(id))n.delete(id);else n.add(id);return n;});}
 function expandAll(open:boolean){if(filtered)setOverrides(Object.fromEntries(sevenStages.map(s=>[s.id,open])));else setExpanded(open?new Set(sevenStages.map(s=>s.id)):new Set());}
 return <section className="qualification-overview" aria-labelledby="qualification-overview-title" data-testid="qualification-overview"><details>
  <summary className="qualification-overview-heading"><ClipboardList size={25}/><div><span className="qualification-overview-eyebrow">YOUR COLLECTION</span><h2 id="qualification-overview-title">八關合格進度總覽</h2></div><span className="qualification-overview-total">已合格 {total} 項</span><ChevronDown className="qualification-overview-chevron" size={21}/></summary>
  <div className="qualification-overview-body" aria-busy={loading}><p className="qualification-overview-description">八關自由挑戰，每項{QUESTION_COUNT}題全對即合格。依自己的目標探索各島，合格紀錄按產品／主題保存。</p>
   <div className="qualification-overview-tools"><p>展開關卡可查看合格名單，或直接選擇下一個挑戰項目。</p><div><button onClick={()=>expandAll(true)}>展開全部名單</button><button onClick={()=>expandAll(false)}>收合全部名單</button></div></div>
   <div className="qualification-overview-filters"><label className="qualification-overview-search"><span>產品／主題搜尋</span><span className="qualification-search-input"><Search size={19}/><input type="search" value={search} onChange={e=>update(e.target.value,onlyPending)} aria-label="搜尋總覽產品／主題" placeholder="輸入產品或主題名稱"/></span></label><label className="qualification-pending-filter"><input type="checkbox" checked={onlyPending} onChange={e=>update(search,e.target.checked)}/><span>只看尚未合格</span></label><button className="qualification-clear-filters" disabled={!filtered} onClick={()=>update('',false)}>清除篩選</button></div>
   {loading&&<p role="status">正在同步題庫與合格紀錄…</p>}
   {filtered&&<p className="qualification-filter-status" data-testid="qualification-filter-status" role="status">符合篩選 {matches} 項。八關皆可自由選擇，題數足夠即可開始。</p>}
   {filtered&&!matches&&<p role="status" className="qualification-filter-empty">找不到符合條件的產品／主題，請更換關鍵字或清除篩選。</p>}
   <div className="qualification-overview-grid" id="qualification-overview-grid">{results.map(({stage,items,qualified,visible})=>{const open=filtered?(overrides[stage.id]??visible.length>0):expanded.has(stage.id);return <details key={stage.id} open={open} className={'qualification-stage is-open '+(selectedStageId===stage.id?'is-current':'')} data-testid={'qualification-stage-'+stage.id}>
    <summary onClick={e=>{e.preventDefault();toggle(stage.id,open);}} aria-label={'第'+stage.stageNumber+'關 '+stage.clinic+'，已合格'+qualified.length+'項，自由挑戰'}><div className="qualification-stage-title"><span className="qualification-stage-number">{String(stage.stageNumber).padStart(2,'0')}</span><h3>{stage.clinic}</h3><span className="qualification-stage-state">自由挑戰</span></div><div className="qualification-stage-count"><b>已合格 {qualified.length} 項</b><span>題庫 {items.length} 項</span></div><progress value={qualified.length} max={Math.max(1,items.length)} aria-label={'第'+stage.stageNumber+'關合格紀錄'}/><p className="qualification-stage-gap">尚未合格 {items.length-qualified.length} 項 · 自由安排挑戰</p><span className="qualification-stage-expand">{open?'收合名單':'查看已合格／尚未合格名單'}<ChevronDown size={16}/></span></summary>
    <div className="qualification-stage-body"><p className="qualification-stage-categories">本關題庫：{stage.allowedCategories.join('、')}</p>{(onlyPending?[false]:[true,false]).map(passed=>{const group=visible.filter(i=>i.qualified===passed);return <div key={String(passed)} className={'qualification-group '+(passed?'qualified':'pending')}><h4>{passed?'已合格':'尚未合格'}<span>{group.length} 項</span></h4>{group.length?<ul>{group.map(({product,count})=><li key={product.id}><button className="qualification-item" disabled={busy||count<QUESTION_COUNT} aria-label={'選擇第'+stage.stageNumber+'關題庫：'+product.name} onClick={()=>onChoose(stage.id,product.id)}><span><strong>{product.name}</strong><small>{count}題 · {passed?'已合格，可再挑戰':count<QUESTION_COUNT?'題數不足，至少需10題':'可選擇挑戰'}</small></span>{passed?<CheckCircle2 size={18}/>:<ArrowUpRight size={18}/>}</button></li>)}</ul>:<p className="qualification-empty">{passed?'尚無符合的合格項目。':'沒有符合的待挑戰項目。'}</p>}</div>;})}</div>
   </details>;})}</div><p className="qualification-overview-footnote">紀錄依目前題庫版本核對；搜尋與篩選不會改變合格紀錄。</p>
  </div></details></section>;
}
