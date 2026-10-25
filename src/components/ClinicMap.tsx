import type { SceneConsultation } from './DoctorSceneDialogue';
import { MapPin } from 'lucide-react';
import { assets } from '../data/assets';
import { AssetImage } from './AssetImage';
import { Character } from './Character';
import { ClinicExplorer } from './ClinicExplorer';
import type { ClinicProgress } from '../engine/clinic';
import { lazy, Suspense } from 'react';
const Clinic3DExplorer = lazy(() => import('./Clinic3DExplorer'));
export function ClinicMap({
  interactive = false,
  onEnter,
  onProgress,
  consultation,
}: {
  interactive?: boolean;
  consultation?: SceneConsultation;
  onEnter?: () => void;
  onProgress?: (progress: ClinicProgress) => void;
}) {
  if (interactive)
    return (
      <Suspense
        fallback={
          <div className="three-loading-shell" role="status">
            正在準備3D診所…
          </div>
        }
      >
        <Clinic3DExplorer onEnter={onEnter} onProgress={onProgress} consultation={consultation} />
      </Suspense>
    );
  return (
    <div className={`clinic-map ${interactive ? 'interactive' : ''}`} data-testid="clinic-map">
      <div className="map-grid" />
      <AssetImage
        src={assets.clinic}
        alt="2.5D生達診所：藥局有藥師、掛號櫃台有掛號人員，另有入口與醫師診間"
        className="clinic-art"
      />
      <span className="map-location">
        <span className="live-dot" /> 生達診所 <small>SHENG-DA CLINIC</small>
      </span>
      <span className="room-label reception-label">
        01 <b>藥局</b>
      </span>
      <span className="room-label waiting-label">
        02 <b>掛號櫃台</b>
      </span>
      <span className="room-hotspot static">
        <MapPin size={16} />
        醫師診間
      </span>
      <div className="map-player start" data-testid="map-player">
        <Character role="representative" />
        <span className="player-tag">你</span>
      </div>
      <span className="entry-label">診所入口</span>
      <span className="map-compass" aria-hidden="true">
        N <span>◇</span>
      </span>
    </div>
  );
}
