import type { LocationId } from '../engine/clinic';
import type { WorldPoint } from '../engine/clinic3d';
import type { PersonRig } from './person';

export function shortestAngle(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function staffGestureFrame(welcomeAge: number | null, talkAge: number | null, reduced: boolean) {
  if (reduced) return { wave: 0, nod: 0, hand: 0, active: false };
  const welcome = welcomeAge ?? -1, talk = talkAge ?? -1;
  const waving = welcome >= 0 && welcome < 1.8;
  const talking = talk >= 0 && talk < 1.6;
  const w = waving ? Math.sin(Math.PI * welcome / 1.8) : 0;
  const n = talking ? Math.sin(Math.PI * talk / 1.6) : 0;
  return {
    wave: w * (1.9 + Math.sin(welcome * 14) * .25),
    nod: n * Math.sin(talk * 9) * .14,
    hand: n * .15,
    active: waving || talking,
  };
}

interface StaffFrameInput {
  now: number;
  dt: number;
  actor: WorldPoint;
  nearby: LocationId | null;
  conversation: LocationId | null;
  sequence: number;
  reduced: boolean;
}

export function createStaffAnimator(staff: { id: string; location: LocationId; rig: PersonRig }[]) {
  const states = staff.map(s => ({
    ...s, restYaw: s.rig.root.rotation.y, close: false, entered: -Infinity,
    talkStarted: -Infinity, lastConversation: null as LocationId | null, lastSequence: -1,
  }));

  return function update({ now, dt, actor, nearby, conversation, sequence, reduced }: StaffFrameInput) {
    let active = false;
    const frames = states.map(s => {
      const close = nearby === s.location;
      // Welcome once on approach; each new dialogue turn gets a brief nod.
      if (close && !s.close) s.entered = now;
      const speaking = close && conversation === s.location;
      if (speaking && (s.lastConversation !== conversation || s.lastSequence !== sequence)) s.talkStarted = now;
      s.lastConversation = speaking ? conversation : null;
      s.lastSequence = sequence;
      s.close = close;
      const target = close
        ? Math.atan2(actor.x - s.rig.root.position.x, actor.z - s.rig.root.position.z)
        : s.restYaw;
      const delta = shortestAngle(s.rig.root.rotation.y, target);
      s.rig.root.rotation.y += reduced ? delta : delta * (1 - Math.exp(-8 * Math.max(0, dt)));
      const pose = staffGestureFrame(close ? now - s.entered : null, speaking ? now - s.talkStarted : null, reduced);
      s.rig.rightArm.rotation.z = pose.wave + pose.hand;
      s.rig.rightArm.rotation.x = -pose.wave * .12;
      s.rig.leftArm.rotation.x = -pose.hand;
      s.rig.head.rotation.x = pose.nod;
      const turning = !reduced && Math.abs(shortestAngle(s.rig.root.rotation.y, target)) > .002;
      active ||= pose.active || turning;
      return {
        id: s.id, nearby: close, speaking, yaw: s.rig.root.rotation.y, targetYaw: target,
        wave: s.rig.rightArm.rotation.z, nod: s.rig.head.rotation.x,
      };
    });
    return { active, frames };
  };
}
