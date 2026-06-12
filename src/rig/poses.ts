// ─── Animation library ──────────────────────────────────────────────────────
//
// Locomotion (idle/walk/run/...) is generated procedurally from a phase value
// so it adapts to any speed. Attacks are authored as keyframe tracks that the
// fighter state machine samples by move phase (startup → active → recovery).

import { AttackAnimId } from '../data/types';
import { BASE_POSE, ease, easeOut, Keyframe, lerpPose, P, Pose, sampleKeyframes } from './skeleton';

const TAU = Math.PI * 2;

// ─── Locomotion ─────────────────────────────────────────────────────────────

export function idlePose(t: number): Pose {
  const b = Math.sin(t * 2.2) * 0.5 + 0.5; // slow breathing
  return P({
    rootY: 0.955 + b * 0.012,
    torso: 0.04 + b * 0.02,
    shoulderL: 0.35 + b * 0.03,
    shoulderR: -0.3 - b * 0.03,
    head: -0.05 + Math.sin(t * 0.7) * 0.03,
  });
}

export function walkPose(phase: number, intensity: number): Pose {
  const s = Math.sin(phase * TAU);
  const c = Math.sin(phase * TAU + Math.PI);
  const lift = Math.abs(Math.sin(phase * TAU)) * 0.05;
  return P({
    rootY: 0.94 + lift * intensity,
    lean: 0.1 * intensity,
    hipL: s * 0.55 * intensity,
    kneeL: Math.max(0, -s) * 0.9 * intensity + 0.08,
    hipR: c * 0.55 * intensity,
    kneeR: Math.max(0, -c) * 0.9 * intensity + 0.08,
    shoulderL: c * 0.45 * intensity + 0.15,
    elbowL: 0.45,
    shoulderR: s * 0.45 * intensity - 0.15,
    elbowR: 0.45,
  });
}

export function runPose(phase: number): Pose {
  const s = Math.sin(phase * TAU);
  const c = Math.sin(phase * TAU + Math.PI);
  return P({
    rootY: 0.88 + Math.abs(s) * 0.07,
    lean: 0.32,
    torso: 0.1,
    hipL: s * 0.95,
    kneeL: Math.max(0, -s) * 1.5 + 0.2,
    hipR: c * 0.95,
    kneeR: Math.max(0, -c) * 1.5 + 0.2,
    shoulderL: c * 0.8,
    elbowL: 0.9,
    shoulderR: s * 0.8,
    elbowR: 0.9,
  });
}

export function dashPose(t: number): Pose {
  return lerpPose(
    P({
      rootY: 0.8,
      lean: 0.55,
      hipL: 1.0,
      kneeL: 0.4,
      hipR: -0.9,
      kneeR: 1.3,
      shoulderL: -0.7,
      shoulderR: 0.9,
      elbowR: 0.8,
    }),
    P({ rootY: 0.92, lean: 0.2, hipL: 0.3, kneeL: 0.2, hipR: -0.3, kneeR: 0.4 }),
    ease(t)
  );
}

export function backdashPose(t: number): Pose {
  return lerpPose(
    P({
      rootY: 0.85,
      lean: -0.35,
      hipL: -0.7,
      kneeL: 0.9,
      hipR: 0.5,
      kneeR: 0.2,
      shoulderL: 0.6,
      shoulderR: -0.6,
    }),
    BASE_POSE,
    ease(t)
  );
}

export const blockPose: Pose = P({
  rootY: 0.9,
  lean: -0.08,
  torso: 0.12,
  shoulderL: 1.25,
  elbowL: 1.9,
  shoulderR: 1.05,
  elbowR: 2.1,
  hipL: 0.25,
  kneeL: 0.15,
  hipR: -0.3,
  kneeR: 0.3,
  head: 0.1,
});

export function hitstunPose(t: number): Pose {
  return lerpPose(
    P({
      rootY: 0.9,
      lean: -0.3,
      torso: -0.18,
      head: -0.3,
      shoulderL: -0.5,
      shoulderR: 0.7,
      elbowR: 0.9,
      hipL: -0.2,
      hipR: 0.25,
    }),
    BASE_POSE,
    ease(t)
  );
}

export function launchedPose(t: number): Pose {
  // Flailing while airborne, slowly rotating back.
  const w = Math.sin(t * 9);
  return P({
    rootY: 0.7,
    lean: -0.9 + w * 0.1,
    torso: -0.3,
    head: -0.4,
    shoulderL: -1.6 + w * 0.3,
    elbowL: 0.6,
    shoulderR: -1.2 - w * 0.3,
    elbowR: 0.5,
    hipL: 0.9 + w * 0.2,
    kneeL: 1.1,
    hipR: 0.4 - w * 0.2,
    kneeR: 1.4,
  });
}

export const downPose: Pose = P({
  rootY: 0.16,
  lean: -1.45,
  torso: 0.1,
  head: 0.3,
  shoulderL: -2.6,
  elbowL: 0.3,
  shoulderR: -2.2,
  elbowR: 0.4,
  hipL: 1.25,
  kneeL: 0.5,
  hipR: 1.05,
  kneeR: 0.8,
});

