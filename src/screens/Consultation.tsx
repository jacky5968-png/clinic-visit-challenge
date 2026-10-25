import {challengeLabel} from '../data/sevenStages';
import { doctorConversation } from '../data/doctorConversation';
import { useState } from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import type { Product } from '../types';
import { assets } from '../data/assets';
import { AssetImage } from '../components/AssetImage';
import { Character } from '../components/Character';
import { useVisitMission } from '../context/VisitContext';
export function Consultation({
  product,
  onChallenge,
  onReturn,
}: {
  product: Product;
  onChallenge: () => void;
  onReturn?: () => void;
}) {
  const [line, setLine] = useState(0);
  const mission = useVisitMission();
  const lines = doctorConversation(mission);
  return (
    <section className="content-screen consultation-screen">
      <div className="section-heading compact">
        <span className="eyebrow">A PROFESSIONAL CONVERSATION</span>
        <h1>與{mission.doctor.name}交流。</h1>
        <p>
          {mission.clinic} / {mission.doctor.name}的診間
        </p>
      </div>
      <div className="consultation-layout">
        <div className="consultation-scene">
          <AssetImage
            src={assets.consultation}
            alt="現代診間與醫師辦公桌"
            className="consultation-art"
          />
          <Character role="doctor" className="consultation-doctor" />
          <img
            src={assets.consultationDesk}
            alt=""
            aria-hidden="true"
            className="consultation-desk"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <Character role="representative" className="consultation-rep" />
          <span className="scene-room-tag">CONSULTATION ROOM 01</span>
        </div>
        <div className="dialogue-panel">
          <div className="doctor-profile">
            <span className="profile-avatar">
              <span
                className="doctor-monogram"
                style={{ background: mission.theme.soft, color: mission.theme.accent }}
              >
                {mission.doctor.initial}
              </span>
            </span>
            <div>
              <b>{mission.doctor.name}</b>
              <small>
                {mission.clinic} · {mission.doctor.specialty}（虛構情境）
              </small>
            </div>
            <span className="live-dot" />
          </div>
          <div className="dialogue" key={line} aria-live="polite">
            <span className="eyebrow">
              <MessageCircle size={15} />
              {lines[line].speaker}
            </span>
            <p>「{lines[line].text}」</p>
          </div>
          <div className="dialogue-product">
            <AssetImage src={product.image} alt={`${product.name}產品圖片`} />
            <div>
              <small>本次挑戰題庫</small>
              <h3>{product.name}</h3>
              {mission.kind!=='training'&&<p>{product.ingredient}</p>}
              {product.imageCaption && (
                <small className="photo-caption">{product.imageCaption}</small>
              )}
            </div>
          </div>
          <div className="dialogue-dots" aria-label={`第${line + 1}段，共3段對話`}>
            {lines.map((_, i) => (
              <i key={i} className={i === line ? 'active' : ''} />
            ))}
          </div>
          {line < 2 ? (
            <button className="button primary full" onClick={() => setLine((l) => l + 1)}>
              繼續對話
              <ArrowRight size={18} />
            </button>
          ) : (
            <button className="button primary full" onClick={onChallenge}>
              {challengeLabel(mission)}
              <ArrowRight size={18} />
            </button>
          )}
          {onReturn && <button className="text-button" onClick={onReturn}>返回診所探索</button>}
          <p className="dialogue-note">10 道問題 · 每題 10 分 · 全對才算本項合格</p>
        </div>
      </div>
    </section>
  );
}
