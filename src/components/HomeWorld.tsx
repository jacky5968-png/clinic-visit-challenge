import {useEffect,useRef,useState} from 'react';
import {ClinicMap} from './ClinicMap';
export function HomeWorld(){
 const host=useRef<HTMLDivElement>(null),[status,setStatus]=useState<'loading'|'ready'|'failed'>('loading');
 useEffect(()=>{let cancelled=false,dispose:(()=>void)|undefined;import('../three/createHomeWorld').then(({createHomeWorld})=>{if(cancelled)return;try{const api=createHomeWorld(host.current!);dispose=api.dispose;setStatus('ready');}catch{setStatus('failed');}}).catch(()=>{if(!cancelled)setStatus('failed');});return()=>{cancelled=true;dispose?.();};},[]);
 return <div className="home-world"><div ref={host} className="home-world-host"/>{status==='loading'&&<p className="home-world-loading" role="status">正在準備診所全景…</p>}{status==='failed'&&<ClinicMap/>}<span className="home-world-hint">{status==='failed'?'診所模擬預覽':'拖曳旋轉 · 探索生達診所'}</span></div>;
}
