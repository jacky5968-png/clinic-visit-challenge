import type { LocationId } from '../engine/clinic';
import type { VisitMission } from './visitMissions';
import { stageStaffConversation } from './stageConversations';
export function staffSmallTalk(location: LocationId, round: number, mission?: VisitMission) {
  const pharmacy = [
    ['早安！今天有什麼事？', '早安，我來拜訪醫師，也和您打聲招呼。'],
    ['好久不見，怎麼那麼久沒來？', '最近行程比較滿，今天特地過來向您問好。'],
    ['哈囉，今天帶了什麼產品來？', '我帶了今天要介紹的產品資料，等一下和醫師交流。'],
  ];
  const registration = [
    ['早安，今天有什麼事？', '早安，我是來拜訪醫師的外勤，麻煩您協助報到。'],
    ['好久不見，今天來找哪位醫師？', '今天來拜訪醫師，先過來和您打聲招呼。'],
    ['怎麼那麼久沒來？最近忙嗎？', '最近行程比較滿，今天終於有空過來，辛苦您了。'],
  ];
  const lines = (mission && stageStaffConversation(mission,location)?.lines) || (location === 'reception' ? pharmacy : registration);
  const index = ((Math.floor(round) % lines.length) + lines.length) % lines.length;
  return { greeting: lines[index][0], reply: lines[index][1] };
}
