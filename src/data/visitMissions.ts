import { locations, type LocationId } from '../engine/clinic';
export type MissionId = 'cheng-xin' | 'qing-chuan' | 'xiang-yang' | 'new-training' | 'product-names' | 'ent' | 'pharmacy-client' | 'gastro' | 'orthopedics' | 'family';
export interface VisitMission {
  stageNumber?:number; kind?:'training'|'clinic'|'pharmacy'; allowedCategories?:string[]; target?:'doctor'|'reception';
  id: MissionId;
  clinic: string;
  english: string;
  title: string;
  brief: string;
  doctor: {
    name: string;
    specialty: string;
    initial: string;
    greeting: string;
    invitation: string;
    hair: number;
    coat: number;
    glasses: boolean;
    stethoscope?:boolean;
  };
  required: ('reception' | 'waiting')[];
  theme: {
    accent: string;
    soft: string;
    wall: number;
    floor: number;
    furniture: number;
    wood: number;
    chairs: number;
  };
}
export const visitMissions: VisitMission[] = [
  {
    id: 'cheng-xin',
    clinic: '生達診所',
    english: 'SHENG-DA CLINIC',
    title: '初次拜訪・專業介紹',
    brief: '帶著選定產品拜訪陳醫師，完成10題挑戰。藥局與掛號櫃台可自由探索。',
    doctor: {
      name: '陳醫師',
      specialty: '家庭醫學科',
      initial: '陳',
      greeting: '你好，今天想介紹什麼產品？',
      invitation: '好的，我想先了解幾個問題。',
      hair: 0x727c75,
      coat: 0xf3f4e9,
      glasses: true,
    },
    required: [],
    theme: {
      accent: '#006b56',
      soft: '#e8fff6',
      wall: 0xa2d7ca,
      floor: 0xf2f5f4,
      furniture: 0x0c9f8c,
      wood: 0xc6b38d,
      chairs: 0x4cbf82,
    },
  },
  {
    id: 'qing-chuan',
    clinic: '晴川診所',
    english: 'QING-CHUAN CLINIC',
    title: '產品準備・藥局確認',
    brief: '先到藥局確認拜訪資料，再與林醫師介紹選定產品，完成10題挑戰。',
    doctor: {
      name: '林醫師',
      specialty: '內科',
      initial: '林',
      greeting: '您好，今天帶來哪項產品？',
      invitation: '產品準備已確認，讓我們用五個問題確認您的準備。',
      hair: 0x303d50,
      coat: 0xe6eff7,
      glasses: false,
    },
    required: ['reception'],
    theme: {
      accent: '#1856b4',
      soft: '#edf5ff',
      wall: 0xa9cdec,
      floor: 0xf0f5fa,
      furniture: 0x2877ce,
      wood: 0xb9b6aa,
      chairs: 0x4fa3ea,
    },
  },
  {
    id: 'xiang-yang',
    clinic: '向陽診所',
    english: 'XIANG-YANG CLINIC',
    title: '預約拜訪・掛號報到',
    brief: '先到掛號櫃台完成報到，再與王醫師交流選定產品，完成10題挑戰。',
    doctor: {
      name: '王醫師',
      specialty: '一般科',
      initial: '王',
      greeting: '歡迎，今天想和我討論哪項產品？',
      invitation: '拜訪準備完成了，接下來請回答這10道題目。',
      hair: 0x755648,
      coat: 0xfff1df,
      glasses: true,
    },
    required: ['waiting'],
    theme: {
      accent: '#944500',
      soft: '#fff4e3',
      wall: 0xf1c5a3,
      floor: 0xfff3df,
      furniture: 0xee8d32,
      wood: 0xc79c72,
      chairs: 0xf4b144,
    },
  },
];
export const defaultMission = visitMissions[0];
export function getMission(id: string): VisitMission {
  return visitMissions.find((m) => m.id === id) ?? defaultMission;
}
export function missingRequirements(mission: VisitMission, visited: LocationId[]) {
  return mission.required.filter((id) => !visited.includes(id));
}
export function visitDialogue(mission: VisitMission, id: LocationId) {
  if (mission.id === defaultMission.id) return locations[id];
  if (id === 'reception')
    return {
      ...locations[id],
      speaker: '藥師',
      message: `您好，歡迎來到${mission.clinic}。我是這裡的藥師，產品資料已確認，請沿走道前往${mission.doctor.name}的診間。`,
    };
  if (id === 'waiting')
    return {
      ...locations[id],
      message: `您好，歡迎來到${mission.clinic}。掛號報到已完成，${mission.doctor.name}已知道您的來意，請沿走道前往診間。`,
    };
  if (id === 'entrance') return { ...locations[id], message: mission.brief };
  return {
    ...locations[id],
    message: `已抵達${mission.doctor.name}的診間，完成拜訪準備後即可展開產品介紹與10題挑戰。`,
  };
}
