import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {AudioManager} from '../src/audio/AudioManager';
import {AUDIO_STORAGE_KEY,DEFAULT_AUDIO_SETTINGS,EFFECTS,normalizeAudioSettings,readAudioSettings} from '../src/audio/audioConfig';

class FakeParam {
 value=0;
 cancelScheduledValues=vi.fn();
 setValueAtTime=vi.fn((v:number)=>{this.value=v;});
 linearRampToValueAtTime=vi.fn((v:number)=>{this.value=v;});
}
class FakeNode {connect=vi.fn();disconnect=vi.fn();}
class FakeGain extends FakeNode {gain=new FakeParam();}
class FakeSource extends FakeNode {buffer:AudioBuffer|null=null;playbackRate={value:1};onended:(()=>void)|null=null;start=vi.fn();stop=vi.fn();}
class FakeContext extends EventTarget {
 state='suspended';currentTime=0;destination={};sources:FakeSource[]=[];gains:FakeGain[]=[];
 resume=vi.fn(async()=>{this.state='running';this.dispatchEvent(new Event('statechange'));});
 suspend=vi.fn(async()=>{this.state='suspended';this.dispatchEvent(new Event('statechange'));});
 close=vi.fn(async()=>{this.state='closed';});
 createGain=()=>{const gain=new FakeGain();this.gains.push(gain);return gain as unknown as GainNode;};
 createMediaElementSource=vi.fn(()=>new FakeNode() as unknown as MediaElementAudioSourceNode);
 createBufferSource=()=>{const source=new FakeSource();this.sources.push(source);return source as unknown as AudioBufferSourceNode;};
 decodeAudioData=vi.fn(async(data:ArrayBuffer)=>({duration:.4,tag:Object.keys(EFFECTS)[new Uint8Array(data)[0]]}) as unknown as AudioBuffer);
}
class FakeMusic extends EventTarget {
 paused=true;loop=false;preload='';volume=1;muted=false;hidden=true;src='';currentTime=0;error:MediaError|null=null;
 play=vi.fn(async()=>{this.paused=false;this.dispatchEvent(new Event('playing'));});
 pause=vi.fn(()=>{this.paused=true;});load=vi.fn();remove=vi.fn();setAttribute=vi.fn();removeAttribute=vi.fn();
}
const managers:AudioManager[]=[];
const settle=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
function setup(options:{storage?:Map<string,string>;fetchFail?:boolean;blocked?:boolean;unavailable?:boolean}={}){
 const values=options.storage??new Map<string,string>(),ctx=new FakeContext(),music=new FakeMusic();
 if(options.blocked)music.play=vi.fn(async()=>{throw new Error('NotAllowedError');});
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:vi.fn((key:string,value:string)=>{values.set(key,value);})};
 const createContext=vi.fn(()=>options.unavailable?null:ctx as unknown as AudioContext),createMusic=vi.fn(()=>music as unknown as HTMLAudioElement);
 const fetcher=vi.fn(async(url:string|URL|Request)=>({ok:!options.fetchFail,arrayBuffer:async()=>Uint8Array.of(Object.keys(EFFECTS).indexOf(String(url).split('/').at(-1)!.replace('.wav',''))).buffer} as Response));
 const manager=new AudioManager({storage,createContext,createMusic,fetch:fetcher as typeof fetch,baseUrl:'/clinic/'});
 managers.push(manager);return {manager,ctx,music,storage,values,createContext,createMusic,fetcher};
}
const tags=(ctx:FakeContext)=>ctx.sources.map(s=>(s.buffer as unknown as {tag:string})?.tag);
beforeEach(()=>vi.useFakeTimers());
afterEach(()=>{managers.splice(0).forEach(m=>m.dispose());vi.useRealTimers();});