export function getupPose(t: number): Pose {
  return lerpPose(downPose, BASE_POSE, ease(t));
}

export function koPose(t: number): Pose {
  return lerpPose(
    P({
      rootY: 0.75,
      lean: -0.7,
      torso: -0.3,
      head: -0.5,
      shoulderL: -1.2,
      shoulderR: -1.0,
      hipL: 0.5,
      kneeL: 0.9,
      hipR: 0.2,
      kneeR: 1.1,
    }),
    downPose,
    ease(t)
  );
}

export function victoryPose(t: number): Pose {
  const raise = ease(Math.min(1, t * 1.5));
  const b = Math.sin(t * 3) * 0.04;
  return P({
    rootY: 0.97 + b,
    lean: -0.05,
    torso: -0.08,
    head: -0.15,
    shoulderR: -0.3 - raise * 2.75,
    elbowR: -0.2 * raise + 0.5 * (1 - raise),
    shoulderL: 0.4,
    elbowL: 0.5,
    grip: 0.2,
  });
}

export function castIdlePose(t: number): Pose {
  // Floating casters: arms spread, robe hides legs.
  const b = Math.sin(t * 2.5) * 0.06;
  return P({
    rootY: 1.0,
    lean: 0.02,
    shoulderL: 0.9 + b,
    elbowL: 0.8,
    shoulderR: -0.9 - b,
    elbowR: 0.7,
    head: -0.1,
  });
}

// ─── Attack keyframes ───────────────────────────────────────────────────────
// Track layout: 0 → windup, ~0.35–0.55 → strike (active frames), → recovery.

