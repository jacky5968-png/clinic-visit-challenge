import {stageUnlocked,type StageQualifications} from '../engine/stageProgress';
import {availableQuestionCount,QUESTION_COUNT} from '../engine/quiz';
import { useEffect, useState, useRef } from 'react';
import { ArrowRight, ArrowLeft, Search, Check, FileSpreadsheet, Upload, Link2 } from 'lucide-react';
import type { Product, Question } from '../types';
import { loadQuizCsv, parseQuizCsv } from '../data/csvLoader';
import { MissionSelector, type IslandDepartureHandle } from '../components/MissionSelector';
import {getStage,type StageId} from '../data/sevenStages';
import {allowedInStage} from '../data/stageRules';
import {QualificationOverview} from '../components/QualificationOverview';
const PRODUCTS_PER_PAGE=9;
export function Products({
  products,
  bank,
  selectedId,
  onSelect,
  onStart,
  onImport,
  error,
  sourceStatus,
  onReload,
  selectedMissionId,
  onSelectMission,
  completed,
  qualifications,
  legacyProgressAvailable,
  storageAvailable,
  view,onViewChange,
}: {
  products: Product[];
  bank: Question[];
  selectedId: string;
  onSelect: (id: string) => void;
  onStart: () => void;
  onImport: (data: ReturnType<typeof parseQuizCsv>) => void;
  error: string;
  sourceStatus: 'loading' | 'ready' | 'fallback' | 'imported';
  onReload: () => void;
  selectedMissionId: StageId;
  onSelectMission: (id: StageId) => void;
  completed: StageId[];
  qualifications:StageQualifications;
  legacyProgressAvailable:boolean;
  storageAvailable: boolean;
  view:'map'|'bank';onViewChange:(view:'map'|'bank')=>void;
}) {
  const islandDeparture=useRef<IslandDepartureHandle>(null),startRef=useRef(onStart);
  const productLayout=useRef<HTMLDivElement>(null);
  const bankHeading=useRef<HTMLHeadingElement>(null);
  const [travelBusy,setTravelBusy]=useState(false);startRef.current=onStart;
  function openBank(id:StageId){onSelectMission(id);onViewChange('bank');}
  useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});if(view==='bank')bankHeading.current?.focus({preventScroll:true});},[view,selectedMissionId]);
  function startVisit(){onViewChange('map');requestAnimationFrame(()=>{if(islandDeparture.current)islandDeparture.current.depart(()=>startRef.current());else startRef.current();});}
  const [search, setSearch] = useState(''),
    [url, setUrl] = useState(''),
    [csvError, setCsvError] = useState(''),
    [busy, setBusy] = useState(false);
  const [productPage,setProductPage]=useState(0);
  const previousPageStage=useRef(selectedMissionId);
  useEffect(()=>setSearch(''),[selectedMissionId]);
  const stage=getStage(selectedMissionId);
  const scoped=products.filter(p=>allowedInStage(p,stage));
  const selected = scoped.find(p=>p.id===selectedId)??scoped[0];
  const count = availableQuestionCount(bank,selected?.id??'');
  const qualifiedNames=new Set(qualifications[stage.id].map(r=>r.productName));
  const visibleProducts = scoped.filter((p) =>
    (p.name + p.ingredient + p.category).toLowerCase().includes(search.toLowerCase()),
  );
  const pageCount=Math.max(1,Math.ceil(visibleProducts.length/PRODUCTS_PER_PAGE));
  const currentPage=Math.min(productPage,pageCount-1);
  const pageProducts=visibleProducts.slice(currentPage*PRODUCTS_PER_PAGE,(currentPage+1)*PRODUCTS_PER_PAGE);
  // Keep externally selected topics visible without overriding manual paging or searches.
  useEffect(()=>{
    const changedStage=previousPageStage.current!==selectedMissionId;
    previousPageStage.current=selectedMissionId;
    const index=(changedStage?scoped:visibleProducts).findIndex(p=>p.id===selectedId);
    setProductPage(index<0?0:Math.floor(index/PRODUCTS_PER_PAGE));
  },[selectedId,selectedMissionId]);
  function changeProductPage(page:number){
    setProductPage(Math.max(0,Math.min(pageCount-1,page)));
    productLayout.current?.scrollIntoView({behavior:'instant',block:'start'});
  }
  function chooseFromOverview(stageId:StageId,productId:string){
    const candidate=products.find(p=>p.id===productId);
    if(travelBusy||!stageUnlocked(stageId,completed)||!candidate||!allowedInStage(candidate,getStage(stageId))||availableQuestionCount(bank,productId)<QUESTION_COUNT)return;
    const index=products.filter(p=>allowedInStage(p,getStage(stageId))).findIndex(p=>p.id===productId);
    setProductPage(Math.max(0,Math.floor(index/PRODUCTS_PER_PAGE)));
    setSearch('');openBank(stageId);onSelect(productId);
    requestAnimationFrame(()=>{
      productLayout.current?.scrollIntoView({behavior:'instant',block:'start'});
      productLayout.current?.querySelector<HTMLElement>('.product-information h2')?.focus({preventScroll:true});
    });
  }
  async function readUrl() {
    setBusy(true);
    setCsvError('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      onImport(await loadQuizCsv(url, controller.signal));
    } catch (e) {
      setCsvError(e instanceof Error ? e.message : '讀取失敗');
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }
  return (
    <section className="content-screen stage-selection-screen">
      <div className="world-selection" hidden={view!=='map'}>
      <MissionSelector
        onBrowse={openBank}
        ref={islandDeparture}
        onTravelChange={setTravelBusy}
        selectedId={selectedMissionId}
        onSelect={onSelectMission}
        completed={completed}
        qualifications={qualifications}
        legacyProgressAvailable={legacyProgressAvailable}
        storageAvailable={storageAvailable}
      />
      <QualificationOverview products={products} bank={bank} qualifications={qualifications} completed={completed}
        selectedStageId={selectedMissionId} loading={sourceStatus==='loading'} busy={travelBusy} onChoose={chooseFromOverview}/>
      </div>
      <div className="stage-bank-section" hidden={view!=='bank'}>
      <button className="button secondary bank-back" onClick={()=>onViewChange('map')}><ArrowLeft size={18}/>返回八島選關</button>
      <div className="section-heading">
        <span className="eyebrow">PREPARE YOUR VISIT</span>
        <h1 ref={bankHeading} tabIndex={-1}>第{stage.stageNumber}關：{stage.clinic}</h1>
        <p>選擇本關限定的產品或主題：{stage.allowedCategories.join('、')}。</p>
        <p className="stage-qualification-progress" data-testid="stage-qualification-progress" role="status">本關已合格 {qualifiedNames.size} 項 · 自由選擇產品／主題，每項 {QUESTION_COUNT} 題全對即合格。</p>
      </div>
      <div
        className={`source-status ${sourceStatus}`}
        role="status"
        data-testid="quiz-source-status"
      >
        <span>
          {sourceStatus === 'loading'
            ? '正在讀取「營一大挑戰」正式題庫…'
            : sourceStatus === 'ready'
              ? `已連線正式題庫 · ${products.filter((p) => !p.demo).length}項題庫項目 · ${bank.filter((q) => q.productId !== 'demo').length}題`
              : sourceStatus === 'imported'
                ? '目前使用手動匯入題庫'
                : '正式題庫連線失敗，目前使用已載入題庫'}
        </span>
        <button className="text-button" onClick={onReload} disabled={sourceStatus === 'loading'||travelBusy}>
          {sourceStatus === 'fallback' ? '重試連線' : '重新讀取正式題庫'}
        </button>
      </div>
      <div className="product-layout card-picker-layout" ref={productLayout}>
        <div className="product-list">
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="搜尋本關題庫" disabled={travelBusy}
              placeholder="搜尋本關產品或主題"
              value={search}
              onChange={(e) => {setSearch(e.target.value);setProductPage(0);}}
            />
          </label>
          <div className="list-caption">
            選擇產品／主題{' '}
            <span>
              符合 {visibleProducts.length}／共 {scoped.length} 項
            </span>
          </div>
          <div className="product-options" role="group" aria-label="產品清單" data-testid="product-card-grid">
            {pageProducts.map((p) => (
              <button
                key={p.id}
                disabled={travelBusy}
                className={`product-list-item product-card ${p.id === selected?.id ? 'selected' : ''}`}
                data-testid="product-card" data-product-id={p.id} aria-pressed={p.id===selected?.id}
                onClick={() => onSelect(p.id)}
              >
                <span className="product-card-top"><span className="tag">{p.category}</span>
                {p.id === selected?.id ? (
                  <span className="selection-tick">
                    <Check size={16} />
                  </span>
                ) : (
                  <ArrowRight size={18} />
                )}</span>
                <h3>{p.name}</h3>
                <span className="product-card-footer"><span className="product-question-count" aria-label={'有效題數：'+availableQuestionCount(bank,p.id)+'題'}>{availableQuestionCount(bank,p.id)}題</span><span className={'product-card-status '+(qualifiedNames.has(p.name)?'qualified':availableQuestionCount(bank,p.id)<QUESTION_COUNT?'insufficient':'pending')}>{qualifiedNames.has(p.name)?<><Check size={14}/>已合格</>:availableQuestionCount(bank,p.id)<QUESTION_COUNT?'題數不足':'待挑戰'}</span></span>
              </button>
            ))}
            {!visibleProducts.length && (
              <p className="empty-state">找不到符合的產品，請嘗試其他關鍵字。</p>
            )}
          </div>
          {pageCount>1&&<nav className="product-pagination" aria-label="產品卡片分頁"><button type="button" disabled={travelBusy||currentPage===0} onClick={()=>changeProductPage(currentPage-1)}><ArrowLeft size={22} aria-hidden="true"/>上一頁</button><span role="status" aria-live="polite">第{currentPage+1}／{pageCount}頁 · 每頁最多9項</span><button type="button" disabled={travelBusy||currentPage===pageCount-1} onClick={()=>changeProductPage(currentPage+1)}>下一頁<ArrowRight size={22} aria-hidden="true"/></button></nav>}
          <details className="csv-panel">
            <summary>
              <FileSpreadsheet size={17} />
              接入產品 CSV 題庫
            </summary>
            <p>可匯入本機CSV或公開CSV網址。匯入僅在本次瀏覽有效，僅顯示符合本關分類的題庫。</p>
            <label className="button secondary full file-label">
              <Upload size={16} />
              選擇 CSV 檔案
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={busy||travelBusy}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  setCsvError('');
                  try {
                    onImport(parseQuizCsv(await f.text()));
                  } catch (err) {
                    setCsvError((err as Error).message);
                  } finally {
                    setBusy(false);
                    e.target.value = '';
                  }
                }}
              />
            </label>
            <label className="csv-url-label">
              公開 CSV 網址
              <input
                type="url"
                disabled={travelBusy}
                placeholder="https://…/pub?output=csv"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </label>
            <button className="text-button" onClick={() => void readUrl()} disabled={busy || travelBusy || !url}>
              <Link2 size={15} />
              {busy ? '讀取中…' : '讀取網址'}
            </button>
            <p>欄位：product、question、optionA～optionD、answer。完整對照請見 README。</p>
            {csvError && (
              <p role="alert" className="error-text">
                {csvError}
              </p>
            )}
          </details>
        </div>
        {selected ? <article className="product-detail challenge-selection-panel" key={selected.id} data-testid="selected-product-summary">
          <div className="product-information">
            <span className="eyebrow">已選擇的產品／主題</span>
            <h2 tabIndex={-1}>{selected.name}</h2>
            {stage.kind!=='training'&&<p className="ingredient">{selected.ingredient}</p>}
            <div className="challenge-facts"><span>{QUESTION_COUNT}題全對合格</span><span>約5分鐘</span></div>
            <dl className="selected-topic-facts"><div><dt>有效題數</dt><dd>{count}題</dd></div><div><dt>{stage.kind==='training'?'訓練對象':'拜訪對象'}</dt><dd>{stage.doctor.name}</dd></div><div><dt>合格狀態</dt><dd>{qualifiedNames.has(selected.name)?'已合格・可再挑戰':'尚未合格'}</dd></div></dl>
            <p className="challenge-instructions">隨機抽{QUESTION_COUNT}題，題目與答案沿用原題庫；全部答對才算本項合格。</p>
            {count < QUESTION_COUNT && (
              <p className="error-text" role="alert">
                此產品只有 {count} 題有效題目，至少需要{QUESTION_COUNT}題才能開始挑戰。
              </p>
            )}
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={count < QUESTION_COUNT || busy || travelBusy || !stageUnlocked(stage.id,completed)} onClick={startVisit}>
              開始第{stage.stageNumber}關
              <ArrowRight size={18} />
            </button>
            <small className="muted">
              {selected.demo
                ? '示範題目僅涵蓋遊戲規則與資料查核。'
                : '正式使用前，請確認產品與題目內容已通過內部審核。'}
            </small>
          </div>
        </article> : <article className="product-detail stage-empty"><h2>此關尚無可用題庫</h2><p>請讀取正式題庫，或匯入包含「{stage.allowedCategories.join('、')}」分類的CSV。其他分類及示範題不會替代本關題庫。</p></article>}
      </div>
      </div>
    </section>
  );
}
