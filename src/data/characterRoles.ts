import type { VisitMission } from './visitMissions';
export type ProfessionalRole = 'supervisor' | 'doctor' | 'pharmacist' | 'staff' | 'representative';
export function examinerRole(mission: VisitMission): ProfessionalRole {
  return mission.kind === 'training' ? 'supervisor' : mission.kind === 'pharmacy' ? 'pharmacist' : 'doctor';
}
export function examinerAppearance(mission: VisitMission) {
  const outfit = examinerRole(mission);
  return {
    ...mission.doctor, outfit,
    coat: outfit === 'supervisor' ? (mission.stageNumber === 1 ? 0x223c59 : 0x354566) : outfit === 'pharmacist' ? 0xf4fff9 : mission.doctor.coat,
    tie: mission.stageNumber === 1 ? 0xc78b43 : 0x278f98,
    badge: outfit === 'supervisor' ? 0xd5ae68 : outfit === 'pharmacist' ? 0x0b9e7c : 0x4c8ca4,
    stethoscope: outfit === 'doctor',
  };
}
export function roleLabel(role: ProfessionalRole) {
  return {supervisor:'外勤主管',doctor:'醫師',pharmacist:'藥師',staff:'行政專員',representative:'外勤代表'}[role];
}