const tracks: Record<AttackAnimId, Keyframe[]> = {
  jab: [
    { t: 0, p: BASE_POSE },
    { t: 0.3, p: P({ lean: 0.12, shoulderR: -0.7, elbowR: 1.6 }) },
    {
      t: 0.5,
      p: P({ lean: 0.3, torso: 0.18, shoulderR: 1.5, elbowR: 0.05, hipR: -0.35, kneeR: 0.35 }),
    },
    { t: 1, p: BASE_POSE },
  ],
  cross: [
    { t: 0, p: BASE_POSE },
    { t: 0.3, p: P({ lean: 0.05, shoulderL: -0.9, elbowL: 1.7 }) },
    {
      t: 0.52,
      p: P({
        lean: 0.35,
        torso: 0.22,
        shoulderL: 1.6,
        elbowL: 0.05,
        hipL: 0.45,
        hipR: -0.45,
        kneeR: 0.4,
      }),
    },
    { t: 1, p: BASE_POSE },
  ],
  slash: [
    { t: 0, p: BASE_POSE },
    {
      t: 0.32,
      p: P({ rootY: 0.93, lean: -0.1, shoulderR: -2.7, elbowR: 0.6, grip: 0.9, shoulderL: 0.8 }),
    },
    {
      t: 0.55,
      p: P({
        rootY: 0.9,
        lean: 0.4,
        torso: 0.2,
        shoulderR: 1.35,
        elbowR: 0.15,
        grip: -0.25,
        shoulderL: -0.5,
        hipR: -0.5,
        kneeR: 0.45,
      }),
    },
    { t: 1, p: BASE_POSE },
  ],
  overhead: [
    { t: 0, p: BASE_POSE },
    {
      t: 0.35,
      p: P({ rootY: 1.0, lean: -0.22, shoulderR: -3.0, elbowR: 0.35, grip: 0.7, shoulderL: -1.4 }),
    },
    {
      t: 0.58,
      p: P({
        rootY: 0.82,
        lean: 0.55,
        torso: 0.25,
        head: 0.2,
        shoulderR: 0.75,
        elbowR: 0.25,
        grip: 0.95,
        shoulderL: 0.3,
        hipL: 0.65,
        kneeR: 0.6,
      }),
    },
    { t: 1, p: BASE_POSE },
  ],
  thrust: [
    { t: 0, p: BASE_POSE },
    { t: 0.3, p: P({ lean: -0.08, shoulderR: -1.0, elbowR: 1.5, grip: 1.3 }) },
    {
      t: 0.5,
      p: P({
        lean: 0.42,
        torso: 0.2,
        shoulderR: 1.45,
        elbowR: 0.05,
        grip: -0.5,
        hipL: 0.8,
        kneeL: 0.2,
        hipR: -0.7,
        kneeR: 0.9,
      }),
    },
    { t: 1, p: BASE_POSE },
  ],
  uppercut: [
    { t: 0, p: BASE_POSE },
    {
      t: 0.32,
      p: P({
        rootY: 0.72,
        lean: 0.25,
        torso: 0.2,
        shoulderR: -0.9,
        elbowR: 1.1,
        grip: 0.8,
        hipL: 0.5,
        kneeL: 0.7,
        hipR: -0.4,
        kneeR: 0.8,
      }),
    },
    {
      t: 0.55,
      p: P({
        rootY: 1.05,
        lean: -0.18,
        torso: -0.12,
        shoulderR: 2.7,
        elbowR: 0.1,
        grip: -0.3,
        shoulderL: -0.6,
        hipL: 0.25,
        hipR: -0.2,
        kneeR: 0.2,
      }),
    },
    { t: 1, p: BASE_POSE },
  ],
  spin: [
    { t: 0, p: BASE_POSE },
    {
      t: 0.28,
      p: P({
        rootY: 0.9,
        lean: -0.15,
        shoulderR: -2.4,
        elbowR: 0.3,
        grip: 1.4,
        shoulderL: 1.2,
        elbowL: 0.3,
      }),
    },
    {
      t: 0.5,
      p: P({
        rootY: 0.93,
        lean: 0.3,
        shoulderR: 1.55,
        elbowR: 0.05,
        grip: -0.35,
        shoulderL: -1.5,
        elbowL: 0.2,
        hipR: -0.5,
        kneeR: 0.4,
      }),
    },
    {
      t: 0.72,
      p: P({ rootY: 0.9, lean: 0.15, shoulderR: 2.2, elbowR: 0.2, grip: -0.6, shoulderL: -0.8 }),
    },
    { t: 1, p: BASE_POSE },
  ],
  kick: [
    { t: 0, p: BASE_POSE },
    {
      t: 0.3,
      p: P({ rootY: 0.92, lean: -0.18, hipR: -0.6, kneeR: 1.5, shoulderL: 0.7, shoulderR: -0.7 }),
    },
    {
      t: 0.52,
      p: P({
        rootY: 0.95,
        lean: -0.32,
        torso: -0.1,
        hipR: 1.85,
        kneeR: 0.1,
        hipL: 0.15,
        shoulderL: -0.8,
        shoulderR: 0.8,
      }),
    },
    { t: 1, p: BASE_POSE },
  ],
  smash: [
    { t: 0, p: BASE_POSE },
    {
      t: 0.38,
      p: P({
        rootY: 1.02,
        lean: -0.3,
        shoulderR: -3.1,
        elbowR: 0.2,
        shoulderL: -2.9,
        elbowL: 0.3,
        grip: 0.6,
      }),
    },
    {
      t: 0.6,
      p: P({
        rootY: 0.78,
        lean: 0.6,
        torso: 0.3,
        head: 0.25,
        shoulderR: 0.7,
        elbowR: 0.3,
        shoulderL: 0.75,
        elbowL: 0.3,
        grip: 1.0,
        hipL: 0.7,
        kneeR: 0.7,
      }),
    },
    { t: 1, p: BASE_POSE },
  ],
  cast: [
    { t: 0, p: BASE_POSE },
    {
      t: 0.35,
      p: P({
        rootY: 0.92,
        lean: -0.15,
        shoulderR: -1.8,
        elbowR: 1.2,
        shoulderL: -1.4,
        elbowL: 1.0,
        grip: 0.2,
      }),
    },
    {
      t: 0.55,
      p: P({
        rootY: 0.95,
        lean: 0.25,
        torso: 0.15,
        shoulderR: 1.5,
        elbowR: 0.1,
        shoulderL: 1.35,
        elbowL: 0.15,
        grip: -0.4,
        hipR: -0.4,
        kneeR: 0.35,
      }),
    },
    { t: 1, p: BASE_POSE },
  ],
  lunge: [
    { t: 0, p: BASE_POSE },
    {
      t: 0.3,
      p: P({
        rootY: 0.85,
        lean: -0.15,
        shoulderR: -1.3,
        elbowR: 1.3,
        grip: 1.4,
        hipL: -0.3,
        kneeL: 0.6,
      }),
    },
    {
      t: 0.52,
      p: P({
        rootY: 0.72,
        lean: 0.6,
        torso: 0.25,
        shoulderR: 1.5,
        elbowR: 0.0,
        grip: -0.8,
        hipL: 1.05,
        kneeL: 0.15,
        hipR: -0.85,
        kneeR: 1.2,
        shoulderL: -1.0,
      }),
    },
    { t: 1, p: BASE_POSE },
  ],
  claw: [
    { t: 0, p: BASE_POSE },
    { t: 0.3, p: P({ lean: 0.1, shoulderR: -1.9, elbowR: 0.9, shoulderL: 0.5 }) },
    {
      t: 0.5,
      p: P({
        lean: 0.45,
        torso: 0.25,
        head: 0.2,
        shoulderR: 1.2,
        elbowR: 0.5,
        shoulderL: -0.6,
        hipR: -0.5,
        kneeR: 0.5,
      }),
    },
    { t: 0.7, p: P({ lean: 0.35, shoulderL: 1.3, elbowL: 0.4, shoulderR: 0.3 }) },
    { t: 1, p: BASE_POSE },
  ],
};

export function attackPose(anim: AttackAnimId, phase: number): Pose {
  return sampleKeyframes(tracks[anim], phase);
}

/** Rough swing arc progress (0..1) during a move, used for weapon trails. */
export function swingProgress(phase: number): number {
  return easeOut((phase - 0.3) / 0.35);
}
