import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, House, Minus, Plus, RotateCcw, X } from 'lucide-react';
import type { createFormulationViewer } from '../three/createFormulationViewer';
import { createPointerTap } from '../engine/pointerTap';
import { lockModalScroll } from '../engine/modalScroll';

export function FormulationViewer({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), host = useRef<HTMLDivElement>(null), close = useRef<HTMLButtonElement>(null);
  const api = useRef<ReturnType<typeof createFormulationViewer> | null>(null);
  const backdrop = useRef(createPointerTap()), backdropTapped = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading'), [zoom, setZoom] = useState(100);
  useEffect(() => {
    const element = dialog.current!, unlockScroll = lockModalScroll();
    element.showModal(); close.current?.focus({ preventScroll: true });
    let cancelled = false;
    import('../three/createFormulationViewer').then(({ createFormulationViewer }) => {
      if (cancelled) return;
      try { api.current = createFormulationViewer(host.current!, value => setZoom(Math.round(value * 100)), () => { api.current?.dispose(); api.current = null; setStatus('failed'); }); setStatus('ready'); }
      catch { host.current?.replaceChildren(); setStatus('failed'); }
    }).catch(() => { if (!cancelled) setStatus('failed'); });
    return () => { cancelled = true; api.current?.dispose(); api.current = null; element.close(); unlockScroll(); };
  }, []);
  return <dialog ref={dialog} className="formulation-viewer" aria-labelledby="formulation-viewer-title" aria-modal="true" data-testid="formulation-viewer-dialog"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => {
      if (event.key !== 'Tab' || event.ctrlKey || event.altKey || event.metaKey) return;
      const items = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onPointerDownCapture={event => { backdropTapped.current = false; backdrop.current.down(event, event.target === event.currentTarget); }}
    onPointerMoveCapture={event => backdrop.current.move(event)}
    onPointerUpCapture={event => { backdropTapped.current = backdrop.current.up(event); }}
    onPointerCancelCapture={event => { backdrop.current.cancel(event); backdropTapped.current = false; }}
    onClick={event => { const tapped = backdropTapped.current; backdropTapped.current = false; if (event.target === event.currentTarget && tapped) onClose(); }}>
    <header className="formulation-viewer-heading"><div><p>3D 建築巡覽</p><h2 id="formulation-viewer-title">生達製劑大樓</h2></div>
      <button ref={close} className="icon-button" aria-label="關閉大樓放大檢視" onClick={onClose}><X size={24}/></button>
    </header>
    <div className="formulation-viewer-toolbar" role="group" aria-label="大樓檢視控制">
      <button disabled={status !== 'ready'} onClick={() => api.current?.rotate(-.25)} aria-label="大樓向左旋轉"><ArrowLeft size={20}/></button>
      <button disabled={status !== 'ready'} onClick={() => api.current?.rotate(.25)} aria-label="大樓向右旋轉"><ArrowRight size={20}/></button>
      <button disabled={status !== 'ready'} onClick={() => api.current?.zoom(1 / 1.2)} aria-label="縮小大樓"><Minus size={20}/></button>
      <output aria-label="大樓縮放比例">{zoom}%</output>
      <button disabled={status !== 'ready'} onClick={() => api.current?.zoom(1.2)} aria-label="放大大樓"><Plus size={20}/></button>
      <button disabled={status !== 'ready'} onClick={() => api.current?.reset()} aria-label="重設大樓視角"><RotateCcw size={20}/><span>重設</span></button>
    </div>
    <div className="formulation-viewer-stage" data-testid="formulation-viewer-stage"><div ref={host} className="formulation-viewer-host"/>
      {status !== 'ready' && <div className="formulation-viewer-message" role="status">{status === 'loading' ? '正在準備大樓3D模型…' : '此裝置暫時無法顯示放大模型，請返回七島全景繼續。'}</div>}
    </div>
    <footer className="formulation-viewer-footer"><p>拖曳旋轉 · 滾輪／雙指縮放</p><button className="button primary" onClick={onClose}><House size={19}/>回到七島全景</button></footer>
  </dialog>;
}
