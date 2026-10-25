import { describe, expect, it } from 'vitest';
import { sevenStages } from '../src/data/sevenStages';
import { examinerAppearance, examinerRole } from '../src/data/characterRoles';
import { buildAssessmentScene } from '../src/three/buildAssessmentScene';

describe('professional roles in the two-person assessment', () => {
  it('uses a suited field supervisor for new staff and preserves the original category', () => {
    expect(sevenStages[0].doctor.name).toBe('外勤主管');
    expect(sevenStages[0].allowedCategories).toEqual(['新人必修']);
    expect(sevenStages[0].target).toBe('doctor');
  });
  for (const stage of sevenStages) it(stage.clinic + ' has the right examiner outfit and a separate seated representative', () => {
    const before = JSON.stringify(stage);
    const model = buildAssessmentScene(stage);
    const role = examinerRole(stage);
    expect(model.root.userData.stage).toBe(stage.id);
    expect(model.examiner.root.userData.outfit).toBe(role);
    expect(model.representative.root.userData.outfit).toBe('representative');
    expect(model.examiner.root).not.toBe(model.representative.root);
    expect(model.examiner.root.position.distanceTo(model.representative.root.position)).toBeGreaterThan(2);
    expect(model.root.getObjectByName('assessment-desk')).toBeDefined();
    if (role === 'supervisor') {
      expect(model.examiner.root.getObjectByName('professional-tie')).toBeDefined();
      expect(model.examiner.root.getObjectByName('suit-lapel')).toBeDefined();
      expect(model.examiner.root.getObjectByName('stethoscope')).toBeUndefined();
    } else if (role === 'pharmacist') {
      expect(model.examiner.root.getObjectByName('pharmacy-collar')).toBeDefined();
      expect(model.examiner.root.getObjectByName('pharmacy-badge')).toBeDefined();
      expect(model.examiner.root.getObjectByName('stethoscope')).toBeUndefined();
    } else {
      expect(model.examiner.root.getObjectByName('stethoscope')).toBeDefined();
    }
    expect(JSON.stringify(stage)).toBe(before);
  });
  it('distinguishes the two training supervisors without changing stage data', () => {
    expect(examinerAppearance(sevenStages[0]).coat).not.toBe(examinerAppearance(sevenStages[1]).coat);
    expect(examinerAppearance(sevenStages[0]).tie).not.toBe(examinerAppearance(sevenStages[1]).tie);
  });
});
