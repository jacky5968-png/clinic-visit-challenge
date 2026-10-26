import type {StageId} from './sevenStages';
export const ISLAND_SCENE_SCALE=1.25;
export const islandThemes:Record<StageId,{color:number;label:string;feature:string}>={
 'new-training':{color:0xe9780c,label:'啟程學院',feature:'新訓教室・教學白板・課桌椅'},
 'product-names':{color:0x1764df,label:'產品學苑',feature:'產品教材架・教學螢幕・展示教室'},
 ent:{color:0x008bbd,label:'呼吸之島',feature:'耳鼻喉科診療椅・檢查燈'},
 'pharmacy-client':{color:0x00995f,label:'綠意藥局',feature:'綠色藥局門市・藥品陳列架'},
 gastro:{color:0xe25b27,label:'暖陽診所',feature:'胃腸科檢查床・檢查設備'},
 orthopedics:{color:0x7842d5,label:'復健之島',feature:'骨架模型・骨骼燈箱・拐杖架'},
 'internal-medicine':{color:0xcc4585,label:'循環之島',feature:'內科診療室・循環監測站'},
 family:{color:0x009888,label:'健康之家',feature:'健康量測站・家庭醫學診所'}
};
export function islandPositions(portrait:boolean):[number,number][]{
 return portrait?[[-5.2,33],[5.2,33],[5.2,11],[-5.2,11],[-5.2,-11],[5.2,-11],[5.2,-33],[-5.2,-33]]
 :[[-18,11],[-6,11],[6,11],[18,11],[18,-11],[6,-11],[-6,-11],[-18,-11]];
}
