import {useEffect,useRef} from 'react';
import {X,Compass,BookOpen} from 'lucide-react';
import {gameRules} from '../data/gameRules';
import {lockModalScroll} from '../engine/modalScroll';
export function HelpDialog({onClose}:{onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const node=ref.current!,restore=lockModalScroll();node.showModal();return()=>{node.close();restore();};},[]);
 return <dialog ref={ref} className="help-dialog game-dialog" aria-labelledby="game-rules-title" onCancel={e=>{e.preventDefault();onClose();}}>
  <div className="dialog-heading"><span className="eyebrow"><Compass size={18}/>FIELD MANUAL</span><button className="icon-button" aria-label="關閉遊戲說明" onClick={onClose}><X size={22}/></button></div>
  <h2 id="game-rules-title">遊戲規則・自由探索版</h2><p className="rules-intro">你的外勤旅程，由你決定。八座島嶼、八種情境，從任何一關開始。</p>
  <ol className="help-steps">{gameRules.map((rule,index)=><li key={rule.title}><span className="rule-number">{String(index+1).padStart(2,'0')}</span><div><b>{rule.title}</b><p>{rule.text}</p></div></li>)}</ol>
  <div className="demo-notice"><BookOpen size={18}/>關卡與角色為訓練情境；正式題庫仍來自「營一大挑戰」。不儲存逐題作答明細或個人身分，題庫版本更新後會重新核對合格紀錄。無法儲存時，仍可遊玩本次挑戰。</div>
  <button className="button primary full" onClick={onClose}>了解，出發探索</button>
 </dialog>;
}
