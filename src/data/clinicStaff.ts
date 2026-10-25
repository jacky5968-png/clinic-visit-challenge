import type { LocationId } from '../engine/clinic';
export interface ClinicStaffProfile {
  id: 'pharmacist' | 'registration';
  location: LocationId;
  name: string;
  x: number;
  z: number;
  appearance: { hair: number; coat: number; glasses: boolean; stethoscope: boolean; badge: number };
}
export const clinicStaff: ClinicStaffProfile[] = [
  { id:'pharmacist', location:'reception', name:'藥師', x:-2.3, z:-2,
    appearance:{hair:0x574538,coat:0xf8fff8,glasses:true,stethoscope:false,badge:0x00866a} },
  { id:'registration', location:'waiting', name:'掛號人員', x:4.25, z:0.48,
    appearance:{hair:0x303643,coat:0x2877ce,glasses:false,stethoscope:false,badge:0xffd16a} },
];
export const staffFootprints = clinicStaff.map(s => ({
  name:s.name, minX:s.x-0.4, maxX:s.x+0.4, minZ:s.z-0.4, maxZ:s.z+0.4
}));