describe('audio preferences',()=>{
 it('defaults to 25% music and 40% effects, clamps malformed values',()=>{
  expect(readAudioSettings(null)).toEqual(DEFAULT_AUDIO_SETTINGS);
  expect(normalizeAudioSettings({musicVolume:200,effectsVolume:-2})).toMatchObject({musicVolume:100,effectsVolume:0});
  expect(normalizeAudioSettings({musicVolume:NaN})).toMatchObject({musicVolume:25});
 });
 it('preserves legacy mute and never writes progress keys',()=>{
  const {manager,values,storage}=setup({storage:new Map([['clinic-sound','false'],['clinic-stage-progress','original-progress']])});
  expect(manager.getSnapshot().settings).toMatchObject({musicEnabled:false,effectsEnabled:false});
  manager.setSettings({musicVolume:37,effectsVolume:61});
  expect(storage.setItem).toHaveBeenCalledTimes(1);expect(storage.setItem.mock.calls[0][0]).toBe(AUDIO_STORAGE_KEY);
  expect(values.get('clinic-stage-progress')).toBe('original-progress');expect(values.get('clinic-sound')).toBe('false');
  expect(readAudioSettings(storage)).toMatchObject({musicVolume:37,effectsVolume:61,musicEnabled:false});
 });
 it('recovers from invalid JSON and blocked storage without throwing',()=>{
  expect(readAudioSettings({getItem:()=>'{broken'})).toEqual(DEFAULT_AUDIO_SETTINGS);
  const manager=new AudioManager({storage:{getItem:()=>null,setItem:()=>{throw Error('denied');}}});managers.push(manager);
  expect(()=>manager.setSettings({effectsVolume:12})).not.toThrow();expect(manager.getSnapshot().storageAvailable).toBe(false);
 });
});

