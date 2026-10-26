import { describe, expect, it } from 'vitest';
import { sevenStages } from '../src/data/sevenStages';
import { mainTarget, sceneLocations } from '../src/data/sceneLocations';
import { stageConversation, stageStaffConversation } from '../src/data/stageConversations';
import { staffSmallTalk } from '../src/data/staffSmallTalk';
import { doctorConversation } from '../src/data/doctorConversation';

describe('stage-specific roles and conversations', () => {
  it('welcomes new staff with the planning specialist instead of a pharmacist', () => {
    const stage = sevenStages[0];
    const locations = sceneLocations(stage);
    expect(locations.reception.speaker).toBe('企劃專員');
    expect(locations.waiting.speaker).toBe('報到專員');
    expect(staffSmallTalk('reception', 0, stage).greeting).toContain('歡迎加入生達製藥');
    expect(staffSmallTalk('reception', 1, stage).greeting).toContain('期待您成為頂尖的外勤');
    for (const location of ['reception', 'waiting'] as const) {
      for (let round = 0; round < 3; round++) {
        const talk = staffSmallTalk(location, round, stage);
        expect(talk.greeting + talk.reply).not.toMatch(/醫師|診間|好久不見|那麼久沒來/);
      }
    }
  });

  for (const stage of sevenStages) {
    it(stage.clinic + ' keeps roles, replies and three-line challenge handoff consistent', () => {
      const locations = sceneLocations(stage);
      const target = mainTarget(stage);
      expect(locations[target].speaker).toBe(stage.doctor.name);
      for (const location of ['reception', 'waiting'] as const) {
        if (location === target) continue;
        const staff = stageStaffConversation(stage, location)!;
        expect(staff).toBeDefined();
        expect(locations[location].speaker).toBe(staff.name);
        expect(locations[location].message).toBe(staff.reminder);
        const talks = [0, 1, 2].map(round => staffSmallTalk(location, round, stage));
        expect(new Set(talks.map(talk => talk.greeting)).size).toBe(3);
        expect(new Set(talks.map(talk => talk.reply)).size).toBe(3);
        expect(talks.every(talk => talk.greeting && talk.reply)).toBe(true);
        expect(staffSmallTalk(location, 3, stage)).toEqual(talks[0]);
        expect(staffSmallTalk(location, -1, stage)).toEqual(talks[2]);
      }
      const lines = doctorConversation(stage);
      expect(lines).toHaveLength(3);
      expect(lines.map(line => line.representative)).toEqual([false, true, false]);
      expect(lines[0].text).toBe(stage.doctor.greeting);
      expect(lines[1].text).toBe(stageConversation(stage.id)!.reply);
      expect(lines[2].text).toBe(stage.doctor.invitation);
      expect(lines[2].text).toContain('10');
    });
  }

  it('uses distinct primary dialogue for all eight stages and names the correct specialty', () => {
    for (let line = 0; line < 3; line++) {
      expect(new Set(sevenStages.map(stage => doctorConversation(stage)[line].text)).size).toBe(8);
    }
    const topics = ['新人', '商品名', '呼吸系統', '自費', '胃腸', '肌肉骨骼', '慢性病用藥-1', '慢性病用藥-2'];
    sevenStages.forEach((stage, index) => expect(stage.doctor.greeting).toContain(topics[index]));
    expect(sceneLocations(sevenStages[3]).doctor.speaker).toBe('謝藥師');
    expect(sceneLocations(sevenStages[3]).reception.speaker).toBe('藥助');
    expect(sceneLocations(sevenStages[3]).waiting.speaker).toBe('採購助理');
    expect(staffSmallTalk('waiting', 0, sevenStages[3]).greeting).toContain('謝藥師');
  });
});
