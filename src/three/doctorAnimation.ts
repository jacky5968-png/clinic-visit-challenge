import type { LocationId } from '../engine/clinic';
import type { WorldPoint } from '../engine/clinic3d';
import type { PersonRig } from './person';
import { shortestAngle } from './staffAnimation';

interface DoctorMotionInput {
  now: number;
  dt: number;
  actor: WorldPoint;
  nearby: LocationId | null;
  talking: boolean;
  listening: boolean;
  sequence: number;
  reduced: boolean;
}
export function doctorGesture(age: number, listening: boolean, greeting = false) {
  const duration = greeting ? .9 : 1.4;
  if (age < 0 || age >= duration) return { nod: 0, lean: 0, hand: 0, active: false };
  const t = age / duration, envelope = Math.sin(Math.PI * t);
  const nod = (greeting ? .065 : listening ? .10 : .13) * envelope *
    Math.sin(Math.PI * (greeting ? 1 : 2) * t) ** 2;
  return {
    nod,
    lean: greeting ? 0 : envelope * (listening ? .012 : .025),
    hand: greeting || listening ? 0 : envelope * .065,
    active: true,
  };
}
export function createDoctorAnimator(rig: PersonRig) {
  const rest = {
    bodyYaw: rig.body.rotation.y, headYaw: rig.head.rotation.y,
    headPitch: rig.head.rotation.x, bodyPitch: rig.body.rotation.x,
    handPitch: rig.rightArm.rotation.x,
  };
  let wasAttending = false, wasTalking = false, lastSequence = -1;
  let entered = -Infinity, spoken = -Infinity;
  const smooth = (current: number, target: number, rate: number, dt: number, reduced: boolean) => {
    const delta = shortestAngle(current, target);
    if (reduced || Math.abs(delta) < .001) return target;
    const next = current + delta * (1 - Math.exp(-rate * Math.max(0, Math.min(.1, dt))));
    return Math.abs(shortestAngle(next, target)) < .001 ? target : next;
  };
  return function update(input: DoctorMotionInput) {
    const { now, dt, actor, nearby, talking, listening, sequence, reduced } = input;
    const attending = nearby === 'doctor' || talking;
    if (attending && !wasAttending) entered = now;
    if (talking && (!wasTalking || sequence !== lastSequence)) spoken = now;
    const targetYaw = attending
      ? Math.atan2(actor.x - rig.root.position.x, actor.z - rig.root.position.z)
      : rig.root.rotation.y + rest.bodyYaw + rest.headYaw;
    const local = shortestAngle(rig.root.rotation.y + rest.bodyYaw + rest.headYaw, targetYaw);
    // A seated doctor turns the torso and head while the seat and legs stay fixed.
    const torso = Math.max(-.45, Math.min(.45, local * .65));
    const head = Math.max(-.65, Math.min(.65, local - torso));
    const targets = { body: rest.bodyYaw + torso, head: rest.headYaw + head };
    const age = talking ? now - spoken : now - entered;
    const pose = attending && !reduced
      ? doctorGesture(age, listening, !talking)
      : { nod: 0, lean: 0, hand: 0, active: false };
    rig.body.rotation.y = smooth(rig.body.rotation.y, targets.body, 7, dt, reduced);
    rig.head.rotation.y = smooth(rig.head.rotation.y, targets.head, 9, dt, reduced);
    rig.head.rotation.x = smooth(rig.head.rotation.x, rest.headPitch + pose.nod, 14, dt, reduced);
    rig.body.rotation.x = smooth(rig.body.rotation.x, rest.bodyPitch + pose.lean, 12, dt, reduced);
    rig.rightArm.rotation.x = smooth(rig.rightArm.rotation.x, rest.handPitch - pose.hand, 12, dt, reduced);
    const settling = [
      shortestAngle(rig.body.rotation.y, targets.body), shortestAngle(rig.head.rotation.y, targets.head),
      rig.head.rotation.x - rest.headPitch - pose.nod,
      rig.body.rotation.x - rest.bodyPitch - pose.lean,
      rig.rightArm.rotation.x - rest.handPitch + pose.hand,
    ].some(delta => Math.abs(delta) >= .001);
    wasAttending = attending; wasTalking = talking; lastSequence = sequence;
    return {
      active: !reduced && (pose.active || settling), attending, talking, listening: talking && listening,
      sequence, gestureAge: Number.isFinite(age) ? age : null, targetYaw,
      yaw: rig.root.rotation.y + rig.body.rotation.y + rig.head.rotation.y,
      bodyYaw: rig.body.rotation.y, headYaw: rig.head.rotation.y,
      nod: rig.head.rotation.x - rest.headPitch,
      lean: rig.body.rotation.x - rest.bodyPitch,
      hand: rest.handPitch - rig.rightArm.rotation.x,
      rootYaw: rig.root.rotation.y,
      position: { x: rig.root.position.x, y: rig.root.position.y, z: rig.root.position.z },
      legs: [rig.leftLeg.rotation.x, rig.rightLeg.rotation.x, rig.leftKnee.rotation.x, rig.rightKnee.rotation.x],
    };
  };
}
