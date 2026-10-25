import type { VisitMission } from './visitMissions';
import { stageConversation } from './stageConversations';
export function doctorConversation(mission: VisitMission) {
  return [
    { speaker: mission.doctor.name, text: mission.doctor.greeting, representative: false },
    { speaker: '外勤代表 · 你', text: stageConversation(mission.id)?.reply??(mission.kind==='training'?'教官您好，我已準備好本次主題的考驗。':mission.kind==='pharmacy'?'藥師您好，今天想向您介紹這項自費品項。':'醫師您好，今天想向您介紹這項產品。'), representative: true },
    { speaker: mission.doctor.name, text: mission.doctor.invitation, representative: false },
  ];
}
