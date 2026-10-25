import { assets } from '../data/assets';
import { AssetImage } from './AssetImage';
import { RepresentativeSprite } from './RepresentativeSprite';
import { useVisitMission } from '../context/VisitContext';
import { ProfessionalPortrait } from './ProfessionalPortrait';
export function Character({
  role,
  walking = false,
  className = '',
  articulated = false,
}: {
  role: 'doctor' | 'representative';
  walking?: boolean;
  className?: string;
  articulated?: boolean;
}) {
  const mission = useVisitMission();
  return (
    <div
      className={`character ${role} ${role === 'doctor' ? `visit-doctor-${mission.id}` : ''} ${walking ? 'walking' : ''} ${className}`}
      aria-label={role === 'doctor' ? mission.doctor.name : '外勤代表'}
    >
      {role === 'representative' && articulated ? (
        <RepresentativeSprite />
      ) : role === 'doctor' && (mission.kind==='training'||mission.kind==='pharmacy') ? (
        <ProfessionalPortrait/>
      ) : (
        <AssetImage src={assets[role]} alt={role === 'doctor' ? '醫師人物' : '外勤人物'} />
      )}
      <span className="character-shadow" />
    </div>
  );
}
