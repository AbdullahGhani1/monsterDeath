// ─── Rig renderer ───────────────────────────────────────────────────────────
//
// Draws a fully rigged character from a Pose + RigStyle using Canvas2D.
// Limbs are tapered capsule strokes, the torso is a shaped polygon, heads and
// weapons are parametric per archetype. Far-side limbs render darker for
// depth. Everything is procedural — no image assets.

import { RigStyle, WeaponType } from '../data/types';
import { computeJoints, Joints, Pose } from './skeleton';

export interface RenderOpts {
  x: number; // screen x of the ground origin (between the feet)
  y: number; // screen y of the ground origin
  facing: 1 | -1;
  scale: number; // camera zoom * depth scale
  style: RigStyle;
  pose: Pose;
  t: number; // global time (seconds) for aura/idle effects
  flash?: number; // 0..1 white hit flash
  heat?: boolean; // heat mode aura
  rage?: boolean; // rage aura
  alpha?: number;
  trail?: number; // 0..1 weapon swing trail intensity
  ghost?: boolean; // afterimage (teleport dash)
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

function limb(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  w: number,
  color: string
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

export function drawShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  alpha: number
): void {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${0.35 * alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWeapon(
  ctx: CanvasRenderingContext2D,
  type: WeaponType,
  hx: number,
  hy: number,
  angle: number, // world angle of the blade, 0 = down, + = forward (pre-flip)
  s: number,
  style: RigStyle,
  trail: number
): void {
  const dirX = Math.sin(angle);
  const dirY = -Math.cos(angle);
  const pal = style.palette;

  const tip = (len: number) => ({ x: hx + dirX * len * s, y: hy + dirY * len * s });

  if (trail > 0.05 && type !== 'none' && type !== 'claws') {
    const len = type === 'daggers' ? 26 : type === 'greatsword' ? 60 : 44;
    const e = tip(len);
    ctx.save();
    ctx.globalAlpha *= trail * 0.5;
    ctx.strokeStyle = pal.glow;
    ctx.lineWidth = 7 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
    ctx.restore();
  }

  switch (type) {
    case 'sword':
    case 'greatsword': {
      const len = type === 'greatsword' ? 58 : 42;
      const wid = (type === 'greatsword' ? 6 : 4) * s;
      const e = tip(len);
      const g = tip(-8);
      limb(ctx, g.x, g.y, e.x, e.y, wid, pal.weapon);
      limb(ctx, hx + dirX * 6 * s, hy + dirY * 6 * s, e.x, e.y, wid * 0.45, pal.weaponEdge);
      // crossguard
      limb(
        ctx,
        hx - dirY * 7 * s,
        hy + dirX * 7 * s,
        hx + dirY * 7 * s,
        hy - dirX * 7 * s,
        3.5 * s,
        pal.accent
      );
      break;
    }
    case 'daggers': {
      const e = tip(24);
      const g = tip(-6);
      limb(ctx, g.x, g.y, e.x, e.y, 3.5 * s, pal.weapon);
      limb(ctx, hx, hy, e.x, e.y, 1.8 * s, pal.weaponEdge);
      break;
    }
    case 'hammer': {
      const e = tip(46);
      limb(ctx, tip(-10).x, tip(-10).y, e.x, e.y, 4.5 * s, pal.accent);
      ctx.fillStyle = pal.weapon;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.atan2(dirY, dirX));
      ctx.fillRect(-10 * s, -9 * s, 20 * s, 18 * s);
      ctx.fillStyle = pal.weaponEdge;
      ctx.fillRect(8 * s, -9 * s, 4 * s, 18 * s);
      ctx.restore();
      break;
    }
    case 'scythe': {
      const e = tip(50);
      limb(ctx, tip(-14).x, tip(-14).y, e.x, e.y, 3.5 * s, pal.accent);
      // curved blade off the tip
      ctx.strokeStyle = pal.weaponEdge;
      ctx.lineWidth = 4 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const bladeA = Math.atan2(dirY, dirX);
      ctx.arc(e.x - dirY * 12 * s, e.y + dirX * 12 * s, 18 * s, bladeA - 1.9, bladeA - 0.1);
      ctx.stroke();
      break;
    }
    case 'spear': {
      const e = tip(56);
      limb(ctx, tip(-22).x, tip(-22).y, e.x, e.y, 3 * s, pal.weapon);
      // leaf point
      ctx.fillStyle = pal.weaponEdge;
      ctx.beginPath();
      ctx.moveTo(e.x + dirX * 12 * s, e.y + dirY * 12 * s);
      ctx.lineTo(e.x - dirY * 4 * s, e.y + dirX * 4 * s);
      ctx.lineTo(e.x + dirY * 4 * s, e.y - dirX * 4 * s);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'staff': {
      const e = tip(46);
      limb(ctx, tip(-20).x, tip(-20).y, e.x, e.y, 3 * s, pal.weapon);
      ctx.fillStyle = pal.glow;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'claws': {
      for (let i = -1; i <= 1; i++) {
        const off = i * 4 * s;
        const e = tip(16);
        limb(
          ctx,
          hx - dirY * off,
          hy + dirX * off,
          e.x - dirY * off,
          e.y + dirX * off,
          2 * s,
          pal.weaponEdge
        );
      }
      break;
    }
    case 'none':
      break;
  }
}

function drawHead(ctx: CanvasRenderingContext2D, j: Joints, style: RigStyle, hr: number): void {
  const pal = style.palette;
  const { x, y } = j.headC;
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.arc(x, y, hr, 0, Math.PI * 2);
  ctx.fill();

  switch (style.head) {
    case 'helm':
      ctx.fillStyle = pal.primary;
      ctx.beginPath();
      ctx.arc(x, y, hr * 1.08, Math.PI * 0.85, Math.PI * 2.25);
      ctx.fill();
      ctx.fillStyle = pal.accent;
      ctx.fillRect(x - hr * 0.2, y - hr * 1.4, hr * 0.4, hr * 0.9); // crest
      ctx.fillStyle = pal.glow;
      ctx.fillRect(x + hr * 0.15, y - hr * 0.25, hr * 0.7, hr * 0.28); // visor slit
      break;
    case 'hood':
      ctx.fillStyle = pal.primary;
      ctx.beginPath();
      ctx.moveTo(x - hr * 1.25, y + hr * 0.7);
      ctx.quadraticCurveTo(x - hr * 1.3, y - hr * 1.6, x + hr * 0.4, y - hr * 1.25);
      ctx.quadraticCurveTo(x + hr * 1.2, y - hr * 0.8, x + hr * 1.0, y + hr * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = pal.glow;
      ctx.beginPath();
      ctx.arc(x + hr * 0.4, y - hr * 0.05, hr * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'hair':
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.arc(x - hr * 0.15, y - hr * 0.3, hr * 0.95, Math.PI * 0.75, Math.PI * 2.1);
      ctx.fill();
      ctx.beginPath(); // ponytail
      ctx.moveTo(x - hr * 0.9, y - hr * 0.4);
      ctx.quadraticCurveTo(x - hr * 2.4, y + hr * 0.4, x - hr * 1.7, y + hr * 1.8);
      ctx.quadraticCurveTo(x - hr * 1.2, y + hr * 0.6, x - hr * 0.7, y + hr * 0.35);
      ctx.closePath();
      ctx.fill();
      break;
    case 'horns':
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = hr * 0.35;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + side * hr * 0.6, y - hr * 0.6);
        ctx.quadraticCurveTo(x + side * hr * 1.6, y - hr * 1.4, x + side * hr * 1.3, y - hr * 2.2);
        ctx.stroke();
      }
      ctx.fillStyle = pal.glow;
      ctx.beginPath();
      ctx.arc(x + hr * 0.35, y - hr * 0.1, hr * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'skull':
      ctx.fillStyle = '#ddd5c4';
      ctx.beginPath();
      ctx.arc(x, y - hr * 0.1, hr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1208';
      ctx.beginPath();
      ctx.arc(x + hr * 0.38, y - hr * 0.15, hr * 0.26, 0, Math.PI * 2);
      ctx.arc(x - hr * 0.25, y - hr * 0.15, hr * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.glow;
      ctx.beginPath();
      ctx.arc(x + hr * 0.38, y - hr * 0.15, hr * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ddd5c4';
      ctx.fillRect(x - hr * 0.45, y + hr * 0.45, hr * 0.95, hr * 0.35); // jaw
      break;
    case 'crown':
      ctx.fillStyle = pal.primary;
      ctx.beginPath();
      ctx.arc(x, y, hr * 1.05, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();
      ctx.fillStyle = pal.accent;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * hr * 0.45 - hr * 0.18, y - hr * 0.85);
        ctx.lineTo(x + i * hr * 0.45, y - hr * 1.8 - Math.abs(i) * -hr * 0.15);
        ctx.lineTo(x + i * hr * 0.45 + hr * 0.18, y - hr * 0.85);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = pal.glow;
      ctx.fillRect(x - hr * 0.1, y - hr * 0.2, hr * 0.85, hr * 0.22);
      break;
    case 'beast':
      // snout + ears
      ctx.fillStyle = pal.skin;
      ctx.beginPath();
      ctx.moveTo(x + hr * 0.5, y - hr * 0.2);
      ctx.lineTo(x + hr * 1.7, y + hr * 0.25);
      ctx.lineTo(x + hr * 0.5, y + hr * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - hr * 0.5, y - hr * 0.7);
      ctx.lineTo(x - hr * 0.85, y - hr * 1.9);
      ctx.lineTo(x - hr * 0.05, y - hr * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = pal.glow;
      ctx.beginPath();
      ctx.arc(x + hr * 0.25, y - hr * 0.2, hr * 0.17, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'wisp':
      ctx.fillStyle = pal.glow;
      ctx.beginPath();
      ctx.arc(x + hr * 0.3, y - hr * 0.1, hr * 0.2, 0, Math.PI * 2);
      ctx.arc(x - hr * 0.2, y - hr * 0.1, hr * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

export function drawFighter(ctx: CanvasRenderingContext2D, o: RenderOpts): void {
  const pr = o.style.proportions;
  const pal = o.style.palette;
  const j = computeJoints(o.pose, pr);

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(o.facing * o.scale, o.scale);
  ctx.globalAlpha = o.alpha ?? 1;

  // Aura (heat / rage)
  if ((o.heat || o.rage) && !o.ghost) {
    const auraC = o.rage ? '#ff2d4d' : pal.glow;
    const pulse = 0.5 + Math.sin(o.t * 10) * 0.18;
    const grd = ctx.createRadialGradient(
      j.chest.x * pr.scale,
      -j.chest.y * pr.scale,
      4,
      j.chest.x * pr.scale,
      -j.chest.y * pr.scale,
      70 * pr.scale
    );
    grd.addColorStop(0, auraC + 'aa');
    grd.addColorStop(1, auraC + '00');
    ctx.save();
    ctx.globalAlpha *= pulse;
    ctx.fillStyle = grd;
    ctx.fillRect(-80 * pr.scale, -150 * pr.scale, 160 * pr.scale, 170 * pr.scale);
    ctx.restore();
  }

  // Joint coords are in character-local space (+y up); flip to canvas space.
  const X = (p: { x: number; y: number }) => ({ x: p.x * pr.scale, y: -p.y * pr.scale });
  const hips = X(j.hips);
  const chest = X(j.chest);
  const bulk = pr.bulk * pr.scale;

  if (o.ghost) {
    ctx.globalAlpha *= 0.35;
    ctx.filter = 'blur(1px)';
  } else if (o.flash && o.flash > 0.05) {
    ctx.filter = `brightness(${1 + o.flash * 3}) saturate(${1 - o.flash * 0.7})`;
  }

  const farTone = 0.55;

  // Cape (behind everything)
  if (o.style.cape) {
    const sway = Math.sin(o.t * 3) * 5;
    ctx.fillStyle = shade(pal.accent, 0.55);
    ctx.beginPath();
    ctx.moveTo(chest.x - 4 * pr.scale, chest.y);
    ctx.quadraticCurveTo(
      chest.x - (26 + sway) * pr.scale,
      (chest.y + hips.y) / 2,
      chest.x - (20 + sway) * pr.scale,
      hips.y + 26 * pr.scale
    );
    ctx.lineTo(hips.x - 2 * pr.scale, hips.y + 6 * pr.scale);
    ctx.closePath();
    ctx.fill();
  }

  // Far leg + far arm
  if (!o.style.robe) {
    const kL = X(j.kneeL);
    const fL = X(j.footL);
    limb(ctx, hips.x, hips.y, kL.x, kL.y, bulk, shade(pal.secondary, farTone));
    limb(ctx, kL.x, kL.y, fL.x, fL.y, bulk * 0.85, shade(pal.secondary, farTone * 0.9));
  }
  {
    const eL = X(j.elbowL);
    const hL = X(j.handL);
    const shL = X(j.shoulderL);
    limb(ctx, shL.x, shL.y, eL.x, eL.y, bulk * 0.9, shade(pal.primary, farTone));
    limb(ctx, eL.x, eL.y, hL.x, hL.y, bulk * 0.75, shade(pal.skin, farTone));
    if (o.style.weapon === 'daggers' || o.style.weapon === 'claws') {
      drawWeapon(
        ctx,
        o.style.weapon,
        hL.x,
        hL.y,
        j.handAngleL,
        pr.scale * 0.9,
        o.style,
        o.trail ?? 0
      );
    }
  }

  // Robe (casters) — covers where legs would be
  if (o.style.robe) {
    const sway = Math.sin(o.t * 2.2) * 4;
    ctx.fillStyle = shade(pal.secondary, 0.8);
    ctx.beginPath();
    ctx.moveTo(chest.x - pr.shoulderW * 0.55 * pr.scale, chest.y + 4 * pr.scale);
    ctx.lineTo(hips.x - (16 + sway) * pr.scale, 4);
    ctx.lineTo(hips.x + (16 - sway) * pr.scale, 4);
    ctx.lineTo(chest.x + pr.shoulderW * 0.55 * pr.scale, chest.y + 4 * pr.scale);
    ctx.closePath();
    ctx.fill();
  } else {
    // Near leg
    const kR = X(j.kneeR);
    const fR = X(j.footR);
    limb(ctx, hips.x, hips.y, kR.x, kR.y, bulk, pal.secondary);
    limb(ctx, kR.x, kR.y, fR.x, fR.y, bulk * 0.85, shade(pal.secondary, 0.85));
    // boots
    limb(ctx, fR.x, fR.y, fR.x + 6 * pr.scale, fR.y, bulk * 0.8, pal.accent);
  }

  // Torso
  const sw = pr.shoulderW * pr.scale;
  const perp = { x: Math.cos(j.torsoAngle), y: Math.sin(j.torsoAngle) };
  ctx.fillStyle = pal.primary;
  ctx.beginPath();
  ctx.moveTo(chest.x - perp.x * sw * 0.6, chest.y - perp.y * sw * 0.6);
  ctx.lineTo(chest.x + perp.x * sw * 0.6, chest.y + perp.y * sw * 0.6);
  ctx.lineTo(hips.x + perp.x * sw * 0.38, hips.y + perp.y * sw * 0.38);
  ctx.lineTo(hips.x - perp.x * sw * 0.38, hips.y - perp.y * sw * 0.38);
  ctx.closePath();
  ctx.fill();
  // chest plate highlight + belt
  ctx.fillStyle = shade(pal.primary, 1.25);
  ctx.beginPath();
  ctx.moveTo(chest.x - perp.x * sw * 0.45, chest.y - perp.y * sw * 0.45);
  ctx.lineTo(chest.x + perp.x * sw * 0.55, chest.y + perp.y * sw * 0.55);
  ctx.lineTo(
    (chest.x + hips.x) / 2 + perp.x * sw * 0.3,
    (chest.y + hips.y) / 2 + perp.y * sw * 0.3
  );
  ctx.lineTo(
    (chest.x + hips.x) / 2 - perp.x * sw * 0.3,
    (chest.y + hips.y) / 2 - perp.y * sw * 0.3
  );
  ctx.closePath();
  ctx.fill();
  limb(
    ctx,
    hips.x - perp.x * sw * 0.4,
    hips.y - perp.y * sw * 0.4,
    hips.x + perp.x * sw * 0.4,
    hips.y + perp.y * sw * 0.4,
    4 * pr.scale,
    pal.accent
  );

  ctx.restore();

  // Head + near arm drawn in a fresh transform so head helper can use canvas space.
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(o.facing * o.scale, o.scale);
  ctx.globalAlpha = o.alpha ?? 1;
  if (o.ghost) {
    ctx.globalAlpha *= 0.35;
  } else if (o.flash && o.flash > 0.05) {
    ctx.filter = `brightness(${1 + o.flash * 3}) saturate(${1 - o.flash * 0.7})`;
  }

  const headCanvas = { x: j.headC.x * pr.scale, y: -j.headC.y * pr.scale };
  drawHead(ctx, { ...j, headC: headCanvas }, o.style, pr.headR * pr.scale);

  // Near arm + weapon
  {
    const X2 = (p: { x: number; y: number }) => ({ x: p.x * pr.scale, y: -p.y * pr.scale });
    const shR = X2(j.shoulderR);
    const eR = X2(j.elbowR);
    const hR = X2(j.handR);
    // pauldron
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(shR.x, shR.y, bulk * 0.75, 0, Math.PI * 2);
    ctx.fill();
    limb(ctx, shR.x, shR.y, eR.x, eR.y, bulk * 0.95, pal.primary);
    limb(ctx, eR.x, eR.y, hR.x, hR.y, bulk * 0.8, pal.skin);
    if (o.style.weapon !== 'none') {
      drawWeapon(
        ctx,
        o.style.weapon,
        hR.x,
        hR.y,
        j.handAngleR + o.pose.grip,
        pr.scale,
        o.style,
        o.trail ?? 0
      );
    }
  }

  ctx.filter = 'none';
  ctx.restore();
}
