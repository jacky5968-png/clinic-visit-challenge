import {useEffect,useRef} from 'react';
import {ArrowRight,BookOpen,CheckCircle2,MapPin,X} from 'lucide-react';
import {getStage,type StageId} from '../data/sevenStages';
import {islandThemes} from '../data/islandStages';
import {lockModalScroll} from '../engine/modalScroll';
import {createPointerTap} from '../engine/pointerTap';

export function StageBrief({id,qualified,onClose,onChoose}:{id:StageId;qualified:number;onClose:()=>void;onChoose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),close=useRef<HTMLButtonElement>(null),tap=useRef(createPointerTap()),tapped=useRef(false);
 const stage=getStage(id),theme=islandThemes[id];
 useEffect(()=>{const node=dialog.current!,restore=lockModalScroll();node.showModal();close.current?.focus();return()=>{node.close();restore();};},[]);
 return <dialog ref={dialog} className="stage-brief game-dialog" aria-labelledby="stage-brief-title" aria-modal="true" data-testid="stage-brief-dialog"
  onCancel={event=>{event.preventDefault();onClose();}}
  onPointerDownCapture={event=>{tapped.current=false;tap.current.down(event,event.target===event.currentTarget);}}
  onPointerMoveCapture={event=>tap.current.move(event)} onPointerUpCapture={event=>{tapped.current=tap.current.up(event);}}
  onPointerCancelCapture={event=>{tap.current.cancel(event);tapped.current=false;}}
  onClick={event=>{const valid=tapped.current;tapped.current=false;if(valid&&event.target===event.currentTarget)onClose();}}
  onKeyDown={event=>{if(event.key!=='Tab')return;const buttons=[...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0]?.focus();}}}>
  <header className="stage-brief-header"><span className="stage-brief-number">{String(stage.stageNumber).padStart(2,'0')}</span><div><span className="eyebrow">MISSION BRIEFING</span><h2 id="stage-brief-title">{stage.clinic}</h2></div><button ref={close} className="icon-button" aria-label="關閉關卡說明" onClick={onClose}><X/></button></header>
  <div className="stage-brief-body"><span className="mission-access"><CheckCircle2 size={17}/>自由挑戰</span><p className="stage-brief-feature"><MapPin size={20}/>{theme.label} · {theme.feature}</p>
   <dl><div><dt>{stage.kind==='training'?'訓練對象':'拜訪對象'}</dt><dd>{stage.doctor.name}<small className="stage-brief-specialty">{stage.doctor.specialty}</small></dd></div><div><dt>本關題庫</dt><dd>{stage.allowedCategories.join('、')}</dd></div><div><dt>考核方式</dt><dd>任選一項，10題全對即合格</dd></div><div><dt>個人紀錄</dt><dd>已合格 {qualified} 項</dd></div></dl>
   <ol className="brief-route"><li><b>1</b>選產品／主題</li><li><b>2</b>01→02→03交流</li><li><b>3</b>10題考核</li></ol>
   <p className="stage-brief-note">{stage.kind==='training'?'準備好迎接教室中的實戰考驗。':'走進場景，和客戶展開一次專業拜訪。'}每座島都可隨時選擇，依自己的學習目標安排挑戰。</p>
  </div><footer className="stage-brief-footer"><button className="button secondary" onClick={onClose}>返回島群</button><button className="button primary" onClick={onChoose}><BookOpen size={18}/>選擇本關題庫<ArrowRight size={18}/></button></footer>
 </dialog>;
}