describe('single audio owner',()=>{
 it('creates no player, context or network request before explicit start',async()=>{
  const x=setup();x.manager.setScene('quiz');x.manager.setWalking('clinic',true);await x.manager.play('correct');
  x.manager.setSettings({musicVolume:45});expect(x.createContext).not.toHaveBeenCalled();expect(x.createMusic).not.toHaveBeenCalled();expect(x.fetcher).not.toHaveBeenCalled();
 });
 it('loops the real music asset and reuses one context and one player across scenes',async()=>{
  const x=setup();x.manager.start();await settle();
  for(const scene of ['products','clinic','consultation','quiz','result','home'])x.manager.setScene(scene);
  x.manager.start();await settle();
  expect(x.music.loop).toBe(true);expect(x.music.src).toBe('/clinic/assets/audio/bgm/field-theme.wav');
  expect(x.createContext).toHaveBeenCalledTimes(1);expect(x.createMusic).toHaveBeenCalledTimes(1);expect(x.ctx.createMediaElementSource).toHaveBeenCalledTimes(1);
  expect(x.manager.getSnapshot().musicPlayers).toBe(1);expect(x.music.play).toHaveBeenCalledTimes(1);
  x.music.currentTime=76;x.music.dispatchEvent(new Event('timeupdate'));x.music.currentTime=.1;x.music.dispatchEvent(new Event('timeupdate'));
  expect(x.manager.getSnapshot().loops).toBe(1);
 });
 it('ducks for conversation and questions, and adjusts independent channel gains',async()=>{
  const x=setup();x.manager.start();await settle();x.manager.setScene('consultation');expect(x.manager.getSnapshot().musicGain).toBeCloseTo(.1375);
  x.manager.setScene('quiz');expect(x.manager.getSnapshot().musicGain).toBeCloseTo(.105);
  x.manager.setSettings({musicVolume:50,effectsVolume:80});expect(x.manager.getSnapshot().musicGain).toBeCloseTo(.21);expect(x.ctx.gains[1].gain.value).toBe(.8);
  x.manager.setScene('home');expect(x.manager.getSnapshot().musicGain).toBe(.5);
 });
 it('plays distinct correct, wrong, question and transition assets without restarting music',async()=>{
  const x=setup();x.manager.start();await settle();
  for(const kind of ['correct','wrong','question','enter'] as const)await x.manager.play(kind);
  expect(tags(x.ctx)).toEqual(expect.arrayContaining(['correct','wrong','question','enter']));expect(x.music.play).toHaveBeenCalledTimes(1);
 });
 it('fades music for the 3.8-second victory cue then restores current settings',async()=>{
  const x=setup();x.manager.start();await settle();x.manager.setScene('result');x.manager.celebrate(true);
  expect(x.manager.getSnapshot().musicGain).toBe(0);await vi.advanceTimersByTimeAsync(360);expect(tags(x.ctx)).toContain('success');
  x.manager.setSettings({musicVolume:32});expect(x.manager.getSnapshot().musicGain).toBe(0);
  await vi.advanceTimersByTimeAsync(3900);expect(x.manager.getSnapshot().musicGain).toBe(.32);
  expect(x.music.play).toHaveBeenCalledTimes(1);
 });
 it('uses an encouraging failure cue and cancels a pending victory when leaving results',async()=>{
  const x=setup();x.manager.start();await settle();x.manager.celebrate(false);await settle();expect(tags(x.ctx)).toContain('retry');
  x.manager.setScene('result');x.manager.celebrate(true);x.manager.setScene('home');await vi.advanceTimersByTimeAsync(5000);
  expect(tags(x.ctx)).not.toContain('success');expect(x.manager.getSnapshot().musicGain).toBe(.25);
 });
 it('keeps music playing when effects are disabled rather than inserting silent celebrations',async()=>{
  const x=setup();x.manager.start();await settle();x.manager.setSettings({effectsEnabled:false});x.manager.celebrate(true);
  await vi.advanceTimersByTimeAsync(5000);expect(tags(x.ctx)).not.toContain('success');expect(x.manager.getSnapshot().musicGain).toBe(.25);
 });
 it('pauses on tab hiding and resumes the same position and player',async()=>{
  const x=setup();x.manager.start();await settle();x.music.currentTime=12.4;x.manager.setHidden(true);await settle();
  expect(x.music.paused).toBe(true);expect(x.ctx.suspend).toHaveBeenCalled();expect(x.manager.getSnapshot().activeEffects).toBe(0);
  x.manager.setHidden(false);await settle();expect(x.music.paused).toBe(false);expect(x.music.currentTime).toBe(12.4);expect(x.createMusic).toHaveBeenCalledTimes(1);
 });
 it('never starts sound when muted, including walking, result timers or tab restoration',async()=>{
  const x=setup();x.manager.setSettings({musicEnabled:false,effectsEnabled:false});x.manager.start();x.manager.setWalking('clinic',true);x.manager.celebrate(true);
  x.manager.setHidden(true);x.manager.setHidden(false);x.manager.setScene('products');await x.manager.play('correct');await vi.advanceTimersByTimeAsync(6000);
  expect(x.manager.getSnapshot().status).toBe('muted');
  expect(x.createContext).not.toHaveBeenCalled();expect(x.createMusic).not.toHaveBeenCalled();expect(x.ctx.sources).toHaveLength(0);
 });
 it('volume zero immediately silences both channels and discards queued effects',async()=>{
  const x=setup();x.manager.start();await settle();await x.manager.play('correct');x.manager.setSettings({musicVolume:0,effectsVolume:0});
  const count=x.ctx.sources.length;x.manager.setWalking('clinic',true);x.manager.setHidden(true);x.manager.setHidden(false);await vi.advanceTimersByTimeAsync(1000);
  expect(x.music.paused).toBe(true);expect(x.music.muted).toBe(true);expect(x.ctx.sources.length).toBe(count);expect(x.manager.getSnapshot().activeEffects).toBe(0);expect(x.ctx.gains.every(g=>g.gain.value===0)).toBe(true);
 });
 it('uses one quiet step timer for simultaneous movement owners and stops after movement',async()=>{
  const x=setup();x.manager.start();await settle();x.manager.setWalking('islands',true);x.manager.setWalking('clinic',true);
  await vi.advanceTimersByTimeAsync(900);expect(tags(x.ctx).filter(t=>t==='step').length).toBe(3);
  x.manager.setWalking('islands',false);x.manager.setWalking('clinic',false);const count=x.ctx.sources.length;
  await vi.advanceTimersByTimeAsync(1000);expect(x.ctx.sources.length).toBe(count);
 });
 it('bounds simultaneous voices and releases all players, nodes and timers on disposal',async()=>{
  const x=setup();x.manager.start();await settle();for(let i=0;i<15;i++)await x.manager.play('correct');
  expect(x.manager.getSnapshot().activeEffects).toBeLessThanOrEqual(6);x.manager.setWalking('clinic',true);x.manager.dispose();await vi.advanceTimersByTimeAsync(5000);
  expect(x.ctx.close).toHaveBeenCalledTimes(1);expect(x.music.remove).toHaveBeenCalledTimes(1);expect(x.music.paused).toBe(true);
  expect(x.ctx.sources.every(source=>source.stop.mock.calls.length>0)).toBe(true);
 });
 it('treats autoplay rejection, missing files and unavailable hardware as non-fatal',async()=>{
  const blocked=setup({blocked:true});blocked.manager.start();await settle();expect(blocked.manager.getSnapshot().status).toBe('blocked');
  const failed=setup({fetchFail:true});failed.manager.start();await settle();await expect(failed.manager.play('wrong')).resolves.toBeUndefined();expect(failed.manager.getSnapshot().notice).toContain('無法載入');
  const unavailable=setup({unavailable:true});expect(()=>unavailable.manager.start()).not.toThrow();expect(unavailable.manager.getSnapshot().status).toBe('unavailable');
  const broken=setup();broken.manager.start();await settle();broken.music.dispatchEvent(new Event('error'));expect(broken.manager.getSnapshot().status).toBe('error');
  await expect(broken.manager.play('correct')).resolves.toBeUndefined();expect(tags(broken.ctx)).toContain('correct');
 });
 it('ignores obsolete playback promises when muted or rapidly re-enabled during loading',async()=>{
  const x=setup();let reject:(error:Error)=>void=()=>{};
  x.music.play=vi.fn(()=>new Promise<void>((_,no)=>{reject=no;}));x.manager.start();
  x.manager.setSettings({musicEnabled:false});reject(new Error('AbortError'));await settle();expect(x.manager.getSnapshot().status).toBe('muted');
  x.music.play=vi.fn(async()=>{x.music.paused=false;x.music.dispatchEvent(new Event('playing'));});
  x.manager.setSettings({musicEnabled:true});await settle();expect(x.manager.getSnapshot().status).toBe('playing');expect(x.createMusic).toHaveBeenCalledTimes(1);
 });
});

