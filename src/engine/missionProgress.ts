import type { Product, Question } from '../types';
import { visitMissions, type MissionId } from '../data/visitMissions';
export const MISSION_STORAGE_KEY = 'field-training-v5-missions';
export interface MissionCompletion {
  missionId: MissionId;
  productKey: string;
  productName: string;
  completedAt: number;
}
export type MissionProgress = MissionCompletion[];
// IDs in the CSV depend on row order. Identify the exact product and question content instead.
export function missionProductKey(product: Product, bank: Question[]): string {
  const rows = bank
    .filter((q) => q.productId === product.id)
    .map((q) => JSON.stringify([q.prompt, q.options, q.correctIndex]))
    .sort();
  const text = JSON.stringify([product.demo, product.name, rows]);
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++)
    hash = BigInt.asUintN(64, (hash ^ BigInt(text.charCodeAt(i))) * 0x100000001b3n);
  return `${product.demo ? 'demo' : 'product'}:${product.name}:${hash.toString(16)}`;
}
export function parseMissionProgress(raw: string | null): MissionProgress {
  if (!raw || raw.length > 500000) return [];
  try {
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.completed)) return [];
    const seen = new Set<string>();
    return data.completed
      .filter((item: unknown): item is MissionCompletion => {
        if (!item || typeof item !== 'object') return false;
        const r = item as MissionCompletion;
        if (
          !visitMissions.some((m) => m.id === r.missionId) ||
          typeof r.productKey !== 'string' ||
          r.productKey.length > 2000 ||
          typeof r.productName !== 'string' ||
          !r.productName.trim() ||
          r.productName.length > 500 ||
          !Number.isFinite(r.completedAt) ||
          r.completedAt < 0 ||
          r.completedAt > Date.now() + 86400000
        )
          return false;
        const key = JSON.stringify([r.missionId, r.productKey]);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(-1000)
      .map((r: MissionCompletion) => ({
        missionId: r.missionId,
        productKey: r.productKey,
        productName: r.productName,
        completedAt: r.completedAt,
      }));
  } catch {
    return [];
  }
}
export function completedMissions(progress: MissionProgress, productKey: string): MissionId[] {
  return visitMissions
    .filter((m) => progress.some((r) => r.missionId === m.id && r.productKey === productKey))
    .map((m) => m.id);
}
export function recordMissionCompletion(
  progress: MissionProgress,
  record: MissionCompletion,
): MissionProgress {
  if (progress.some((r) => r.missionId === record.missionId && r.productKey === record.productKey))
    return progress;
  return [...progress, record].slice(-1000);
}
export function nextMission(progress: MissionProgress, productKey: string, currentId: MissionId) {
  const start = visitMissions.findIndex((m) => m.id === currentId);
  return [...visitMissions.slice(start + 1), ...visitMissions.slice(0, start)].find(
    (m) => !progress.some((r) => r.missionId === m.id && r.productKey === productKey),
  );
}
