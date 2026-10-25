import { useReducer, useState, useEffect, useRef, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  ArrowLeft,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import type { Product, Question, Screen } from './types';
import productData from './data/products.json';
import questionData from './data/questions.json';
import { gameReducer, initialState } from './engine/state';
import { useSound } from './hooks/useSound';
import { Home } from './screens/Home';
import { Products } from './screens/Products';
import { Clinic } from './screens/Clinic';
import { Quiz } from './screens/Quiz';
import { Result } from './screens/Result';
import { HelpDialog } from './components/HelpDialog';
import { loadQuizCsv, parseQuizCsv } from './data/csvLoader';
import { QUIZ_CSV_URL } from './config/quiz';
import { GAME_NAME } from './config/game';
import {defaultStage,getStage,sevenStages,type StageId} from './data/sevenStages';
import {allowedInStage} from './data/stageRules';
import {stageQualifications,completedStagesFromQualifications,stageUnlocked} from './engine/stageProgress';
import { VisitContext } from './context/VisitContext';
import {useStageProgress} from './hooks/useStageProgress';
import {missionProductKey} from './engine/missionProgress';
import { calculateResult, availableQuestionCount, QUESTION_COUNT } from './engine/quiz';
export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [products, setProducts] = useState<Product[]>(productData),
    [bank, setBank] = useState<Question[]>(questionData as Question[]);
  const [help, setHelp] = useState(false),
    [skipIntro, setSkipIntro] = useState(false),
    [notice, setNotice] = useState('');
  const [sourceStatus, setSourceStatus] = useState<'loading' | 'ready' | 'fallback' | 'imported'>(
    'loading',
  );
  const [reload, setReload] = useState(0);
  const activeLoad = useRef<AbortController | null>(null);
  const sound = useSound();
  const missions = useStageProgress();
  const [selectedMissionId, setSelectedMissionId] = useState<StageId>(defaultStage.id);
  const [activeVisit, setActiveVisit] = useState<{
    missionId: StageId;
    productKey: string;
    productName: string;
    alreadyQualified: boolean;
  } | null>(null);
  const selectedStage=getStage(selectedMissionId);
  const qualifications=useMemo(()=>stageQualifications(missions.progress,products,bank),[missions.progress,products,bank]);
  const completed=useMemo(()=>completedStagesFromQualifications(qualifications),[qualifications]);
  const selectable=useMemo(()=>products.filter(p=>allowedInStage(p,selectedStage)),[products,selectedStage]);
  useEffect(()=>{
    if(state.screen==='products'&&selectable.length&&!selectable.some(p=>p.id===state.productId))
      dispatch({type:'SELECT_PRODUCT',id:selectable[0].id});
  },[state.screen,state.productId,selectable]);
  function selectStage(id:StageId){
    if(!stageUnlocked(id,completed))return;
    setSelectedMissionId(id);
    const candidates=products.filter(p=>allowedInStage(p,getStage(id)));
    const first=candidates.find(p=>availableQuestionCount(bank,p.id)>=QUESTION_COUNT&&!qualifications[id].some(r=>r.productName===p.name))??candidates.find(p=>availableQuestionCount(bank,p.id)>=QUESTION_COUNT)??candidates[0];
    if(first)dispatch({type:'SELECT_PRODUCT',id:first.id});
    else dispatch({type:'NAVIGATE',screen:'products'});
  }
  useEffect(()=>{if(state.screen==='products'&&!stageUnlocked(selectedMissionId,completed))selectStage(sevenStages[Math.min(completed.length,6)].id);},[state.screen,completed.length,selectedMissionId]);
  function openJourney(){selectStage(sevenStages[Math.min(completed.length,6)].id);}
  const main = useRef<HTMLElement>(null);
  const product = products.find((p) => p.id === state.productId) ?? products[0];
  const activeMission = getStage(activeVisit?.missionId ?? defaultStage.id);
  useEffect(() => {
    if (state.screen === 'result' && activeVisit && calculateResult(state.answers).passed) {
      missions.complete({missionId:activeVisit.missionId,productKey:activeVisit.productKey,productName:activeVisit.productName,questionCount:QUESTION_COUNT,correctCount:QUESTION_COUNT,completedAt:Date.now()});
    }
  }, [state.screen, state.answers, activeVisit, missions.complete]);
  const navigate = (screen: Screen) => dispatch({ type: 'NAVIGATE', screen });
  const importData = (data: ReturnType<typeof parseQuizCsv>) => {
    const pending = activeLoad.current;
    activeLoad.current = null;
    pending?.abort();
    setSourceStatus('imported');
    setProducts([...productData, ...data.products]);
    setBank([...(questionData as Question[]), ...data.questions]);
    dispatch({ type: 'SELECT_PRODUCT', id: data.products.find(p=>allowedInStage(p,getStage(selectedMissionId)))?.id??data.products[0].id });
    setNotice(
      `已匯入 ${data.products.length} 項產品、${data.questions.length} 題。${data.warnings.length ? `另有 ${data.warnings.length} 列略過：${data.warnings.slice(0, 3).join(' ')} 詳細檢查請見來源CSV。` : ''}`,
    );
  };
  const previousScreen = useRef(state.screen);
  useEffect(() => {
    const keepScene = ['clinic','consultation'].includes(previousScreen.current) && ['clinic','consultation'].includes(state.screen);
    previousScreen.current = state.screen;
    if (keepScene) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    main.current?.focus({ preventScroll: true });
  }, [state.screen]);
  useEffect(() => {
    const controller = new AbortController();
    activeLoad.current = controller;
    setSourceStatus('loading');
    const timer = setTimeout(() => controller.abort(), 15000);
    loadQuizCsv(QUIZ_CSV_URL, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setProducts([...productData, ...data.products]);
        setBank([...(questionData as Question[]), ...data.questions]);
        setSourceStatus('ready');
        const first = data.products.find(
          (p) => allowedInStage(p,getStage(selectedMissionId)) && availableQuestionCount(data.questions,p.id) >= QUESTION_COUNT,
        );
        if (first) dispatch({ type: 'DEFAULT_PRODUCT', id: first.id });
        setNotice(
          data.warnings.length ? `${data.warnings.length} 列題庫資料無效已略過，請檢查來源CSV。` : '',
        );
      })
      .catch(() => {
        // 主動取消（離開/手動匯入）不影響畫面；逾時則明確提示可重試。
        if (activeLoad.current !== controller) return;
        setSourceStatus('fallback');
        setNotice('正式CSV暫時無法讀取，已保留目前題庫。可在產品頁重試連線。');
      })
      .finally(() => clearTimeout(timer));
    return () => {
      if (activeLoad.current === controller) activeLoad.current = null;
      controller.abort();
      clearTimeout(timer);
    };
  }, [reload]);
  const start = (missionId:StageId=selectedMissionId)=>{
    const stage=getStage(missionId);
    const chosen=products.find(p=>p.id===state.productId&&allowedInStage(p,stage))??products.find(p=>allowedInStage(p,stage));
    if(!stageUnlocked(missionId,completed)||!chosen||availableQuestionCount(bank,chosen.id)<QUESTION_COUNT)return;
    sound.play('click');setSelectedMissionId(missionId);
    setActiveVisit({missionId,productKey:missionProductKey(chosen,bank),productName:chosen.name,alreadyQualified:qualifications[missionId].some(r=>r.productName===chosen.name)});
    if(state.productId!==chosen.id)dispatch({type:'SELECT_PRODUCT',id:chosen.id});
    dispatch({type:'START',bank});
  };
  const nextVisit=completed.includes(activeMission.id)
    ? sevenStages[sevenStages.findIndex(s=>s.id===activeMission.id)+1] : undefined;
  const step = ['products', 'clinic', 'consultation', 'quiz', 'result'].indexOf(state.screen);
  return (
    <VisitContext.Provider value={activeMission}>
      <div className="app-shell">
        <a className="skip-link" href="#main">
          跳至主要內容
        </a>
        <header className="site-header">
          <button
            className="brand"
            onClick={() => navigate('home')}
            aria-label={`${GAME_NAME}，返回首頁`}
          >
            <span className="brand-mark">
              <img src={`${import.meta.env.BASE_URL}assets/brand/logo.jpg`} alt="生達 Logo" width={140} height={125} />
            </span>
            <span>
              <b>
                外勤養成
              </b>
              <small>營一部外勤產品推廣情境訓練</small>
            </span>
          </button>
          <nav aria-label="主選單">
            <button
              className={state.screen === 'home' ? 'nav-link active' : 'nav-link'}
              onClick={() => navigate('home')}
            >
              遊戲首頁
            </button>
            <button
              className={state.screen === 'products' ? 'nav-link active' : 'nav-link'}
              onClick={() => navigate('products')}
            >
              選擇關卡
            </button>
            <span className="nav-divider" />
            <button className="icon-button" onClick={() => setHelp(true)} aria-label="遊戲說明">
              <HelpCircle size={20} />
            </button>
            <button
              className="icon-button"
              onClick={sound.toggle}
              aria-label={`音效${sound.enabled ? '開啟' : '關閉'}`}
              aria-pressed={sound.enabled}
            >
              {sound.enabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <span className="local-badge">
              <i />
              本機體驗版
            </span>
          </nav>
        </header>
        {state.screen !== 'home' && (
          <div className="progress-bar">
            <button
              className="text-button small"
              onClick={() => navigate(state.screen === 'products' ? 'home' : 'products')}
            >
              <ArrowLeft size={15} />
              {state.screen === 'products' ? '返回首頁' : '選擇關卡／題庫'}
            </button>
            <ol>
              {['關卡題庫', '前往場景', '交流準備', '關卡考驗', '挑戰結果'].map((label, i) => (
                <li className={i === step ? 'active' : i < step ? 'complete' : ''} key={label}>
                  <span>{i < step ? '✓' : i + 1}</span>
                  {label}
                </li>
              ))}
            </ol>
            <span className="progress-caption">FIELD TRAINING</span>
          </div>
        )}
        {notice && (
          <div className="import-notice" role="status">
            {notice}
            <button onClick={() => setNotice('')} aria-label="關閉匯入通知">
              ×
            </button>
          </div>
        )}
        <main id="main" ref={main} tabIndex={-1} className="main-content" key={state.screen === 'consultation' ? 'clinic' : state.screen}>
          {state.screen === 'home' && (
            <Home
              onStart={openJourney}
              onHelp={() => setHelp(true)}
              onSkip={() => setSkipIntro(true)}
              skipIntro={skipIntro}
            />
          )}
          {state.screen === 'products' && (
            <Products
              products={products}
              bank={bank}
              selectedId={state.productId}
              onSelect={(id) => dispatch({ type: 'SELECT_PRODUCT', id })}
              onStart={() => start()}
              onImport={importData}
              error={state.error}
              sourceStatus={sourceStatus}
              onReload={() => setReload((r) => r + 1)}
              selectedMissionId={selectedMissionId}
              onSelectMission={selectStage}
              completed={completed}
              qualifications={qualifications}
              legacyProgressAvailable={missions.legacyProgressAvailable}
              storageAvailable={missions.storageAvailable}
            />
          )}
          {(state.screen === 'clinic' || state.screen === 'consultation') && (
            <Clinic
              key={activeMission.id}
              product={product}
              onEnter={() => dispatch({ type: 'ENTER_ROOM' })}
              consultation={state.screen === 'consultation' ? {product,onChallenge:()=>dispatch({type:'BEGIN_QUIZ'}),onReturn:()=>dispatch({type:'RETURN_TO_CLINIC'})}:undefined}
            />
          )}
          {state.screen === 'quiz' && (
            <Quiz
              state={state}
              product={product}
              dispatch={dispatch}
              onAnswer={(correct) => sound.play(correct ? 'correct' : 'wrong')}
            />
          )}
          {state.screen === 'result' && (
            <Result
              state={state}
              product={product}
              onRetry={() => start(activeMission.id)}
              onProducts={() => selectStage(activeMission.id)}
              onHome={() => navigate('home')}
              onSuccess={() => sound.play('success')}
              completedCount={completed.length}
              qualifiedCount={qualifications[activeMission.id].length}
              alreadyQualified={activeVisit?.alreadyQualified??false}
              nextClinic={nextVisit?.clinic}
              onNextVisit={nextVisit?()=>selectStage(nextVisit.id):undefined}
              storageAvailable={missions.storageAvailable}
            />
          )}
        </main>
        <footer className="site-footer">
          <span>
            生達化學製藥 <i />
            營一部數位訓練
          </span>
          <span>
            <ShieldCheck size={14} />
            知識在心，專業隨行 <ArrowUpRight size={14} />
          </span>
        </footer>
        {help && <HelpDialog onClose={() => setHelp(false)} />}
      </div>
    </VisitContext.Provider>
  );
}
