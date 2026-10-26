import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {AudioManager} from '../audio/AudioManager';
import type {Screen} from '../types';

export interface AudioScene {screen:Screen;questionId?:string;submitted?:boolean;passed?:boolean;}
/** Expands the original sound hook; the app owns exactly one manager. */
export function useSound(scene:AudioScene){
 const [manager]=useState(()=>new AudioManager());
 const snapshot=useSyncExternalStore(manager.subscribe,manager.getSnapshot,manager.getSnapshot);
 const previous=useRef<AudioScene|null>(null);
 useEffect(()=>{
  manager.mount();
  const visibility=()=>manager.setHidden(document.hidden);
  const click=(event:MouseEvent)=>{
   const element=event.target instanceof Element?event.target.closest('button,summary'):null;
   if(!element||element.closest('[data-audio-controls]')||element.matches(':disabled'))return;
   manager.gesture();void manager.play('click');
  };
  visibility();document.addEventListener('visibilitychange',visibility);document.addEventListener('click',click,true);
  return()=>{document.removeEventListener('visibilitychange',visibility);document.removeEventListener('click',click,true);manager.dispose();};
 },[manager]);
 useEffect(()=>{
  const before=previous.current;
  manager.setScene(scene.screen);
  if(scene.screen==='consultation'&&before?.screen!=='consultation')void manager.play('enter');
  if(scene.screen==='clinic'&&before?.screen==='products')void manager.play('enter');
  if(scene.screen==='quiz'&&scene.questionId&&!scene.submitted&&(before?.screen!=='quiz'||before.questionId!==scene.questionId))void manager.play('question');
  if(scene.screen==='result'&&before?.screen!=='result')manager.celebrate(Boolean(scene.passed));
  previous.current={...scene};
 },[manager,scene.screen,scene.questionId,scene.submitted,scene.passed]);
 return {...snapshot,manager,start:manager.start,play:manager.play,setSettings:manager.setSettings,retry:manager.retry};
}
