import {AUDIO_PATH,AUDIO_STORAGE_KEY,EFFECTS,normalizeAudioSettings,readAudioSettings,type AudioSettings,type SoundEffect} from './audioConfig';

export type MusicStatus='idle'|'loading'|'playing'|'paused'|'muted'|'blocked'|'error'|'unavailable';
export interface AudioSnapshot {
 settings:AudioSettings;started:boolean;status:MusicStatus;notice:string;storageAvailable:boolean;
 musicPlayers:number;activeEffects:number;lastEffect:SoundEffect|'';loops:number;musicGain:number;
 contextState:string;
}
interface Dependencies {
 storage?:Pick<Storage,'getItem'|'setItem'>|null;
 createContext?:()=>AudioContext|null;
 createMusic?:()=>HTMLAudioElement;
 fetch?:typeof fetch;
 baseUrl?:string;
}
type Voice={source:AudioBufferSourceNode;kind:SoundEffect};
function localStorageOrNull(){try{return localStorage;}catch{return null;}}
function audioContextOrNull(){
 const Context=globalThis.AudioContext??(globalThis as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
 return Context?new Context():null;
}

/** One owner for music, effects, preferences and cleanup; never changes game state. */
export class AudioManager {
 private settings:AudioSettings;
 private snapshot:AudioSnapshot;
 private listeners=new Set<()=>void>();
 private storage:Dependencies['storage'];
 private deps:Dependencies;
 private context:AudioContext|null=null;
 private music:HTMLAudioElement|null=null;
 private musicSource:MediaElementAudioSourceNode|null=null;
 private musicGain:GainNode|null=null;
 private effectsGain:GainNode|null=null;
 private voices=new Set<Voice>();
 private buffers=new Map<SoundEffect,Promise<AudioBuffer|null>>();
 private requests=new Set<AbortController>();
 private walking=new Set<string>();
 private steps:ReturnType<typeof setInterval>|null=null;
 private resultTimers:ReturnType<typeof setTimeout>[]=[];
 private started=false;
 private disposed=false;
 private hidden=false;
 private celebrating=false;
 private scene='home';
 private generation=0;
 private effectEpoch=0;
 private playPending=false;
 private musicAttempt=0;
 private failedMusic=false;
 private lastPosition=0;
 private lastClick=-Infinity;

 constructor(deps:Dependencies={}){
  this.deps=deps;this.storage=deps.storage===undefined?localStorageOrNull():deps.storage;
  this.settings=readAudioSettings(this.storage);
  this.snapshot={settings:this.settings,started:false,status:'idle',notice:'',storageAvailable:!!this.storage,musicPlayers:0,activeEffects:0,lastEffect:'',loops:0,musicGain:0,contextState:'not-created'};
 }
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>this.listeners.delete(listener);};
 mount(){this.disposed=false;}
 private emit(patch:Partial<AudioSnapshot>={}){
  const next={...this.snapshot,...patch,settings:this.settings,started:this.started,musicPlayers:this.music?1:0,activeEffects:this.voices.size,contextState:this.context?.state??'not-created'};
  if((Object.keys(next) as (keyof AudioSnapshot)[]).every(key=>next[key]===this.snapshot[key]))return;
  this.snapshot=next;this.listeners.forEach(listener=>listener());
 }
 private url(file:string){return `${this.deps.baseUrl??import.meta.env.BASE_URL}${AUDIO_PATH}${file}`;}
 private effectsAudible(){return this.started&&!this.disposed&&!this.hidden&&this.settings.effectsEnabled&&this.settings.effectsVolume>0;}
 private musicAudible(){return this.started&&!this.disposed&&!this.hidden&&this.settings.musicEnabled&&this.settings.musicVolume>0;}
 private ensureContext(){
  if(this.context)return this.context;
  try{
   this.context=(this.deps.createContext??audioContextOrNull)();
   if(!this.context){this.emit({status:'unavailable',notice:'此瀏覽器無法播放音訊，遊戲仍可繼續。'});return null;}
   this.musicGain=this.context.createGain();this.musicGain.gain.value=0;this.musicGain.connect(this.context.destination);
   this.effectsGain=this.context.createGain();this.effectsGain.gain.value=this.settings.effectsVolume/100;this.effectsGain.connect(this.context.destination);
   this.context.addEventListener('statechange',this.onContextState);
   return this.context;
  }catch{this.emit({status:'unavailable',notice:'音訊設備無法啟動，遊戲仍可繼續。'});return null;}
 }
 private onContextState=()=>{
  if(this.disposed)return;
  if(this.context?.state==='running')this.reconcile();
  else if(this.musicAudible())this.emit({status:'blocked'});
  else this.emit();
 };
 private ensureMusic(){
  if(this.music)return this.music;
  const ctx=this.context;if(!ctx||!this.musicGain)return null;
  try{
   const music=this.deps.createMusic?.()??document.createElement('audio');
   music.loop=true;music.preload='auto';music.volume=1;music.muted=!this.musicAudible();
   music.setAttribute('data-testid','game-bgm');music.setAttribute('aria-hidden','true');music.hidden=true;
   music.src=this.url('bgm/field-theme.wav');
   this.musicSource=ctx.createMediaElementSource(music);this.musicSource.connect(this.musicGain);this.music=music;
   music.addEventListener('playing',this.onMusicPlaying);music.addEventListener('error',this.onMusicError);
   music.addEventListener('timeupdate',this.onMusicTime);
   if(!this.deps.createMusic)document.body.append(music);
   this.emit();return music;
  }catch{this.failedMusic=true;this.emit({status:'error',notice:'背景音樂無法載入，遊戲仍可繼續。'});return null;}
 }
 private onMusicPlaying=()=>{
  if(!this.musicAudible()){this.music?.pause();return;}
  this.emit({status:this.context?.state==='running'?'playing':'blocked'});
 };
 private onMusicError=()=>{this.failedMusic=true;this.music?.pause();this.emit({status:'error',notice:'背景音樂無法載入，可重試播放；遊戲仍可繼續。'});};
 private onMusicTime=()=>{
  const time=this.music?.currentTime??0;
  if(this.lastPosition>time+2)this.emit({loops:this.snapshot.loops+1});
  this.lastPosition=time;
 };
 private targetMusicGain(){return this.musicAudible()&&!this.celebrating?this.settings.musicVolume/100*(this.scene==='quiz'?.42:this.scene==='consultation'?.55:1):0;}
 private updateGains(seconds=.18){
  const ctx=this.context;if(!ctx)return;
  const target=this.targetMusicGain();
  for(const [node,value] of [[this.musicGain,target],[this.effectsGain,this.effectsAudible()?this.settings.effectsVolume/100:0]] as const){
   if(!node)continue;const gain=node.gain;gain.cancelScheduledValues(ctx.currentTime);gain.setValueAtTime(gain.value,ctx.currentTime);
   if(seconds>0)gain.linearRampToValueAtTime(value,ctx.currentTime+seconds);else gain.setValueAtTime(value,ctx.currentTime);
  }
  this.emit({musicGain:target});
 }
 private reconcile(){
  if(this.disposed)return;
  this.updateGains();this.updateSteps();
  if(!this.started){this.emit({status:'idle'});return;}
  if(!this.musicAudible()){
   this.musicAttempt++;this.playPending=false;
   if(this.music){this.music.muted=true;this.music.pause();}
   this.emit({status:this.hidden?'paused':'muted'});return;
  }
  if(!this.context){this.emit({status:'unavailable'});return;}
  if(this.failedMusic){this.emit({status:'error'});return;}
  const music=this.ensureMusic();if(!music)return;music.muted=false;
  if(!music.paused){this.emit({status:this.context.state==='running'?'playing':'blocked'});return;}
  if(this.playPending)return;
  const generation=this.generation,attempt=++this.musicAttempt;this.playPending=true;this.emit({status:'loading'});
  try{
   Promise.resolve(music.play()).then(()=>{
    if(this.disposed||generation!==this.generation||attempt!==this.musicAttempt)return;
    if(!this.musicAudible()){music.pause();return;}
    this.emit({status:this.context?.state==='running'?'playing':'blocked'});
   }).catch(()=>{
    if(!this.disposed&&generation===this.generation&&attempt===this.musicAttempt)this.emit({status:music.error?'error':'blocked',notice:'音樂尚未播放，可按音樂設定內的「重試播放」；遊戲仍可繼續。'});
   }).finally(()=>{if(generation===this.generation&&attempt===this.musicAttempt)this.playPending=false;});
  }catch{this.playPending=false;this.emit({status:'blocked'});}
 }
 /** Must be called synchronously from the actual Start button gesture. */
 start=()=>{
  if(this.disposed)return;
  const first=!this.started;this.started=true;
  if(!this.settings.musicEnabled&&!this.settings.effectsEnabled){this.emit({status:'muted'});return;}
  const ctx=this.ensureContext();if(!ctx)return;
  this.gesture();this.reconcile();this.preloadEffects();
  if(first)void this.play('click');
 };
 gesture=()=>{
  if(!this.started||this.disposed||this.hidden)return;
  const ctx=this.context;if(!ctx)return;
  if(ctx.state==='suspended'){
   try{void ctx.resume().then(()=>{if(!this.disposed)this.reconcile();}).catch(()=>this.emit({status:'blocked'}));}catch{this.emit({status:'blocked'});}
  }
 };
 setSettings=(patch:Partial<AudioSettings>)=>{
  this.settings=normalizeAudioSettings({...this.settings,...patch});
  try{if(!this.storage)throw new Error('storage');this.storage.setItem(AUDIO_STORAGE_KEY,JSON.stringify({version:1,settings:this.settings}));this.emit({storageAvailable:true});}catch{this.emit({storageAvailable:false});}
  if(!this.settings.effectsEnabled||!this.settings.effectsVolume){this.stopEffects();this.cancelResult();}
  this.updateGains(0);
  if(this.started){this.ensureContext();this.gesture();this.preloadEffects();}
  this.reconcile();
 };
 retry=()=>{
  if(!this.started)return;
  this.failedMusic=false;this.musicAttempt++;this.playPending=false;this.lastPosition=0;this.emit({notice:''});this.music?.load();this.gesture();this.reconcile();
 };
 setScene=(scene:string)=>{
  if(scene===this.scene)return;
  this.effectEpoch++;this.cancelResult();this.scene=scene;this.reconcile();
 };
 setHidden=(hidden:boolean)=>{
  if(this.hidden===hidden)return;this.hidden=hidden;
  if(hidden){
   this.musicAttempt++;this.playPending=false;
   this.cancelResult();this.stopEffects();this.updateGains(0);this.music?.pause();this.updateSteps();
   try{void this.context?.suspend().catch(()=>{});}catch{/* Device loss must remain non-fatal. */}
   this.emit({status:this.started?'paused':'idle'});
  }else{this.gesture();this.reconcile();}
 };
 private preloadEffects(){if(this.effectsAudible())for(const kind of Object.keys(EFFECTS) as SoundEffect[])void this.loadEffect(kind);}
 private loadEffect(kind:SoundEffect):Promise<AudioBuffer|null>{
  const existing=this.buffers.get(kind);if(existing)return existing;
  const ctx=this.context;if(!ctx)return Promise.resolve(null);
  const controller=new AbortController(),generation=this.generation;this.requests.add(controller);
  const pending=(async()=>{
   try{
    const response=await (this.deps.fetch??fetch)(this.url('sfx/'+EFFECTS[kind]+'.wav'),{signal:controller.signal});
    if(!response.ok)throw new Error('audio');const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
    return !this.disposed&&generation===this.generation?buffer:null;
   }catch{if(!this.disposed&&!controller.signal.aborted)this.emit({notice:'部分音效無法載入，遊戲仍可繼續。'});return null;}
   finally{this.requests.delete(controller);}
  })();this.buffers.set(kind,pending);return pending;
 }
 play=async(kind:SoundEffect)=>{
  if(!this.effectsAudible()||!this.context)return;
  const now=Date.now();if(kind==='click'&&now-this.lastClick<70)return;if(kind==='click')this.lastClick=now;
  const epoch=this.effectEpoch,generation=this.generation,buffer=await this.loadEffect(kind);
  if(!buffer||!this.effectsAudible()||this.context?.state!=='running'||generation!==this.generation||epoch!==this.effectEpoch||Date.now()-now>1000)return;
  if(kind==='step'&&!this.walking.size)return;
  try{
   while(this.voices.size>=6)this.stopVoice(this.voices.values().next().value!);
   const source=this.context.createBufferSource();source.buffer=buffer;if(kind==='step')source.playbackRate.value=this.voices.size%2?.96:1.04;
   source.connect(this.effectsGain!);const voice={source,kind};this.voices.add(voice);
   source.onended=()=>{source.disconnect();this.voices.delete(voice);if(!this.disposed)this.emit();};
   source.start();this.emit({lastEffect:kind});
  }catch{/* Missing sound hardware must never interrupt answering or movement. */}
 };
 setWalking=(scope:string,moving:boolean)=>{
  if(moving)this.walking.add(scope);else this.walking.delete(scope);this.updateSteps();
  if(!this.walking.size)for(const voice of [...this.voices])if(voice.kind==='step')this.stopVoice(voice);
 };
 private updateSteps(){
  const active=this.walking.size>0&&this.effectsAudible();
  if(!active&&this.steps){clearInterval(this.steps);this.steps=null;}
  else if(active&&!this.steps){void this.play('step');this.steps=setInterval(()=>void this.play('step'),420);}
 }
 celebrate=(passed:boolean)=>{
  this.cancelResult();if(!this.effectsAudible())return;
  if(!passed){void this.play('retry');return;}
  this.celebrating=true;this.updateGains(.35);
  this.resultTimers.push(setTimeout(()=>{if(!this.disposed&&!this.hidden)void this.play('success');},360));
  this.resultTimers.push(setTimeout(()=>{this.celebrating=false;this.updateGains(.5);this.resultTimers=[];},4260));
 };
 private cancelResult(){
  this.resultTimers.forEach(clearTimeout);this.resultTimers=[];this.celebrating=false;
  for(const voice of [...this.voices])if(voice.kind==='success'||voice.kind==='retry')this.stopVoice(voice);
 }
 private stopVoice(voice:Voice){voice.source.onended=null;try{voice.source.stop();voice.source.disconnect();}catch{}this.voices.delete(voice);}
 private stopEffects(){this.effectEpoch++;for(const voice of [...this.voices])this.stopVoice(voice);this.emit();}
 dispose(){
  this.disposed=true;this.generation++;this.playPending=false;this.cancelResult();this.walking.clear();
  if(this.steps){clearInterval(this.steps);this.steps=null;}this.stopEffects();
  this.requests.forEach(request=>request.abort());this.requests.clear();this.buffers.clear();
  if(this.music){this.music.pause();this.music.removeEventListener('playing',this.onMusicPlaying);this.music.removeEventListener('error',this.onMusicError);this.music.removeEventListener('timeupdate',this.onMusicTime);this.music.removeAttribute('src');this.music.load();this.music.remove();this.music=null;}
  this.musicSource?.disconnect();this.musicSource=null;this.musicGain?.disconnect();this.effectsGain?.disconnect();this.musicGain=this.effectsGain=null;
  const ctx=this.context;this.context=null;ctx?.removeEventListener('statechange',this.onContextState);
  try{void ctx?.close().catch(()=>{});}catch{}this.started=false;
 }
}