describe('shipped original audio files',()=>{
 it('contains playable PCM assets with bounded loudness, a natural loop and a 3–5 second victory',()=>{
  const folder=new URL('../public/assets/audio/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',folder),'utf8'));
  expect(manifest.files).toHaveLength(9);
  for(const asset of manifest.files){
   const data=readFileSync(new URL(asset.file,folder));expect(data.toString('ascii',0,4)).toBe('RIFF');expect(data.toString('ascii',8,12)).toBe('WAVE');
   expect(data.readUInt16LE(20)).toBe(1);expect(data.readUInt16LE(34)).toBe(16);expect(data.length).toBe(asset.bytes);expect(data.readUInt32LE(40)).toBe(data.length-44);
   let peak=0;for(let i=44;i<data.length;i+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(i))/32768);
   expect(peak).toBeGreaterThan(.05);expect(peak).toBeLessThan(.7);
  }
  const theme=manifest.files.find((f:{file:string})=>f.file.startsWith('bgm/'));expect(theme.durationSeconds).toBeGreaterThanOrEqual(60);expect(theme.durationSeconds).toBeLessThanOrEqual(90);expect(theme.seamJump).toBeLessThan(.01);
  const victory=manifest.files.find((f:{file:string})=>f.file==='sfx/success.wav');expect(victory.durationSeconds).toBeGreaterThanOrEqual(3);expect(victory.durationSeconds).toBeLessThanOrEqual(5);
 });
});
