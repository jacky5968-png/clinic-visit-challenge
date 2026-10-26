export const AUDIO_STORAGE_KEY='clinic-audio-settings-v1';
export interface AudioSettings {musicEnabled:boolean;effectsEnabled:boolean;musicVolume:number;effectsVolume:number;}
export const DEFAULT_AUDIO_SETTINGS:AudioSettings={musicEnabled:true,effectsEnabled:true,musicVolume:25,effectsVolume:40};
export const EFFECTS={click:'click',step:'step',enter:'enter',question:'question',correct:'correct',wrong:'wrong',success:'success',retry:'retry'} as const;
export type SoundEffect=keyof typeof EFFECTS;
export const AUDIO_PATH='assets/audio/';
export function normalizeAudioSettings(value:Partial<AudioSettings>):AudioSettings{
 const percent=(v:unknown,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?Math.round(Math.max(0,Math.min(100,v))):fallback;
 return {musicEnabled:typeof value.musicEnabled==='boolean'?value.musicEnabled:true,effectsEnabled:typeof value.effectsEnabled==='boolean'?value.effectsEnabled:true,musicVolume:percent(value.musicVolume,25),effectsVolume:percent(value.effectsVolume,40)};
}
export function readAudioSettings(storage:Pick<Storage,'getItem'>|null):AudioSettings{
 try{
  const raw=storage?.getItem(AUDIO_STORAGE_KEY);
  if(raw){const data=JSON.parse(raw);if(data?.version===1&&data.settings&&typeof data.settings==='object')return normalizeAudioSettings(data.settings);}
  // Preserve an existing explicit mute preference without touching its old key.
  if(storage?.getItem('clinic-sound')==='false')return {...DEFAULT_AUDIO_SETTINGS,musicEnabled:false,effectsEnabled:false};
 }catch{/* Private browsing or malformed preferences must not affect the game. */}
 return {...DEFAULT_AUDIO_SETTINGS};
}
