import {createContext,useContext,useEffect} from 'react';
import type {AudioManager} from './AudioManager';
export const GameAudioContext=createContext<AudioManager|null>(null);
export function useMovementAudio(scope:string,moving:boolean){
 const audio=useContext(GameAudioContext);
 useEffect(()=>{audio?.setWalking(scope,moving);return()=>audio?.setWalking(scope,false);},[audio,scope,moving]);
}
