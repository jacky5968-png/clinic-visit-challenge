import {useEffect,useId,useRef,useState} from 'react';
import {Music2,VolumeX,X} from 'lucide-react';
import type {useSound} from '../hooks/useSound';
import '../styles/audio.css';

const statusText={idle:'按「開始遊戲」後播放',loading:'正在準備背景音樂…',playing:'背景音樂循環播放中',paused:'背景音樂已暫停',muted:'背景音樂已靜音',blocked:'等待允許音樂播放',error:'背景音樂暫時無法播放',unavailable:'此裝置無法播放音訊'};
export function AudioControls({audio}:{audio:ReturnType<typeof useSound>}){
 const [open,setOpen]=useState(false),id=useId();
 const root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null);
 const audible=(audio.settings.musicEnabled&&audio.settings.musicVolume>0)||(audio.settings.effectsEnabled&&audio.settings.effectsVolume>0);
 useEffect(()=>{
  if(!open)return;
  panel.current?.focus({preventScroll:true});
  const closeOutside=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);button.current?.focus();}};
  document.addEventListener('pointerdown',closeOutside);document.addEventListener('keydown',escape,true);
  return()=>{document.removeEventListener('pointerdown',closeOutside);document.removeEventListener('keydown',escape,true);};
 },[open]);
 return <div className="game-audio" data-audio-controls data-testid="game-audio" ref={root}
  data-playback={audio.status} data-last-effect={audio.lastEffect} data-music-players={audio.musicPlayers}
  data-active-effects={audio.activeEffects} data-music-gain={audio.musicGain} data-context={audio.contextState} data-loops={audio.loops}>
  <button ref={button} className="icon-button" type="button" aria-label="音樂與音效設定" title="音樂與音效設定" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>
   {audible?<Music2 size={20}/>:<VolumeX size={20}/>}
  </button>
  {open&&<section id={id} className="audio-panel" ref={panel} tabIndex={-1} aria-label="音樂與音效設定">
   <div className="audio-panel-heading"><h2>音樂與音效</h2><button type="button" aria-label="關閉音樂設定" onClick={()=>{setOpen(false);button.current?.focus();}}><X size={20}/></button></div>
   <div className="audio-channel"><label className="audio-toggle"><span>背景音樂</span><input type="checkbox" role="switch" aria-label="背景音樂開關" checked={audio.settings.musicEnabled} onChange={event=>audio.setSettings({musicEnabled:event.target.checked})}/></label>
    <label className="audio-volume" htmlFor={id+'-music'}><span>音樂音量</span><output>{audio.settings.musicVolume}%</output></label>
    <input id={id+'-music'} type="range" min={0} max={100} step={1} aria-label="背景音樂音量" aria-valuetext={audio.settings.musicVolume+'%'} value={audio.settings.musicVolume} onChange={event=>audio.setSettings({musicVolume:Number(event.target.value)})}/>
   </div>
   <div className="audio-channel"><label className="audio-toggle"><span>遊戲音效</span><input type="checkbox" role="switch" aria-label="遊戲音效開關" checked={audio.settings.effectsEnabled} onChange={event=>audio.setSettings({effectsEnabled:event.target.checked})}/></label>
    <label className="audio-volume" htmlFor={id+'-effects'}><span>音效音量</span><output>{audio.settings.effectsVolume}%</output></label>
    <input id={id+'-effects'} type="range" min={0} max={100} step={1} aria-label="遊戲音效音量" aria-valuetext={audio.settings.effectsVolume+'%'} value={audio.settings.effectsVolume} onChange={event=>audio.setSettings({effectsVolume:Number(event.target.value)})}/>
   </div>
   <p className="audio-status" role="status">{statusText[audio.status]}</p>
   {audio.started&&['blocked','error'].includes(audio.status)&&<button type="button" className="audio-retry" onClick={audio.retry}>重試播放</button>}
   {audio.notice&&<p className="audio-note">{audio.notice}</p>}
   <p className="audio-note">問答時會自動降低背景音量。{audio.storageAvailable?'設定會儲存在此瀏覽器。':'此瀏覽器無法保存設定，本次仍可調整。'}</p>
  </section>}
 </div>;
}
