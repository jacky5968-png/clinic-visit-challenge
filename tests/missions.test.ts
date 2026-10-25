import { describe, it, expect } from 'vitest';
import {
  defaultMission,
  getMission,
  missingRequirements,
  visitDialogue,
  visitMissions,
} from '../src/data/visitMissions';
import {
  completedMissions,
  missionProductKey,
  nextMission,
  parseMissionProgress,
  recordMissionCompletion,
  type MissionCompletion,
} from '../src/engine/missionProgress';
import products from '../src/data/products.json';
import questions from '../src/data/questions.json';
import type { Question } from '../src/types';

const product = products[0],
  bank = questions as Question[];
const key = missionProductKey(product, bank);
const completion: MissionCompletion = {
  missionId: 'cheng-xin',
  productKey: key,
  productName: product.name,
  completedAt: 1700000000000,
};
describe('V5診所任務與本機完成記錄', () => {
  it('三間診所、醫師與視覺主題各自獨立，未知任務安全回到預設', () => {
    expect(new Set(visitMissions.map((m) => m.id)).size).toBe(3);
    expect(new Set(visitMissions.map((m) => m.clinic)).size).toBe(3);
    expect(new Set(visitMissions.map((m) => m.doctor.name)).size).toBe(3);
    expect(new Set(visitMissions.map((m) => m.theme.furniture)).size).toBe(3);
    expect(getMission('bad')).toBe(defaultMission);
  });
  it('澄心可直接拜訪，晴川必須櫃檯報到，向陽必須確認候診區', () => {
    expect(missingRequirements(defaultMission, [])).toEqual([]);
    expect(missingRequirements(getMission('qing-chuan'), ['doctor', 'waiting'])).toEqual([
      'reception',
    ]);
    expect(missingRequirements(getMission('qing-chuan'), ['reception'])).toEqual([]);
    expect(missingRequirements(getMission('xiang-yang'), ['reception'])).toEqual(['waiting']);
    expect(missingRequirements(getMission('xiang-yang'), ['waiting'])).toEqual([]);
    expect(visitDialogue(getMission('qing-chuan'), 'reception').message).toContain('林醫師');
  });
  it('產品ID與題庫列順序改變不遺失標記，題目內容改變則重新計算', () => {
    const changedId = { ...product, id: 'csv-999' };
    const reordered = bank
      .slice()
      .reverse()
      .map((q) => ({ ...q, id: `other-${q.id}`, productId: changedId.id }));
    expect(missionProductKey(changedId, reordered)).toBe(key);
    expect(
      missionProductKey(
        product,
        bank.map((q, i) => (i === 0 ? { ...q, prompt: `${q.prompt}更新` } : q)),
      ),
    ).not.toBe(key);
    expect(
      missionProductKey(
        product,
        bank.map((q, i) => (i === 0 ? { ...q, correctIndex: (q.correctIndex + 1) % 4 } : q)),
      ),
    ).not.toBe(key);
    expect(missionProductKey({ ...product, name: `${product.name}另一規格` }, bank)).not.toBe(key);
  });
  it('題庫來源中其他產品更新不影響當前產品；示範產品與同名正式產品分開', () => {
    expect(
      missionProductKey(product, [...bank, { ...bank[0], productId: 'other', prompt: '別的產品' }]),
    ).toBe(key);
    expect(missionProductKey({ ...product, demo: !product.demo }, bank)).not.toBe(key);
  });
  it('完成標記按產品及診所分開，重複完成不重複計數或改寫原日期', () => {
    const one = recordMissionCompletion([], completion);
    expect(recordMissionCompletion(one, { ...completion, completedAt: 1800000000000 })).toBe(one);
    const two = recordMissionCompletion(one, { ...completion, missionId: 'qing-chuan' });
    expect(completedMissions(two, key)).toEqual(['cheng-xin', 'qing-chuan']);
    expect(completedMissions(two, 'different')).toEqual([]);
    expect(two[0].completedAt).toBe(completion.completedAt);
  });
  it('下一間選擇尚未完成的診所，全部完成後不建立第四間', () => {
    expect(nextMission([], key, 'cheng-xin')?.id).toBe('qing-chuan');
    const progress = [completion, { ...completion, missionId: 'xiang-yang' as const }];
    expect(nextMission(progress, key, 'xiang-yang')?.id).toBe('qing-chuan');
    expect(
      nextMission([...progress, { ...completion, missionId: 'qing-chuan' }], key, 'qing-chuan'),
    ).toBeUndefined();
  });
  it('損壞或未知版本的本機資料可安全恢復，錯誤紀錄不混入進度', () => {
    for (const raw of [
      null,
      'bad',
      'null',
      '{}',
      '{"version":2,"completed":[]}',
      'x'.repeat(500001),
    ])
      expect(parseMissionProgress(raw)).toEqual([]);
    const rows = [
      completion,
      completion,
      null,
      { ...completion, missionId: 'fake' },
      { ...completion, completedAt: 'bad' },
    ];
    expect(parseMissionProgress(JSON.stringify({ version: 1, completed: rows }))).toEqual([
      completion,
    ]);
  });
  it('本機紀錄只保留任務、產品與日期，不帶入作答或分數，並限制保存筆數', () => {
    const extra = { ...completion, answers: ['secret'], score: 100 };
    const parsed = parseMissionProgress(JSON.stringify({ version: 1, completed: [extra] }));
    expect(Object.keys(parsed[0]).sort()).toEqual([
      'completedAt',
      'missionId',
      'productKey',
      'productName',
    ]);
    const rows = Array.from({ length: 1001 }, (_, i) => ({ ...completion, productKey: String(i) }));
    expect(parseMissionProgress(JSON.stringify({ version: 1, completed: rows }))).toHaveLength(
      1000,
    );
  });
});
