// ─── Skeletal rig: bone hierarchy, poses, forward kinematics ────────────────
//
// Characters are rigged as a 13-joint humanoid skeleton. A Pose stores joint
// angles (radians, relative to the parent bone) plus a root height factor.
// computeJoints() runs forward kinematics in character-local space:
// origin = ground point under the hips, +x = facing direction, +y = up.

import { Proportions, Vec2 } from '../data/types';

export interface Pose {
  rootY: number; // hip height as a fraction of leg length (1 = standing tall)
  lean: number; // whole body lean (radians, + = forward)
  torso: number; // spine bend relative to lean
  head: number; // head tilt relative to torso
  shoulderL: number; // arm angles: 0 = hanging straight down, + = forward
  elbowL: number;
  shoulderR: number;
  elbowR: number;
  hipL: number; // leg angles: 0 = straight down, + = forward
  kneeL: number; // knee bend: + = heel kicks back
  hipR: number;
  kneeR: number;
  grip: number; // weapon angle relative to the forearm
}

export const BASE_POSE: Pose = {
  rootY: 0.96,
  lean: 0.06,
  torso: 0.04,
  head: -0.05,
  shoulderL: 0.35,
  elbowL: 0.55,
  shoulderR: -0.3,
  elbowR: 0.5,
  hipL: 0.14,
  kneeL: 0.1,
  hipR: -0.16,
  kneeR: 0.18,
  grip: 0.5,
};

/** Build a full pose from partial overrides of the fighting stance. */
export function P(o: Partial<Pose>): Pose {
  return { ...BASE_POSE, ...o };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Smoothstep easing clamped to [0,1]. */
export function ease(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

export function easeOut(t: number): number {
  const c = clamp(t, 0, 1);
  return 1 - (1 - c) * (1 - c);
}

const POSE_KEYS: (keyof Pose)[] = [
  'rootY',
  'lean',
  'torso',
  'head',
  'shoulderL',
  'elbowL',
  'shoulderR',
  'elbowR',
  'hipL',
  'kneeL',
  'hipR',
  'kneeR',
  'grip',
];

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = { ...a };
  for (const k of POSE_KEYS) out[k] = lerp(a[k], b[k], t);
  return out;
}

export interface Keyframe {
  t: number; // normalized time 0..1
  p: Pose;
}

/** Sample a keyframe track with smoothstep interpolation between frames. */
export function sampleKeyframes(frames: Keyframe[], t: number): Pose {
  if (frames.length === 0) return BASE_POSE;
  if (t <= frames[0].t) return frames[0].p;
  const last = frames[frames.length - 1];
  if (t >= last.t) return last.p;
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      return lerpPose(a.p, b.p, ease((t - a.t) / span));
    }
  }
  return last.p;
}

export interface Joints {
  hips: Vec2;
  chest: Vec2;
  headC: Vec2; // head center
  shoulderL: Vec2;
  elbowL: Vec2;
  handL: Vec2;
  shoulderR: Vec2;
  elbowR: Vec2;
  handR: Vec2;
  kneeL: Vec2;
  footL: Vec2;
  kneeR: Vec2;
  footR: Vec2;
  torsoAngle: number; // world angle of the spine (0 = up, + = forward)
  handAngleR: number; // world angle of the right forearm (0 = down, + = fwd)
  handAngleL: number;
  headAngle: number;
}

/** Step from a point along an angle measured from straight DOWN (+ = forward). */
function dn(from: Vec2, a: number, len: number): Vec2 {
  return { x: from.x + Math.sin(a) * len, y: from.y - Math.cos(a) * len };
}

/** Step from a point along an angle measured from straight UP (+ = forward). */
function up(from: Vec2, a: number, len: number): Vec2 {
  return { x: from.x + Math.sin(a) * len, y: from.y + Math.cos(a) * len };
}

/** Forward kinematics: resolve all joint positions in character-local space. */
export function computeJoints(p: Pose, pr: Proportions): Joints {
  const s = pr.scale;
  const legLen = (pr.thigh + pr.shin) * s;

  const hips: Vec2 = { x: p.lean * 10 * s, y: legLen * p.rootY };
  const torsoAngle = p.lean + p.torso;
  const chest = up(hips, torsoAngle, pr.torso * s);
  const headAngle = torsoAngle + p.head;
  const headC = up(chest, headAngle, (pr.headR + 5) * s);

  // Arms hang from the chest; angle accumulates torso rotation.
  const shL: Vec2 = { x: chest.x - Math.cos(torsoAngle) * 2 * s, y: chest.y };
  const shR: Vec2 = { x: chest.x + Math.cos(torsoAngle) * 2 * s, y: chest.y };
  const aL = torsoAngle + p.shoulderL;
  const elbowL = dn(shL, aL, pr.upperArm * s);
  const handAngleL = aL + p.elbowL;
  const handL = dn(elbowL, handAngleL, pr.foreArm * s);
  const aR = torsoAngle + p.shoulderR;
  const elbowR = dn(shR, aR, pr.upperArm * s);
  const handAngleR = aR + p.elbowR;
  const handR = dn(elbowR, handAngleR, pr.foreArm * s);

  // Legs hang from the hips.
  const kneeL = dn(hips, p.hipL, pr.thigh * s);
  const footL = dn(kneeL, p.hipL + p.kneeL, pr.shin * s);
  const kneeR = dn(hips, p.hipR, pr.thigh * s);
  const footR = dn(kneeR, p.hipR + p.kneeR, pr.shin * s);

  return {
    hips,
    chest,
    headC,
    shoulderL: shL,
    elbowL,
    handL,
    shoulderR: shR,
    elbowR,
    handR,
    kneeL,
    footL,
    kneeR,
    footR,
    torsoAngle,
    handAngleR,
    handAngleL,
    headAngle,
  };
}

/** Total standing height of a rig in px (for hurtboxes & HUD layout). */
export function rigHeight(pr: Proportions): number {
  return (pr.thigh + pr.shin + pr.torso + pr.headR * 2 + 6) * pr.scale;
}
